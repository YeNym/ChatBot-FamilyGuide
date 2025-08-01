const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');
const keyboards = require('../config/keyboards');
const {gameNotification} = require('../config/messages');

class GameViewHandler {
    constructor(bot) {
        this.bot = bot;
        this.pageSize = 5;

        bot.on('callback_query', async (query) => {
            const { id: callbackId, data, from, message } = query;

            try {
                await this.bot.answerCallbackQuery(callbackId);
            } catch (err) {
                console.warn('⚠️ Ошибка answerCallbackQuery:', err.message);
                return;
            }

            const userId = from.id;
            const chatId = message.chat.id;
            const session = await getSession(userId);


            if (data === 'back_to_main_menu_view') {
                session.step = null;
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            if (data === 'view_games') {
                session.step = 'filter_category';
                session.filter = {};

                return bot.sendMessage(chatId, gameNotification, {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboards.filterCategoryKeyboard.inline_keyboard,
                            ...keyboards.backKeyboard.inline_keyboard
                        ]
                    }
                });
            }

            if (data === 'backKeyboard_menu') {
                session.step = null;
                session.filter = null;

                try {
                    await this.bot.deleteMessage(chatId, message.message_id);
                } catch (err) {
                    console.warn('⚠ Не удалось удалить сообщение фильтра:', err.message);
                }

                // return sendMainMenu(this.bot, chatId, session.name, session.role);
            }

            if (data.startsWith('filter_game_category_') && session.step === 'filter_category') {
                return this.handleCategorySelection(data, chatId, message.message_id, session);
            }

            if (data.startsWith('filter_game_age_') && session.step === 'filter_age') {
                return this.handleAgeSelection(data, chatId, message.message_id, session);
            }

            if (data.startsWith('games_page_')) {
                const page = parseInt(data.replace('games_page_', ''));
                session.page = page;
                return this.sendGamesPage(chatId, session.filter, page, session);
            }

            if (data.startsWith('game_')) {
                const gameId = data.replace('game_', '');
                return this.showGameDetails(chatId, gameId, session.page || 0, session.filter);
            }
        });
    }

    async handleCategorySelection(data, chatId, messageId, session) {
        const category = data.replace('filter_game_category_', '');
        session.filter.category = category;
        session.step = 'filter_age';

        try {
            return await this.bot.editMessageText('Выберите возрастной рейтинг:', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                    inline_keyboard: [
                        ...keyboards.filterAgeKeyboard.inline_keyboard,
                        ...keyboards.cancelKeyboard.inline_keyboard
                    ]
                }
            });
        } catch (err) {
            console.error('Ошибка при показе возрастного фильтра:', err);
            return this.bot.sendMessage(chatId, 'Выберите возрастной рейтинг:', {
                reply_markup: {
                    inline_keyboard: [
                        ...keyboards.filterAgeKeyboard.inline_keyboard,
                        ...keyboards.cancelKeyboard.inline_keyboard
                    ]
                }
            });
        }
    }

    async handleAgeSelection(data, chatId, messageId, session) {
        const age = data.replace('filter_game_age_', '') + '+';
        session.filter.age = age;
        session.page = 0;
        session.step = null;

        try {
            await this.bot.deleteMessage(chatId, messageId);
        } catch (err) {
            console.error('Ошибка при удалении сообщения с возрастом:', err);
        }

        return this.sendGamesPage(chatId, session.filter, 0, session);
    }

    async sendGamesPage(chatId, filter, page = 0, session) {
        let query = db.collection('games').orderBy('createdAt', 'desc');

        if (filter.category) query = query.where('category', '==', filter.category);
        if (filter.age) query = query.where('age', '==', filter.age);

        const snapshot = await query.offset(page * this.pageSize).limit(this.pageSize).get();

        if (snapshot.empty) {
            return this.bot.sendMessage(chatId, '⚠️ Нет игр по выбранным фильтрам.');
            // return sendMainMenu(this.bot, chatId, session.name, session.role);
        }

        for (const doc of snapshot.docs) {
            const game = doc.data();
            const gameId = doc.id;
            const caption = `🎮 *${game.name}*\n📂 ${game.category} | 🔞 ${game.age}`;
            const keyboard = {
                inline_keyboard: [[{ text: 'Подробнее', callback_data: `game_${gameId}` }]]
            };

            if (game.image && typeof game.image === 'string') {
                try {
                    await this.bot.sendPhoto(chatId, game.image, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                } catch (err) {
                    console.error('❌ Ошибка загрузки фото игры:', game.name, '-', err.message);
                    await this.bot.sendMessage(chatId, caption, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                }
            } else {
                await this.bot.sendMessage(chatId, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
            }

        }

        return this.sendNavigationControls(chatId, filter, page);
    }


    async sendNavigationControls(chatId, filter, page) {
        const navKeyboard = [];

        const row = [];

        let query = db.collection('games').orderBy('createdAt', 'desc');
        if (filter.category) query = query.where('category', '==', filter.category);
        if (filter.age) query = query.where('age', '==', filter.age);

        const nextPageSnapshot = await query.offset((page + 1) * this.pageSize).limit(1).get();

        if (page > 0) {
            row.push({ text: '⬅ Назад', callback_data: `games_page_${page - 1}` });
        }

        if (!nextPageSnapshot.empty) {
            row.push({ text: '➡ Вперёд', callback_data: `games_page_${page + 1}` });
        }

        // Только если есть кнопки "вперёд"/"назад", добавляем строку
        if (row.length > 0) navKeyboard.push(row);

        // В любом случае — добавляем кнопку "назад в меню"
        navKeyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_main_menu_view' }]);

        return this.bot.sendMessage(chatId, '📄 Навигация по играм:', {
            reply_markup: { inline_keyboard: navKeyboard }
        });
    }


    async showGameDetails(chatId, gameId, page, filter) {
        const doc = await db.collection('games').doc(gameId).get();

        if (!doc.exists) {
            return this.bot.sendMessage(chatId, '⚠️ Игра не найдена.');
        }

        const game = doc.data();
        const text = `🎮 *${game.name}*\n\n📄 ${game.description}\n🗂 Категория: ${game.category}\nВозраст: ${game.age}`;

        const backKeyboard = {
            inline_keyboard: [[
                {text: '🔙 Назад в меню', callback_data: 'back_to_main_menu_view'}
            ]]
        };

        if (game.image) {
            await this.bot.sendPhoto(chatId, game.image, {
                caption: text,
                parse_mode: 'Markdown',
                reply_markup: backKeyboard
            });
        } else {
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: backKeyboard
            });
        }
    }
}

module.exports = GameViewHandler;
