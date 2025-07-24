const db = require('../../firebase');
const { getSession, clearSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');

class DeleteGameHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const data = query.data;
            const session = await getSession(userId);

            if (data === 'delete_game') {
                session.step = 'awaiting_game_name_for_deletion';
                await bot.sendMessage(chatId, '🔍 Введите название игры, которую хотите удалить:');
                return bot.answerCallbackQuery(query.id);
            }

            if (data.startsWith('confirm_delete_game_')) {
                const gameId = data.replace('confirm_delete_game_', '');
                await db.collection('games').doc(gameId).delete();
                clearSession(userId);
                await bot.answerCallbackQuery(query.id);
                await bot.sendMessage(chatId, '✅ Игра удалена.');
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            if (data === 'cancel_delete_game') {
                clearSession(userId);
                await bot.answerCallbackQuery(query.id);
                return sendMainMenu(bot, chatId, session.name, session.role);
            }
        });

        bot.on('message', async (msg) => {
            const userId = msg.from.id;
            const chatId = msg.chat.id;
            const session = await getSession(userId);

            if (session.step === 'awaiting_game_name_for_deletion') {
                const text = msg.text?.trim();
                if (!text) return this.bot.sendMessage(chatId, '⚠️ Введите корректное название.');

                const snapshot = await db.collection('games')
                    .where('name', '>=', text)
                    .where('name', '<=', text + '\uf8ff')
                    .get();

                if (snapshot.empty) {
                    clearSession(userId);
                    await this.bot.sendMessage(chatId, '❌ Игра не найдена.');
                    return sendMainMenu(this.bot, chatId, session.name, session.role);
                }

                const buttons = snapshot.docs.map(doc => {
                    const game = doc.data();
                    return [{
                        text: `🗑 ${game.name} (${game.category})`,
                        callback_data: `confirm_delete_game_${doc.id}`
                    }];
                });

                buttons.push([{ text: '🔙 Назад', callback_data: 'cancel_delete_game' }]);

                await this.bot.sendMessage(chatId, 'Выберите игру для удаления:', {
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                });
            }
        });
    }
}

module.exports = DeleteGameHandler;
