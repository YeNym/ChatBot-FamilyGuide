const db = require('../../firebase');
const { getSession, clearSession } = require('../utils/session');
const { checkAdminRole } = require('../utils/utils');
const messages = require('../config/messages');
const keyboards = require('../config/keyboards');
const sendMainMenu = require('../views/MainMenu');

class GameCreateHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const data = query.data;
            const session = await getSession(userId);

            // Начало создания игры
            if (data === 'add_game') {
                const check = await checkAdminRole(userId, 'admin');
                if (!check.ok) {
                    return bot.answerCallbackQuery(query.id, {
                        text: '⛔ У вас нет прав для добавления игр.',
                        show_alert: true
                    });
                }

                clearSession(userId);
                const newSession = await getSession(userId);
                newSession.step = 'awaiting_game_name';
                newSession.newGame = {};

                await bot.sendMessage(chatId, '🎮 Введите название игры:', {
                    reply_markup: keyboards.cancelKeyboard
                });

                return bot.answerCallbackQuery(query.id);
            }

            // Выбор категории
            if (data.startsWith('set_game_category_')) {
                const category = data.replace('set_game_category_', '');
                session.newGame.category = category;
                session.step = 'awaiting_game_age';

                await bot.answerCallbackQuery(query.id);
                return bot.sendMessage(chatId, '🔞 Выберите возрастной рейтинг:', {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboards.gameAgeKeyboard.inline_keyboard,
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });
            }

            // Выбор возраста
            if (data.startsWith('set_game_age_')) {
                const age = data.replace('set_game_age_', '') + '+';
                session.newGame.age = age;
                session.step = 'awaiting_game_image';

                await bot.answerCallbackQuery(query.id);
                return bot.sendMessage(chatId, '🖼 Отправьте изображение (обложку) для игры или нажмите «Пропустить»:', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '⏭ Пропустить', callback_data: 'skip_game_image' }
                            ],
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });
            }

            // Пропуск изображения
            if (data === 'skip_game_image') {
                session.step = null;

                const newGame = {
                    ...session.newGame,
                    createdAt: new Date()
                };

                await db.collection('pendingGames').add({
                    ...session.newGame,
                    createdAt: new Date()
                });
                clearSession(userId);

                await bot.answerCallbackQuery(query.id);
                await bot.sendMessage(chatId, `✅ Игра "${newGame.name}" успешно добавлена!`);
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            // Отмена создания игры
            if (data === 'cancel_game_creation') {
                clearSession(userId);
                await bot.answerCallbackQuery(query.id);
                await bot.sendMessage(chatId, '❌ Действие отменено');
                return sendMainMenu(bot, chatId, session.name, session.role);
            }
        });

        bot.on('message', async (msg) => {
            const userId = msg.from.id;
            const chatId = msg.chat.id;
            const text = msg.text?.trim();
            const session = await getSession(userId);


            if (!session.step) return;
            session.newGame = session.newGame || {};

            switch (session.step) {
                case 'awaiting_game_name':
                    if (!text) return bot.sendMessage(chatId, '⚠️ Пожалуйста, введите текст.');
                    session.newGame.name = text;
                    session.step = 'awaiting_game_description';
                    return bot.sendMessage(chatId, '📄 Введите краткое описание игры:', {
                        reply_markup: keyboards.cancelKeyboard
                    });

                case 'awaiting_game_description':
                    if (!text) return bot.sendMessage(chatId, '⚠️ Пожалуйста, введите текст.');
                    session.newGame.description = text;
                    session.step = 'awaiting_game_category';
                    return bot.sendMessage(chatId, '🗂 Выберите категорию/жанр игры:', {
                        reply_markup: {
                            inline_keyboard: [
                                ...keyboards.gameCategoryKeyboard.inline_keyboard,
                                ...keyboards.cancelKeyboard.inline_keyboard
                            ]
                        }
                    });

                case 'awaiting_game_image':
                    if (msg.photo) {
                        const fileId = msg.photo[msg.photo.length - 1].file_id;
                        session.newGame.image = fileId;
                        session.step = null;

                        const newGame = {
                            ...session.newGame,
                            createdAt: new Date()
                        };

                        await db.collection('games').add(newGame);
                        clearSession(userId);

                        await bot.sendMessage(chatId, `✅ Игра "${newGame.name}" успешно добавлена!`);
                        return sendMainMenu(bot, chatId, session.name, session.role);

                    }

                    return bot.sendMessage(chatId, '📸 Пожалуйста, отправьте изображение или нажмите «Пропустить».', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⏭ Пропустить', callback_data: 'skip_game_image' }],
                                ...keyboards.cancelKeyboard.inline_keyboard]
                        }
                    });
            }
        });
    }
}

module.exports = GameCreateHandler;
