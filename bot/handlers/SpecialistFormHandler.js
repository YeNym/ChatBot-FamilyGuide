const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');
const {cooperationMessage} = require('../config/messages');
let initialized = false;

class SpecialistFormHandler {
    constructor(bot) {
        if (initialized) return;
        initialized = true;

        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const { id, data, from, message } = query;
        const userId = from.id;
        const chatId = message.chat.id;
        const messageId = message.message_id;

        await this.safeAnswerCallback(id);

        const session = await getSession(userId);

        switch (data) {
            case 'specialist':
                return this.askForText(chatId, session, from.first_name);

            case 'back_to_main_specialist': {
                this.clearSession(session);
                await this.deleteWarning(chatId, session);
                return this.bot.deleteMessage(chatId, messageId); // удаляем именно сообщение с кнопкой
            }

            case 'back_to_main_from_specialist': {
                this.clearSession(session);
                await this.deleteWarning(chatId, session);
                await this.bot.deleteMessage(chatId, messageId); // то же самое для старой кнопки
                return sendMainMenu(this.bot, chatId, session.name, session.role);
            }
        }

    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const session = await getSession(userId);

        if (session.step === 'awaiting_text') {
            if (msg.text) {
                return this.handleTextSubmission(chatId, msg.text, session, userId, msg.from.first_name);
            } else {
                return this.sendWarning(chatId, session, '❗ Пожалуйста, введите только текстовое сообщение (контактную информацию).');
            }
        }
    }

    async askForText(chatId, session, name) {
        session.name = name;
        session.step = 'awaiting_text';
        session.specialistText = '';

        return this.bot.sendMessage(chatId, cooperationMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_specialist' }]
                ]
            }
        });
    }

    async handleTextSubmission(chatId, text, session, userId, fallbackName) {
        session.specialistText = text;

        try {
            await db.collection('specialistForms').add({
                userId,
                name: session.name || fallbackName,
                description: text,
                timestamp: new Date().toISOString()
            });

            await this.deleteWarning(chatId, session);
            await this.bot.sendMessage(chatId, '✅ Спасибо! Ваша анкета успешно отправлена.');

            this.clearSession(session);
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        } catch (err) {
            console.error('Ошибка сохранения анкеты:', err);
            return this.bot.sendMessage(chatId, '❌ Произошла ошибка при сохранении анкеты. Попробуйте позже.');
        }
    }

    async sendWarning(chatId, session, text) {
        await this.deleteWarning(chatId, session);
        const msg = await this.bot.sendMessage(chatId, text, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_specialist' }]
                ]
            }
        });
        session.warningMessageId = msg.message_id;
    }

    async deleteWarning(chatId, session) {
        if (session.warningMessageId) {
            try {
                await this.bot.deleteMessage(chatId, session.warningMessageId);
            } catch (e) {
                console.warn('Не удалось удалить предупреждение:', e.message);
            }
            session.warningMessageId = null;
        }
    }

    async safeAnswerCallback(callbackId) {
        try {
            await this.bot.answerCallbackQuery(callbackId);
        } catch (e) {
            console.warn('callbackQuery error:', e.message);
        }
    }

    clearSession(session) {
        session.step = null;
        session.specialistText = '';
        session.warningMessageId = null;
    }
}

module.exports = SpecialistFormHandler;
