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

                const newUserIdNum = Number(String(session.newId).trim());
                if (!Number.isFinite(newUserIdNum)) {
                    await this.bot.sendMessage(chatId, '❗ Введите корректный числовой ID Telegram.');
                    return;
                }

                const existing = await db.collection('admins').doc(String(newUserIdNum)).get();
                const payload = {
                    userId: newUserIdNum,
                    name: session.newName || 'Admin',
                    role: newRole,
                    updatedAt: new Date()
                };

                await db.collection('admins').doc(String(newUserIdNum)).set(payload, { merge: true });

                try {
                    await this.bot.sendMessage(newUserIdNum, `🎉 Вам назначена роль: ${newRole}`);
                    await sendMainMenu(this.bot, newUserIdNum, payload.name, newRole);
                } catch (err) {
                    console.warn(`Не удалось уведомить нового админа (${newUserIdNum}):`, err.message);
                }

                const was = existing.exists ? 'обновлена' : 'добавлена';
                await this.bot.sendMessage(chatId, `✅ Роль ${was}. ID: ${newUserIdNum}\nИмя: ${payload.name}\nРоль: ${newRole}`);

                await clearSession(userId);
                return sendMainMenu(this.bot, chatId, name, role);
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
                return this.bot.sendMessage(chatId, messages.enterAdminId);
            }

            if (session.step === 'awaiting_id') {
                const idNum = Number(String(text).trim());
                if (!Number.isFinite(idNum)) {
                    return this.bot.sendMessage(chatId, '❗ Введите корректный числовой ID Telegram.');
                }
                session.newId = idNum; // храним как число
                session.step = 'awaiting_name';
                return this.bot.sendMessage(chatId, messages.enterAdminName);
            }

            if (session.step === 'awaiting_name') {
                const nameClean = (text || '').trim();
                if (!nameClean) {
                    return this.bot.sendMessage(chatId, '❗ Введите имя администратора.');
                }
                session.newName = nameClean;
                session.step = 'awaiting_role';
                return this.bot.sendMessage(chatId, messages.selectRole, {
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
