const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');

let initialized = false;

class ModerateProfilesHandler {
    constructor(bot) {
        if (initialized) return;
        initialized = true;

        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
    }

    async handleCallbackQuery(query) {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        const session = await getSession(userId);
        await this.bot.answerCallbackQuery(query.id);

        if (data === 'view_profiles') {
            return this.showNextProfile(chatId, session, 0);
        }

        if (data.startsWith('next_profile_')) {
            const index = parseInt(data.split('_')[2]);
            return this.showNextProfile(chatId, session, index);
        }

        if (data.startsWith('approve_profile_')) {
            const [_, __, docId, targetUserId] = data.split('_');
            await this.approveProfile(docId, targetUserId, chatId, messageId, session);
        }

        if (data.startsWith('reject_profile_')) {
            const docId = data.replace('reject_profile_', '');
            const doc = await db.collection('specialistForms').doc(docId).get();

            if (doc.exists) {
                const form = doc.data();
                const targetUserId = form.userId;

                await db.collection('specialistForms').doc(docId).delete();
                await this.bot.deleteMessage(chatId, messageId);
                await this.bot.sendMessage(chatId, '❌ Анкета отклонена.');

                // Уведомление пользователю
                try {
                    await this.bot.sendMessage(targetUserId, '❌ Ваша анкета была отклонена. Вы можете подать заново позже.');
                } catch (notifyErr) {
                    console.warn(`Не удалось уведомить пользователя ${targetUserId}:`, notifyErr.message);
                }
            }

            return this.showNextProfile(chatId, session, 0);
        }

        if (data === 'back_to_main_from_profiles') {
            await this.bot.deleteMessage(chatId, messageId);
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    async showNextProfile(chatId, session, index = 0) {
        try {
            const snapshot = await db.collection('specialistForms')
                .orderBy('timestamp', 'asc')
                .get();

            const forms = snapshot.docs;
            if (forms.length === 0) {
                await this.bot.sendMessage(chatId, '❌ Нет новых анкет.');
                return sendMainMenu(this.bot, chatId, session.name, session.role);

            }

            if (index >= forms.length) {
                return this.bot.sendMessage(chatId, '📭 Больше нет анкет.');
            }

            const doc = forms[index];
            const data = doc.data();

            const caption = `📝 *Анкета специалиста*\n\n👤 Имя: ${data.name}\n🆔 ID: ${data.userId}\n🕒 ${new Date(data.timestamp).toLocaleString('ru-RU')}\n\n📄 *Описание:*\n${data.description}`;

            const inline_keyboard = [
                [
                    { text: '✅ Подтвердить', callback_data: `approve_profile_${doc.id}_${data.userId}` },
                    { text: '❌ Отклонить', callback_data: `reject_profile_${doc.id}` }
                ]
            ];

            if (index < forms.length - 1) {
                inline_keyboard.push([
                    { text: '➡️ Далее', callback_data: `next_profile_${index + 1}` }
                ]);
            }

            inline_keyboard.push([
                { text: '🔙 Назад в меню', callback_data: 'back_to_main_from_profiles' }
            ]);

            if (data.files && data.files.length > 0) {
                await this.bot.sendMediaGroup(chatId,
                    data.files.map((fileId) => ({
                        type: 'photo',
                        media: fileId
                    }))
                );
            }

            return this.bot.sendMessage(chatId, caption, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard }
            });

        } catch (error) {
            console.error('Ошибка при загрузке анкет:', error);
            return this.bot.sendMessage(chatId, '❌ Не удалось загрузить анкеты.');
        }
    }

    async approveProfile(docId, userId, chatId, messageId, session) {
        try {
            await db.collection('admins').doc(String(userId)).set({
                role: 'admin',
                approvedBy: session.name,
                timestamp: new Date().toISOString()
            });

            await db.collection('specialistForms').doc(docId).delete();

            await this.bot.deleteMessage(chatId, messageId);
            await this.bot.sendMessage(chatId, '✅ Анкета одобрена. Пользователь добавлен как админ.');

            // Уведомление пользователю
            try {
                await this.bot.sendMessage(userId, '✅ Ваша анкета одобрена! Вы добавлены в команду как администратор.');
                return sendMainMenu(this.bot, chatId, session.name, session.role);

            } catch (notifyErr) {
                console.warn(`Не удалось уведомить пользователя ${userId}:`, notifyErr.message);
            }

            return this.showNextProfile(chatId, session, 0);
        } catch (err) {
            console.error('Ошибка при подтверждении анкеты:', err);
            return this.bot.sendMessage(chatId, '❌ Ошибка при подтверждении анкеты.');
        }
    }

}

module.exports = ModerateProfilesHandler;
