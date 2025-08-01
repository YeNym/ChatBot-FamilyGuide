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
                const sent = await bot.sendMessage(chatId, '🔍 Введите название игры, которую хотите удалить:', {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙 Назад', callback_data: 'cancel_delete_game_step' }]
                        ]
                    }
                });
                session.step = 'awaiting_game_name_for_deletion';
                session.tempMessageId = sent.message_id;
                // await bot.answerCallbackQuery(query.id);
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
            if (data === 'cancel_delete_game_step') {
                if (session.tempMessageId) {
                    try {
                        await bot.deleteMessage(chatId, session.tempMessageId);
                    } catch (err) {
                        console.error('Не удалось удалить сообщение:', err);
                    }
                }

                clearSession(userId);
                await bot.answerCallbackQuery(query.id);
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
                    if (session.tempMessageId) {
                        try {
                            await this.bot.deleteMessage(chatId, session.tempMessageId);
                        } catch (err) {}
                    }
                    clearSession(userId);
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
                if (session.tempMessageId) {
                    try {
                        await this.bot.deleteMessage(chatId, session.tempMessageId);
                    } catch (err) {
                        console.error('Не удалось удалить сообщение с кнопкой Назад:', err);
                    }
                    session.tempMessageId = null;
                }
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
