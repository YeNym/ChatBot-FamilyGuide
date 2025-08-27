const db = require('../../firebase');
const sendMainMenu = require('../views/MainMenu');
const { getSession } = require('../utils/session');

class ModerateGameHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const messageId = query.message.message_id;
            const data = query.data;
            const session = await getSession(userId);

            // Начало модерации
            if (data === 'moderate_games') {
                const hasNext = await this.showNextGame(chatId);
                if (!hasNext) {
                    await this.bot.sendMessage(chatId, '✅ Все игры обработаны.');
                    return sendMainMenu(bot, chatId, session.name, session.role);
                }
                return;
            }

            if (data === 'back_to_main_menu') {
                await bot.answerCallbackQuery(query.id);
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            if (data.startsWith('approve_game_')) {
                const gameId = data.replace('approve_game_', '');
                const docRef = db.collection('pendingGames').doc(gameId);
                const doc = await docRef.get();

                if (!doc.exists) {
                    await bot.answerCallbackQuery(query.id, { text: 'Игра уже обработана.', show_alert: true });
                    return sendMainMenu(bot, chatId, session.name, session.role);
                }

                const gameData = doc.data();
                await db.collection('games').add(gameData);
                await docRef.delete();

                await bot.answerCallbackQuery(query.id);
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
                await bot.sendMessage(chatId, `✅ Игра "${gameData.name}" сохранена.`);

                const hasNext = await this.showNextGame(chatId);
                if (!hasNext) {
                    await this.bot.sendMessage(chatId, '✅ Все игры обработаны.');
                    return sendMainMenu(bot, chatId, session.name, session.role);
                }
                return;
            }

            // Удалить игру
            if (data.startsWith('reject_game_')) {
                const gameId = data.replace('reject_game_', '');
                const docRef = db.collection('pendingGames').doc(gameId);
                const doc = await docRef.get();

                if (!doc.exists) {
                    await bot.answerCallbackQuery(query.id, { text: 'Игра уже удалена.', show_alert: true });
                    return sendMainMenu(bot, chatId, session.name, session.role);
                }

                const gameData = doc.data();
                await docRef.delete();

                await bot.answerCallbackQuery(query.id);
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
                await bot.sendMessage(chatId, `❌ Игра "${gameData.name}" удалена.`);

                const hasNext = await this.showNextGame(chatId);
                if (!hasNext) {
                    await this.bot.sendMessage(chatId, '✅ Все игры обработаны.');
                    return sendMainMenu(bot, chatId, session.name, session.role);
                }
                return;
            }
        });
    }

    async showNextGame(chatId) {
        const totalSnapshot = await db.collection('pendingGames').get();
        const total = totalSnapshot.size;

        const snapshot = await db.collection('pendingGames')
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return false;
        }

        const doc = snapshot.docs[0];
        const game = doc.data();
        const gameId = doc.id;

        const text = `🎮 *${game.name}*\n\nОписание:\n${game.description}\n\nКатегория: ${game.category}\nВозраст: ${game.age}\nЛокация: ${game.location}\n\n🕹 Всего ожидает: ${total} игр`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Сохранить', callback_data: `approve_game_${gameId}` },
                    { text: '❌ Удалить', callback_data: `reject_game_${gameId}` }
                ],
                [
                    { text: '🔙 Назад', callback_data: 'back_to_main_menu' }
                ]
            ]
        };

        if (game.image) {
            await this.bot.sendPhoto(chatId, game.image, {
                caption: text,
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } else {
            await this.bot.sendMessage(chatId, text, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
        return true;
    }
}

module.exports = ModerateGameHandler;
