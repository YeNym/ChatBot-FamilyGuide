const db = require('../../firebase');
const { getSession, clearSession } = require('../utils/session');
const { checkAdminRole } = require('../utils/utils');
const sendMainMenu = require('../views/MainMenu');
const messages = require('../config/messages');

class CreatePostHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const data = query.data;
            const session = await getSession(userId);

            if (data === 'create_post') {
                const check = await checkAdminRole(userId, 'superadmin');
                if (!check.ok) {
                    return bot.answerCallbackQuery(query.id, {
                        text: messages.noAccess,
                        show_alert: true
                    });
                }

                session.step = 'awaiting_post_content';
                session.draftMessage = null;

                await bot.sendMessage(chatId, messages.enterPostText);
                return bot.answerCallbackQuery(query.id);
            }

            // Подтверждение отправки
            if (data === 'confirm_send_post') {
                const check = await checkAdminRole(userId, 'superadmin');
                if (!check.ok || !session.draftMessage) {
                    return bot.answerCallbackQuery(query.id, {
                        text: messages.noDraft,
                        show_alert: true
                    });
                }

                const usersSnapshot = await db.collection('users').get();
                if (usersSnapshot.empty) {
                    clearSession(userId);
                    await bot.sendMessage(chatId, messages.noSubscribers);
                    return bot.answerCallbackQuery(query.id);
                }

                let success = 0;
                for (const doc of usersSnapshot.docs) {
                    try {
                        await this.bot.copyMessage(
                            doc.id,
                            chatId,
                            session.draftMessage.message_id
                        );
                        success++;
                    } catch (err) {
                        console.warn(`❌ Не удалось отправить пост пользователю ${doc.id}:`, err.message);
                    }
                }

                clearSession(userId);
                await this.bot.sendMessage(chatId, messages.postSent(success));
                await bot.answerCallbackQuery(query.id);
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            // Отмена
            if (data === 'cancel_post') {
                clearSession(userId);
                await bot.answerCallbackQuery(query.id);
                await bot.sendMessage(chatId, messages.postCancelled);
                return sendMainMenu(bot, chatId, session.name, session.role);
            }

            // Изменить пост
            if (data === 'edit_post') {
                session.step = 'awaiting_post_content';
                session.draftMessage = null;
                await bot.answerCallbackQuery(query.id);
                return bot.sendMessage(chatId, messages.enterNewPost);
            }
        });

        bot.on('message', async (msg) => {
            const userId = msg.from.id;
            const chatId = msg.chat.id;
            const session = await getSession(userId);
            const check = await checkAdminRole(userId, 'superadmin');
            if (!check.ok) return;

            if (session.step === 'awaiting_post_content') {
                session.draftMessage = msg;

                await this.bot.sendMessage(chatId, messages.postConfirmPrompt, {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '📤 Отправить пост', callback_data: 'confirm_send_post' },
                            { text: '✏️ Изменить', callback_data: 'edit_post' },
                            { text: '❌ Отменить', callback_data: 'cancel_post' }
                        ]]
                    }
                });
            }
        });
    }
}

module.exports = CreatePostHandler;
