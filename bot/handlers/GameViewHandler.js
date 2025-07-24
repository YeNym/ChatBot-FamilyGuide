const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');
const keyboards = require('../config/keyboards'); // Здесь должен быть gameCategoryKeyboard и gameAgeKeyboard

class GameViewHandler {
    constructor(bot) {
        this.bot = bot;
        this.pageSize = 5;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const data = query.data;
            const session = await getSession(userId);

            // Назад в главное меню
            if (data === 'back_to_main_menu_view') {
                session.step = null;
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            // Начало просмотра игр
            if (data === 'view_games') {
                session.step = 'filter_category';
                session.filter = {};
                return bot.sendMessage(chatId, '🗂 Выберите категорию игр:', {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboards.filterCategoryKeyboard.inline_keyboard,
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });
            }

            // Выбор категории
            if (data.startsWith('filter_game_category_') && session.step === 'filter_category') {
                const category = data.replace('filter_game_category_', '');

                session.filter = session.filter || {};
                session.filter.category = category;
                session.step = 'filter_age';

                await bot.answerCallbackQuery(query.id);
                return bot.sendMessage(chatId, '🔞 Выберите возрастной рейтинг:', {
                    reply_markup: {
                        inline_keyboard: [
                            ...keyboards.filterAgeKeyboard.inline_keyboard,
                            ...keyboards.cancelKeyboard.inline_keyboard
                        ]
                    }
                });
            }



            // Выбор возраста
            if (data.startsWith('filter_game_age_') && session.step === 'filter_age') {
                const age = data.replace('filter_game_age_', '') + '+';
                session.filter.age = age;
                session.page = 0;
                session.step = null;
                return this.sendGamesPage(chatId, session.filter, 0, session);
            }

            // Пагинация
            if (data.startsWith('games_page_')) {
                const page = parseInt(data.replace('games_page_', ''));
                session.page = page;
                return this.sendGamesPage(chatId, session.filter, page, session);
            }

            // Подробнее
            if (data.startsWith('game_')) {
                const gameId = data.replace('game_', '');
                return this.showGameDetails(chatId, gameId, session.page || 0, session.filter);
            }
        });
    }

    async sendGamesPage(chatId, filter, page = 0, session) {
        let query = db.collection('games').orderBy('createdAt', 'desc');

        if (filter?.category) {
            query = query.where('category', '==', filter.category);
        }

        if (filter?.age) {
            query = query.where('age', '==', filter.age);
        }

        const snapshot = await query.offset(page * this.pageSize).limit(this.pageSize).get();


        if (snapshot.empty) {
            await this.bot.sendMessage(chatId, '⚠️ Нет игр по выбранным фильтрам.');
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }

        for (const doc of snapshot.docs) {
            const game = doc.data();
            const gameId = doc.id;
            const caption = `🎮 *${game.name}*\n📂 ${game.category} | 🔞 ${game.age}`;
            const keyboard = {
                inline_keyboard: [[{ text: 'Подробнее', callback_data: `game_${gameId}` }]]
            };

            if (game.image) {
                await this.bot.sendPhoto(chatId, game.image, {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                });
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
        const buttons = [];

        let query = db.collection('games').orderBy('createdAt', 'desc');
        if (filter?.category) query = query.where('category', '==', filter.category);
        if (filter?.age) query = query.where('age', '==', filter.age);

        const nextPageSnapshot = await query.offset((page + 1) * this.pageSize).limit(1).get();

        if (page > 0) {
            buttons.push({ text: '⬅ Назад', callback_data: `games_page_${page - 1}` });
        }

        if (!nextPageSnapshot.empty) {
            buttons.push({ text: '➡ Вперёд', callback_data: `games_page_${page + 1}` });
        }

        const navKeyboard = [];
        if (buttons.length > 0) navKeyboard.push(buttons);
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

        if (game.image) {
            await this.bot.sendPhoto(chatId, game.image, {
                caption: text,
                parse_mode: 'Markdown'
            });
        } else {
            await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }

        return this.sendNavigationControls(chatId, filter, page);
    }
}

module.exports = GameViewHandler;
