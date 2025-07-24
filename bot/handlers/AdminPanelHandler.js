const db = require('../../firebase');
const { checkAdminRole } = require('../utils/utils');
const sendMainMenu = require('../views/MainMenu');
const { getSession, clearSession } = require('../utils/session');
const messages = require('../config/messages');
const keyboards = require('../config/keyboards');

class AdminPanelHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const userId = query.from.id;
            const chatId = query.message.chat.id;
            const data = query.data;
            const session = await getSession(userId);
            const { role, name } = session;

            if (data === 'open_admin_panel') {
                const check = await checkAdminRole(userId, 'superadmin');
                if (!check.ok) {
                    return bot.answerCallbackQuery(query.id, {
                        text: messages.noAccess,
                        show_alert: true
                    });
                }

                await bot.sendMessage(chatId, messages.adminPanelInfo, {
                    reply_markup: keyboards.adminPanelKeyboard
                });

                return bot.answerCallbackQuery(query.id);
            }

            if (session.step === 'awaiting_role') {
                let newRole = '';
                if (data === 'set_role_superadmin') newRole = 'superadmin';
                else if (data === 'set_role_admin') newRole = 'admin';
                else if (data === 'set_role_moderator') newRole = 'moderator';
                else return;

                await db.collection('admins').doc(session.newId).set({
                    name: session.newName,
                    role: newRole
                });

                try {
                    await bot.sendMessage(session.newId, `🎉 Вы были назначены администратором с ролью *${newRole}*!`, {
                        parse_mode: 'Markdown'
                    });
                    await sendMainMenu(bot, session.newId, session.newName, newRole);
                } catch (err) {
                    console.warn(`Не удалось уведомить нового админа (${session.newId}):`, err.message);
                }
                await bot.sendMessage(chatId, messages.adminAdded(session.newId, session.newName, newRole));
                clearSession(userId);
                return sendMainMenu(bot, chatId, name, role);
            }
        });

        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const text = msg.text;
            const session = await getSession(userId);
            const check = await checkAdminRole(userId, 'admin');
            if (!check.ok) return;

            const { name, role } = session;

            if (text === '🔙 Назад') {
                clearSession(userId);
                await bot.sendMessage(chatId, messages.backToMain, {
                    reply_markup: { remove_keyboard: true }
                });
                return sendMainMenu(bot, chatId, name, role);
            }

            if (text === '➕ Добавить админа') {
                session.step = 'awaiting_id';
                return bot.sendMessage(chatId, messages.enterAdminId);
            }

            if (session.step === 'awaiting_id') {
                session.newId = text;
                session.step = 'awaiting_name';
                return bot.sendMessage(chatId, messages.enterAdminName);
            }

            if (session.step === 'awaiting_name') {
                session.newName = text;
                session.step = 'awaiting_role';
                return bot.sendMessage(chatId, messages.selectRole, {
                    reply_markup: keyboards.selectRoleKeyboard
                });
            }

            if (text === '🗑️ Удалить админа') {
                session.step = 'awaiting_delete_id';
                return bot.sendMessage(chatId, messages.enterDeleteId);
            }

            if (session.step === 'awaiting_delete_id') {
                await db.collection('admins').doc(text).delete();
                clearSession(userId);

                // Уведомление удалённому админу
                try {
                    await bot.sendMessage(text, '❌ Вы были удалены из списка администраторов. Доступ к панели закрыт.');
                    await sendMainMenu(bot, text, 'Пользователь', 'user');
                } catch (err) {
                    console.warn(`Не удалось отправить сообщение удалённому админу (${text}):`, err.message);
                }

                await bot.sendMessage(chatId, messages.adminDeleted(text));
                return sendMainMenu(bot, chatId, name, role);
            }

            if (text === '📋 Список админов') {
                const snapshot = await db.collection('admins').get();
                if (snapshot.empty) {
                    return bot.sendMessage(chatId, messages.adminListEmpty);
                }

                let response = messages.adminListHeader;
                snapshot.forEach(doc => {
                    const admin = doc.data();
                    response += messages.adminListItem(doc.id, admin.name, admin.role);
                });

                await bot.sendMessage(chatId, response);
                return sendMainMenu(bot, chatId, name, role);
            }
        });
    }
}

module.exports = AdminPanelHandler;
