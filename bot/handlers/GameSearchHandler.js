const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');
const { checkAdminRole } = require('../utils/utils');
const keyboards = require('../config/keyboards');

let handlersRegistered = false;

class SearchGameHandler {
    constructor(bot) {
        if (handlersRegistered) return;
        handlersRegistered = true;

        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const data = query.data;
        const messageId = query.message.message_id;

        await this.bot.answerCallbackQuery(query.id);

        const session = await getSession(userId);

        if (data === 'search_game_by_name') {
            session.step = 'awaiting_game_search_query';
            return this.bot.sendMessage(chatId, '🔍 Введите название игры для поиска:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Назад в меню', callback_data: 'back_search_' }]
                    ]
                }
            });
        }

        if (data.startsWith('delete_game_')) {
            const gameId = data.replace('delete_game_', '');
            await db.collection('games').doc(gameId).delete();
            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendMessage(chatId, '🗑 Игра удалена.');
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }

        if (data.startsWith('edit_game_')) {
            const gameId = data.replace('edit_game_', '');
            session.editingGameId = gameId;
            session.step = 'choosing_edit_field';

            await this.bot.deleteMessage(chatId, messageId);
            return this.bot.sendMessage(chatId, '✏️ Выберите поле для редактирования:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Название', callback_data: `edit_name_${gameId}` }],
                        [{ text: 'Категория', callback_data: `edit_category_${gameId}` }],
                        [{ text: 'Возраст', callback_data: `edit_age_${gameId}` }],
                        [{ text: 'Описание', callback_data: `edit_description_${gameId}` }],
                        [{ text: '❌ Отменить', callback_data: `cancel_edit_${gameId}` }]
                    ]
                }
            });
        }

        if (data.startsWith('edit_category_')) {
            const gameId = data.replace('edit_category_', '');
            session.editingGameId = gameId;
            session.step = 'awaiting_category';

            await this.bot.deleteMessage(chatId, messageId);
            return this.bot.sendMessage(chatId, 'Выберите новую категорию:', {
                reply_markup: keyboards.editCategoryKeyboard
            });
        }

        if (data.startsWith('edit_age_')) {
            const gameId = data.replace('edit_age_', '');
            session.editingGameId = gameId;
            session.step = 'awaiting_age';

            await this.bot.deleteMessage(chatId, messageId);
            return this.bot.sendMessage(chatId, 'Выберите новое возрастное ограничение:', {
                reply_markup: keyboards.editAgeKeyboard
            });
        }

        if (data.startsWith('update_category_')) {
            const category = data.replace('update_category_', '');

            if (!session.editingGameId) {
                return this.bot.sendMessage(chatId, '❌ Ошибка: не найдена редактируемая игра');
            }

            try {
                await db.collection('games').doc(session.editingGameId).update({
                    category: category
                });

                const gameDoc = await db.collection('games').doc(session.editingGameId).get();
                const updatedGame = gameDoc.data();

                session.step = null;
                const tempGameId = session.editingGameId;
                session.editingGameId = null;

                await this.bot.sendMessage(chatId, '✅ Категория успешно обновлена!');
                return this.showGameCard(chatId, updatedGame, tempGameId, userId);
            } catch (error) {
                console.error('Ошибка обновления категории:', error);
                return this.bot.sendMessage(chatId, '❌ Не удалось обновить категорию');
            }
        }

        if (data.startsWith('update_age_')) {
            const age = data.replace('update_age_', '');

            if (!session.editingGameId) {
                return this.bot.sendMessage(chatId, '❌ Ошибка: не найдена редактируемая игра');
            }

            try {
                await db.collection('games').doc(session.editingGameId).update({
                    age: age
                });

                const gameDoc = await db.collection('games').doc(session.editingGameId).get();
                const updatedGame = gameDoc.data();

                session.step = null;
                const tempGameId = session.editingGameId;
                session.editingGameId = null;

                await this.bot.sendMessage(chatId, '✅ Возрастное ограничение успешно обновлено!');
                return this.showGameCard(chatId, updatedGame, tempGameId, userId);
            } catch (error) {
                console.error('Ошибка обновления возраста:', error);
                return this.bot.sendMessage(chatId, '❌ Не удалось обновить возрастное ограничение');
            }
        }

        if (data.startsWith('edit_name_') || data.startsWith('edit_description_')) {
            const [_, field, gameId] = data.split('_');
            session.editingField = field;
            session.step = `editing_${field}`;
            session.editingGameId = gameId;

            await this.bot.deleteMessage(chatId, messageId);
            return this.bot.sendMessage(chatId, `Введите новое значение для ${this.getFieldName(field)}:`, {
                reply_markup: keyboards.cancelKeyboard
            });
        }

        if (data.startsWith('cancel_edit_')) {
            session.step = null;
            session.editingGameId = null;
            session.editingField = null;
            return this.bot.deleteMessage(chatId, messageId);
            // return this.bot.sendMessage(chatId, 'Редактирование отменено.');
        }
        if (data.startsWith('back_search_')) {
            session.step = null;
            session.editingGameId = null;
            session.editingField = null;
            return this.bot.deleteMessage(chatId, messageId);
            // return this.bot.sendMessage(chatId, 'Редактирование отменено.');
        }
        if (data === 'back_to_main_menu_search_query') {
            session.step = null;
            session.editingGameId = null;
            session.editingField = null;
            await this.bot.deleteMessage(chatId, messageId);
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    getFieldName(field) {
        const fields = {
            'name': 'название',
            'category': 'категорию',
            'age': 'возрастное ограничение',
            'description': 'описание'
        };
        return fields[field] || field;
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const text = msg.text?.trim();
        const session = await getSession(userId);

        if (session.step === 'awaiting_game_search_query') {
            session.step = null;

            const snapshot = await db.collection('games')
                .where('name', '==', text)
                .get();

            if (snapshot.empty) {
                await this.bot.sendMessage(chatId, '❌ Игра не найдена.');
                return sendMainMenu(this.bot, chatId, session.name, session.role);
            }

            const doc = snapshot.docs[0];
            const game = doc.data();
            const gameId = doc.id;

            await this.showGameCard(chatId, game, gameId, userId);
            return;
        }

        if ((session.step === 'editing_name' || session.step === 'editing_description') && session.editingGameId) {
            const field = session.step.replace('editing_', '');
            const gameId = session.editingGameId;

            if (!text) {
                return this.bot.sendMessage(chatId, 'Пожалуйста, введите текст.');
            }

            try {
                await db.collection('games').doc(gameId).update({ [field]: text });
                const gameDoc = await db.collection('games').doc(gameId).get();
                const updatedGame = gameDoc.data();

                session.step = null;
                session.editingGameId = null;
                session.editingField = null;

                await this.bot.sendMessage(chatId, `✅ ${this.getFieldName(field)} успешно обновлено!`);
                return this.showGameCard(chatId, updatedGame, gameId, userId);
            } catch (error) {
                console.error(`Ошибка при обновлении ${field}:`, error);
                return this.bot.sendMessage(chatId, `❌ Произошла ошибка при обновлении ${this.getFieldName(field)}.`);
            }
        }
    }

    async showGameCard(chatId, game, gameId, userId) {
        try {
            const caption = `🎮 *${game.name}*\n📂 Категория: ${game.category}\n🔞 Возраст: ${game.age}+\n📄 ${game.description}`;

            const roleCheck = await checkAdminRole(userId, 'moderator');
            const buttons = [];

            if (roleCheck.ok) {
                buttons.push(
                    { text: '🗑 Удалить', callback_data: `delete_game_${gameId}` },
                    { text: '✏️ Редактировать', callback_data: `edit_game_${gameId}` }
                );
            }

            buttons.push({ text: '🔙 Назад в меню', callback_data: 'back_to_main_menu_search_query' });

            if (game.image && game.image.startsWith('http')) {
                await this.bot.sendPhoto(chatId, game.image, {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [buttons] }
                });
            } else {
                await this.bot.sendMessage(chatId, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: [buttons] }
                });
            }
        } catch (error) {
            console.error('Ошибка при отображении карточки игры:', error);
            await this.bot.sendMessage(chatId, '❌ Произошла ошибка при отображении игры.');
        }
    }
}

module.exports = SearchGameHandler;