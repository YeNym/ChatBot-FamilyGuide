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
        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const userId = query.from.id;
        const data = query.data;

        const session = await getSession(userId);
        await this.bot.answerCallbackQuery(query.id);

        if (data === 'answer_questions') {
            return this.showNextQuestion(chatId, session, 0);
        }

        if (data.startsWith('next_question_')) {
            const index = parseInt(data.split('_')[2]);
            return this.showNextQuestion(chatId, session, index);
        }

        if (data.startsWith('reply_question_')) {
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
        }

        if (data === 'back_to_main_from_questions') {
            this.clearSession(session);
            await this.bot.deleteMessage(chatId, messageId);
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text?.trim();

        const session = await getSession(userId);

        if (session.step === 'awaiting_admin_answer' && session.answerToUserId && session.answeringQuestionId) {
            const toUserId = session.answerToUserId;
            const questionId = session.answeringQuestionId;

            try {
                await this.bot.sendMessage(toUserId, `📬 Ответ специалиста:\n\n${text}`);
                await db.collection('questions').doc(questionId).delete();

                this.clearSession(session);

                await this.bot.sendMessage(chatId, '✅ Ответ отправлен и вопрос удалён.');
                return sendMainMenu(this.bot, chatId, session.name, session.role);
            } catch (error) {
                console.error('Ошибка при ответе:', error);
                return this.bot.sendMessage(chatId, '❌ Не удалось отправить ответ.');
            }
        }
    }

    async showNextQuestion(chatId, session, index = 0) {
        try {
            const snapshot = await db.collection('questions')
                .orderBy('timestamp', 'asc')
                .get();

            const questions = snapshot.docs;

            if (questions.length === 0) {
                return this.bot.sendMessage(chatId, '❌ Нет новых вопросов.');
            }

            if (index >= questions.length) {
                return this.bot.sendMessage(chatId, '📭 Больше нет вопросов.');
            }

            const doc = questions[index];
            const data = doc.data();

            const formattedDate = this.formatTimestamp(data.timestamp);

            const caption = `📝 *Вопрос от пользователя*\n\n*Текст:* ${data.question}\n🕒 ${formattedDate}`;

            const inline_keyboard = [
                [
                    { text: '✍️ Ответить', callback_data: `reply_question_${doc.id}_${data.userId}` }
                ]
            ];

            if (index < questions.length - 1) {
                inline_keyboard.push([
                    { text: '➡️ Далее', callback_data: `next_question_${index + 1}` }
                ]);
            }

            inline_keyboard.push([
                { text: '🔙 Назад в меню', callback_data: 'back_to_main_from_questions' }
            ]);

            return this.bot.sendMessage(chatId, caption, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            });
        } catch (error) {
            console.error('Ошибка при загрузке вопросов:', error);
            return this.bot.sendMessage(chatId, '❌ Не удалось загрузить вопросы.');
        }
    }

    clearSession(session) {
        session.step = null;
        session.answerToUserId = null;
        session.answeringQuestionId = null;
    }

    formatTimestamp(timestamp) {
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}

module.exports = AnswerQuestionsHandler;
