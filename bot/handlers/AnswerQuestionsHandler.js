const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');
const { Timestamp } = require('firebase-admin/firestore');

let initialized = false;

class AnswerQuestionsHandler {
    constructor(bot) {
        if (initialized) return;
        initialized = true;

        this.bot = bot;
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
        this.bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const userId = query.from.id;
        const data = query.data;

        const session = await getSession(userId);
        await this.safeAnswerCallback(query.id);

        switch (true) {
            case data === 'answer_questions':
                return this.showNextQuestion(chatId, session, 0);

            case data === 'question_next':
                return this.showNextQuestion(chatId, session, (session.currentQuestionIndex || 0) + 1);

            case data === 'question_prev':
                return this.showNextQuestion(chatId, session, (session.currentQuestionIndex || 0) - 1);

            case data.startsWith('reply_question_'):
                const [_, __, docId, toUserId] = data.split('_');
                session.answeringQuestionId = docId;
                session.answerToUserId = toUserId;
                session.step = 'awaiting_admin_answer';
                return this.bot.sendMessage(chatId, '✍️ Введите ответ на вопрос:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_questions' }]
                        ]
                    }
                });

            case data === 'back_to_main_from_questions':
                this.clearSession(session);
                await this.safeDeleteMessage(chatId, messageId);
                return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        const session = await getSession(userId);

        if (session.step !== 'awaiting_admin_answer') return;

        const { answerToUserId, answeringQuestionId } = session;
        if (!answerToUserId || !answeringQuestionId) return;

        // 1. Пытаемся отправить ответ пользователю
        try {
            await this.bot.sendMessage(answerToUserId, `📬 Ответ специалиста:\n\n${text}`);
        } catch (error) {
            console.warn('⚠ Не удалось отправить сообщение пользователю:', error.message);
            await this.bot.sendMessage(chatId, '⚠ Не удалось отправить ответ. Возможно, пользователь заблокировал бота.');
        }

        // 2. Удаляем вопрос в любом случае
        try {
            await db.collection('questions').doc(answeringQuestionId).delete();
        } catch (error) {
            console.warn('⚠ Не удалось удалить вопрос из базы:', error.message);
            await this.bot.sendMessage(chatId, '⚠ Вопрос уже был удалён или недоступен.');
        }
        const prevIndex = session.currentQuestionIndex ?? 0;
        this.clearSession(session);

        const snapshot = await db.collection('questions').orderBy('timestamp', 'asc').get();
        const remaining = snapshot.docs;

        if (remaining.length === 0) {
            await this.bot.sendMessage(chatId, '✅ Обработка завершена. Вопросов больше нет.');
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }

        const nextIndex = prevIndex >= remaining.length ? remaining.length - 1 : prevIndex;
        return this.showNextQuestion(chatId, session, nextIndex);
    }


    async showNextQuestion(chatId, session, index = 0) {
        try {
            const snapshot = await db.collection('questions').orderBy('timestamp', 'asc').get();
            const questions = snapshot.docs;

            if (!questions.length) {
                return this.bot.sendMessage(chatId, '❌ Нет новых вопросов.');
            }

            if (index < 0 || index >= questions.length) {
                return this.bot.sendMessage(chatId, '📭 Вопросов больше нет.');
            }

            session.questionsCache = questions.map(doc => ({ id: doc.id, ...doc.data() }));
            session.currentQuestionIndex = index;

            await this.hidePreviousQuestionKeyboard(chatId, session);

            const doc = questions[index];
            const data = doc.data();
            const formattedDate = this.formatTimestamp(data.timestamp);

            const caption = `📝 *Вопрос от пользователя*\n\n*Текст:* ${data.question}\n🕒 ${formattedDate}`;
            const inline_keyboard = [];

            if (index > 0) inline_keyboard.push({ text: '⬅ Назад', callback_data: 'question_prev' });
            inline_keyboard.push({ text: '✍ Ответить', callback_data: `reply_question_${doc.id}_${data.userId}` });
            if (index < questions.length - 1) inline_keyboard.push({ text: '➡ Далее', callback_data: 'question_next' });

            const reply_markup = {
                inline_keyboard: [inline_keyboard, [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_questions' }]]
            };

            const sent = await this.bot.sendMessage(chatId, caption, {
                parse_mode: 'Markdown',
                reply_markup
            });

            session.lastQuestionMessageId = sent.message_id;
        } catch (error) {
            console.error('Ошибка при загрузке вопросов:', error);
            return this.bot.sendMessage(chatId, '❌ Не удалось загрузить вопросы.');
        }
    }

    async hidePreviousQuestionKeyboard(chatId, session) {
        if (!session.lastQuestionMessageId) return;

        try {
            await this.bot.editMessageReplyMarkup(
                { inline_keyboard: [] },
                { chat_id: chatId, message_id: session.lastQuestionMessageId }
            );
        } catch (err) {
            if (err?.response?.body?.description !== 'Bad Request: message is not modified') {
                console.warn('⚠ Не удалось скрыть клавиатуру предыдущего вопроса:', err.message);
            }
        }

        session.lastQuestionMessageId = null;
    }


    clearSession(session) {
        session.step = null;
        session.answerToUserId = null;
        session.answeringQuestionId = null;
        session.lastQuestionMessageId = null;
        session.questionsCache = null;
        session.currentQuestionIndex = null;
    }

    formatTimestamp(timestamp) {
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async safeAnswerCallback(callbackId) {
        try {
            await this.bot.answerCallbackQuery(callbackId);
        } catch (e) {
            console.warn('⚠ Ошибка при answerCallbackQuery:', e.message);
        }
    }

    async safeDeleteMessage(chatId, messageId) {
        try {
            await this.bot.deleteMessage(chatId, messageId);
        } catch (e) {
            console.warn('⚠ Не удалось удалить сообщение:', e.message);
        }
    }
}

module.exports = AnswerQuestionsHandler;