const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');

let handlerInitialized = false;

class AskQuestionHandler {
    constructor(bot) {
        if (handlerInitialized) return;
        handlerInitialized = true;

        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const data = query.data;

        await this.bot.answerCallbackQuery(query.id);

        if (data === 'ask_question') {
            const session = await getSession(userId);
            session.step = 'awaiting_user_question';

            return this.bot.sendMessage(chatId, '✉️ Задайте вопрос специалисту:');
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text?.trim();

        if (!text) return;

        const session = await getSession(userId);

        if (session.step === 'awaiting_user_question') {
            try {
                await db.collection('questions').add({
                    userId: userId,
                    name: session.name || msg.from.first_name,
                    question: text,
                    timestamp: new Date().toISOString(),
                });

                session.step = null;

                await this.bot.sendMessage(chatId, '✅ Ваш вопрос отправлен специалисту!');
                return sendMainMenu(this.bot, chatId, session.name, session.role);
            } catch (error) {
                console.error('Ошибка при сохранении вопроса:', error);
                return this.bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
            }
        }
    }
}

module.exports = AskQuestionHandler;
