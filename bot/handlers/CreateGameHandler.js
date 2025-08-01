const db = require('../../firebase');
const { getSession, clearSession } = require('../utils/session');
const { checkAdminRole } = require('../utils/utils');
const messages = require('../config/messages');
const keyboards = require('../config/keyboards');
const sendMainMenu = require('../views/MainMenu');

class GameCreateHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const { id, data, from, message } = query;
        const userId = from.id;
        const chatId = message.chat.id;
        const messageId = message.message_id;
        const session = await getSession(userId);

        try {
            if (data === 'add_game') {
                const check = await checkAdminRole(userId, 'admin');
                if (!check.ok) {
                    return this.bot.answerCallbackQuery(id, {
                        text: '⛔ У вас нет прав для добавления игр.',
                        show_alert: true
                    });
                }

                clearSession(userId);
                const newSession = await getSession(userId);
                newSession.step = 'awaiting_game_name';
                newSession.newGame = {};

                // Удаляем предыдущие сообщения бота
                await this.cleanUpPreviousMessages(chatId, newSession);

                const sent = await this.bot.sendMessage(chatId, '🎮 Введите название игры:', {
                    reply_markup: keyboards.cancelKeyboard
                });

                newSession.promptMessageId = sent.message_id;
                return this.bot.answerCallbackQuery(id);
            }

            if (data.startsWith('set_game_category_')) {
                const category = data.replace('set_game_category_', '');
                session.newGame.category = category;
                session.step = 'awaiting_game_age';

                // Удаляем предыдущие сообщения бота
                await this.cleanUpPreviousMessages(chatId, session);

                await this.bot.answerCallbackQuery(id);
                const sent = await this.bot.sendMessage(chatId, 'Выберите возрастной рейтинг:', {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboards.gameAgeKeyboard.inline_keyboard,
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });

                session.promptMessageId = sent.message_id;
                return;
            }

            if (data.startsWith('set_game_age_')) {
                const age = data.replace('set_game_age_', '') + '+';
                session.newGame.age = age;
                session.step = 'awaiting_game_image';

                // Удаляем предыдущие сообщения бота
                await this.cleanUpPreviousMessages(chatId, session);

                await this.safeDeleteMessage(chatId, messageId);
                await this.bot.answerCallbackQuery(id);

                const sent = await this.bot.sendMessage(chatId, '🖼 Отправьте изображение (обложку) для игры или нажмите «Пропустить»:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '⏭ Пропустить', callback_data: 'skip_game_image' }],
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });

                session.promptMessageId = sent.message_id;
                return;
            }

            if (data === 'skip_game_image') {
                await this.saveGameAndReturn(userId, chatId, session.newGame, id);
            }

            if (data === 'cancel_game_creation') {
                if (session.promptMessageId) {
                    await this.safeDeleteMessage(chatId, session.promptMessageId);
                }

                await this.safeDeleteMessage(chatId, messageId);
                clearSession(userId);
                await this.bot.answerCallbackQuery(id);
                return this.bot.sendMessage(chatId, '❌ Действие отменено');
            }
        } catch (err) {
            console.error('❌ Ошибка в callback_query:', err);
            await this.bot.answerCallbackQuery(id, { text: 'Произошла ошибка.', show_alert: true });
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        const session = await getSession(userId);

        if (!session.step) return;

        session.newGame = session.newGame || {};

        try {
            switch (session.step) {
                case 'awaiting_game_name':
                    if (!text) return this.bot.sendMessage(chatId, '⚠️ Пожалуйста, введите текст.');

                    // Удаляем предыдущие сообщения бота
                    await this.cleanUpPreviousMessages(chatId, session);

                    session.newGame.name = text;
                    session.step = 'awaiting_game_description';

                    const sent1 = await this.bot.sendMessage(chatId, '📄 Введите краткое описание игры:', {
                        reply_markup: keyboards.cancelKeyboard
                    });

                    session.promptMessageId = sent1.message_id;
                    break;

                case 'awaiting_game_description':
                    if (!text) return this.bot.sendMessage(chatId, '⚠️ Пожалуйста, введите текст.');

                    // Удаляем предыдущие сообщения бота
                    await this.cleanUpPreviousMessages(chatId, session);

                    session.newGame.description = text;
                    session.step = 'awaiting_game_category';

                    const sent2 = await this.bot.sendMessage(chatId, '🗂 Выберите категорию/жанр игры:', {
                        reply_markup: {
                            inline_keyboard: [
                                ...keyboards.gameCategoryKeyboard.inline_keyboard,
                                ...keyboards.cancelKeyboard.inline_keyboard
                            ]
                        }
                    });

                    session.promptMessageId = sent2.message_id;
                    break;

                case 'awaiting_game_image':
                    if (msg.photo) {
                        const fileId = msg.photo.at(-1).file_id;
                        session.newGame.image = fileId;
                        await this.saveGameAndReturn(userId, chatId, session.newGame);
                    } else {
                        // Удаляем предыдущие сообщения бота
                        await this.cleanUpPreviousMessages(chatId, session);

                        const sent3 = await this.bot.sendMessage(chatId, '📸 Пожалуйста, отправьте изображение или нажмите «Пропустить».', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '⏭ Пропустить', callback_data: 'skip_game_image' }],
                                    ...keyboards.cancelKeyboard.inline_keyboard
                                ]
                            }
                        });

                        session.promptMessageId = sent3.message_id;
                    }
                    break;
            }
        } catch (err) {
            console.error('❌ Ошибка обработки сообщения:', err);
            await this.bot.sendMessage(chatId, 'Произошла ошибка при обработке. Попробуйте позже.');
        }
    }

    async saveGameAndReturn(userId, chatId, gameData, callbackId = null) {
        const game = {
            ...gameData,
            createdAt: new Date()
        };

        await db.collection('pendingGames').add(game);
        clearSession(userId);
        const session = await getSession(userId);

        if (callbackId) {
            await this.bot.answerCallbackQuery(callbackId);
        }

        await this.bot.sendMessage(chatId, `✅ Игра "${game.name}" успешно добавлена!`);
        return sendMainMenu(this.bot, chatId, session.name, session.role);
    }

    async safeDeleteMessage(chatId, messageId) {
        if (!messageId || !chatId) {
            console.log('⚠ Неверные параметры для удаления сообщения');
            return;
        }

        try {
            await this.bot.deleteMessage(chatId, messageId);
        } catch (error) {
            // Проверяем разные варианты структуры ошибки
            const errorMessage =
                error.response?.description ||
                error.description ||
                error.message ||
                'Неизвестная ошибка';

            if (errorMessage.includes('message to delete not found')) {
                // Это не критичная ошибка - сообщение уже удалено
                console.log(`ℹ Сообщение ${messageId} уже удалено`);
                return;
            }

            console.warn(`⚠ Ошибка при удалении сообщения ${messageId}:`, errorMessage);
        }
    }
    async cleanUpPreviousMessages(chatId, session) {
        try {
            if (session.promptMessageId) {
                await this.safeDeleteMessage(chatId, session.promptMessageId);
                session.promptMessageId = null;
            }
        } catch (e) {
            console.warn('⚠ Ошибка при очистке сообщений:', e.message);
        }
    }
}
module.exports = GameCreateHandler;