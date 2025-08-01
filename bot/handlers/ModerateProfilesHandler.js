const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');

let initialized = false;

class ModerateProfilesHandler {
    constructor(bot) {
        if (initialized) return;
        initialized = true;

        this.bot = bot;
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
    }

    async handleCallbackQuery(query) {
        const { id, from, message, data } = query;
        const chatId = message.chat.id;
        const messageId = message.message_id;
        const userId = from.id;

        const session = await getSession(userId);
        await this.safeAnswerCallback(id);

        switch (true) {
            case data === 'view_profiles':
                return this.showNextProfile(chatId, session, 0);

            case data.startsWith('next_profile_'): {
                const index = parseInt(data.split('_')[2]);
                return this.showNextProfile(chatId, session, index);
            }

            case data.startsWith('approve_profile_'): {
                const [_, __, docId, targetUserId] = data.split('_');
                return this.approveProfile(docId, targetUserId, chatId, messageId, session);
            }

            case data.startsWith('reject_profile_'): {
                const docId = data.replace('reject_profile_', '');
                return this.rejectProfile(docId, chatId, messageId, session);
            }

            case data === 'back_to_main_from_profiles':
                await this.safeDeleteMessage(chatId, messageId);
                return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    async showNextProfile(chatId, session, index = 0) {
        try {
            const snapshot = await db.collection('specialistForms').orderBy('timestamp', 'asc').get();
            const forms = snapshot.docs;

            if (forms.length === 0) {
                return this.bot.sendMessage(chatId, '❌ Нет новых анкет.');
                // return sendMainMenu(this.bot, chatId, session.name, session.role);
            }

            if (index >= forms.length) {
                return this.bot.sendMessage(chatId, '📭 Больше нет анкет.');
            }

            const doc = forms[index];
            const data = doc.data();
            session.currentProfileIndex = index;

            const caption = `📝 *Анкета специалиста*\n\n👤 Имя: ${data.name}\n🆔 ID: ${data.userId}\n🕒 ${new Date(data.timestamp).toLocaleString('ru-RU')}\n\n📄 *Описание:*\n${data.description}`;

            const inline_keyboard = [
                [
                    { text: '✅ Подтвердить', callback_data: `approve_profile_${doc.id}_${data.userId}` },
                    { text: '❌ Отклонить', callback_data: `reject_profile_${doc.id}` }
                ]
            ];

            if (index < forms.length - 1) {
                inline_keyboard.push([{ text: '➡️ Далее', callback_data: `next_profile_${index + 1}` }]);
            }

            inline_keyboard.push([{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_profiles' }]);

            await this.sendMediaGroupSafe(chatId, data.files);

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
            // Получаем данные анкеты
            const docSnap = await db.collection('specialistForms').doc(docId).get();
            if (!docSnap.exists) {
                return this.bot.sendMessage(chatId, '❌ Анкета не найдена.');
            }

            const formData = docSnap.data();

            // Добавляем в новую коллекцию
            await db.collection('approvedSpecialists').add({
                userId,
                name: formData.name,
                description: formData.description,
                files: formData.files || [],
                approvedBy: session.name,
                approvedAt: new Date().toISOString()
            });
            //
            // await db.collection('specialistForms').doc(docId).delete();
            await this.safeDeleteMessage(chatId, messageId);
            await this.bot.sendMessage(chatId, '✅ Заявка одобрена.');

            // Уведомление пользователю
            try {
                await this.bot.sendMessage(userId, '✅ Ваша заявка была рассмотрена! Скоро мы свяжемся с вами.');
            } catch (notifyErr) {
                console.warn(`Не удалось уведомить пользователя ${userId}:`, notifyErr.message);
            }

            return this.showNextAvailableProfile(chatId, session);
        } catch (err) {
            console.error('Ошибка при подтверждении анкеты:', err);
            return this.bot.sendMessage(chatId, '❌ Ошибка при подтверждении анкеты.');
        }
    }


    async rejectProfile(docId, chatId, messageId, session) {
        try {
            const doc = await db.collection('specialistForms').doc(docId).get();
            if (!doc.exists) return;

            const form = doc.data();
            await db.collection('specialistForms').doc(docId).delete();
            await this.safeDeleteMessage(chatId, messageId);
            await this.bot.sendMessage(chatId, '❌ Анкета отклонена.');

            try {
                await this.bot.sendMessage(form.userId, '❌ Ваша анкета была отклонена. Вы можете подать заново позже.');
            } catch (notifyErr) {
                console.warn(`Не удалось уведомить пользователя ${form.userId}:`, notifyErr.message);
            }

            return this.showNextAvailableProfile(chatId, session);
        } catch (err) {
            console.error('Ошибка при отклонении анкеты:', err);
            return this.bot.sendMessage(chatId, '❌ Ошибка при отклонении анкеты.');
        }
    }

    async showNextAvailableProfile(chatId, session) {
        const snapshot = await db.collection('specialistForms').orderBy('timestamp', 'asc').get();
        const remaining = snapshot.docs;
        const nextIndex = remaining.length === 0 ? null : Math.min(remaining.length - 1, session.currentProfileIndex ?? 0);

        if (nextIndex === null) {
            await this.bot.sendMessage(chatId, '✅ Все анкеты рассмотрены.');
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }

        return this.showNextProfile(chatId, session, nextIndex);
    }

    async sendMediaGroupSafe(chatId, files) {
        if (!Array.isArray(files) || files.length === 0) return;

        const mediaGroup = files
            .filter(fileId => typeof fileId === 'string' && fileId.length > 5)
            .slice(0, 10)
            .map(fileId => ({ type: 'photo', media: fileId }));

        if (mediaGroup.length === 0) return;

        try {
            await this.bot.sendMediaGroup(chatId, mediaGroup);
        } catch (err) {
            console.error('❌ Ошибка при отправке mediaGroup:', err.message);
        }
    }

    async safeDeleteMessage(chatId, messageId) {
        try {
            await this.bot.deleteMessage(chatId, messageId);
        } catch (err) {
            console.warn('⚠ Не удалось удалить сообщение:', err.message);
        }
    }

    async safeAnswerCallback(callbackId) {
        try {
            await this.bot.answerCallbackQuery(callbackId);
        } catch (err) {
            console.warn('⚠ Ошибка answerCallbackQuery:', err.message);
        }
    }
}

module.exports = ModerateProfilesHandler;