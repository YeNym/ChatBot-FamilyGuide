const db = require('../../firebase');
const { getSession } = require('../utils/session');
const sendMainMenu = require('../views/MainMenu');

let initialized = false;
const mediaGroups = {}; // ВНЕ класса, глобально (или в памяти/redis)

class SpecialistFormHandler {
    constructor(bot) {
        if (initialized) return;
        initialized = true;

        this.bot = bot;

        bot.on('callback_query', this.handleCallbackQuery.bind(this));
        bot.on('message', this.handleMessage.bind(this));
    }

    async handleCallbackQuery(query) {
        const userId = query.from.id;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        const session = await getSession(userId);
        await this.bot.answerCallbackQuery(query.id);

        if (data === 'specialist') {
            session.step = 'filling_specialist_form';
            session.specialistFiles = [];
            session.specialistText = '';

            return this.bot.sendMessage(chatId, '📎 Прикрепите 7 фото или документов в **одном сообщении**, затем отправьте текст описания в следующем сообщении. После этого нажмите "✅ Отправить анкету".', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Отправить анкету', callback_data: 'submit_specialist_form' }],
                        [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_specialist' }]
                    ]
                }
            });
        }

        if (data === 'submit_specialist_form') {
            if (!session.specialistFiles || session.specialistFiles.length !== 7 || !session.specialistText) {
                return this.bot.sendMessage(chatId, '❗ Необходимо прикрепить ровно 7 файлов и ввести описание.');
            }

            try {
                await db.collection('specialistForms').add({
                    userId,
                    name: session.name || query.from.first_name,
                    description: session.specialistText,
                    files: session.specialistFiles,
                    timestamp: new Date().toISOString()
                });

                this.clearSession(session);
                await this.bot.sendMessage(chatId, '✅ Ваша анкета успешно отправлена!');
                return sendMainMenu(this.bot, chatId, session.name, session.role);
            } catch (error) {
                console.error('Ошибка при сохранении анкеты:', error);
                return this.bot.sendMessage(chatId, '❌ Не удалось сохранить анкету. Попробуйте позже.');
            }
        }

        if (data === 'back_to_main_from_specialist') {
            this.clearSession(session);
            await this.bot.deleteMessage(chatId, messageId);
            return sendMainMenu(this.bot, chatId, session.name, session.role);
        }
    }

    async handleMessage(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const session = await getSession(userId);

        if (session.step !== 'filling_specialist_form') return;

        // --- Обработка текстового описания ---
        if (msg.text) {
            if (!session.specialistFiles || session.specialistFiles.length !== 7) {
                return this.bot.sendMessage(chatId, '❗ Сначала прикрепите 7 файлов (в одном сообщении или альбоме).');
            }

            session.specialistText = msg.text;

            return this.bot.sendMessage(chatId, '📝 Описание сохранено. Нажмите "✅ Отправить анкету" для завершения.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Отправить анкету', callback_data: 'submit_specialist_form' }],
                        [{ text: '🔙 Назад в меню', callback_data: 'back_to_main_from_specialist' }]
                    ]
                }
            });
        }

        // --- Обработка фото/документов ---
        const mediaGroupId = msg.media_group_id;

        // Обработка альбома (несколько фото или файлов)
        if (mediaGroupId) {
            if (!mediaGroups[mediaGroupId]) {
                mediaGroups[mediaGroupId] = [];
            }

            const fileId = msg.photo
                ? msg.photo[msg.photo.length - 1].file_id
                : msg.document?.file_id;

            if (fileId) {
                mediaGroups[mediaGroupId].push(fileId);
            }

            // Ждём пока соберётся вся группа
            if (mediaGroups[mediaGroupId].length === 7) {
                session.specialistFiles = mediaGroups[mediaGroupId];
                delete mediaGroups[mediaGroupId];

                return this.bot.sendMessage(chatId, '📎 Файлы получены. Теперь отправьте текст описания анкеты отдельным сообщением.');
            }

            return; // Ждём остальные сообщения
        }

        // Одиночное фото или документ
        if (msg.photo || msg.document) {
            // Уже что-то прикрепили раньше
            if (session.specialistFiles.length > 0) {
                return this.bot.sendMessage(chatId, '⚠️ Все файлы нужно прикрепить **одним сообщением** или **в одном альбоме**. Очистите анкету и начните заново.');
            }

            const fileId = msg.photo
                ? msg.photo[msg.photo.length - 1].file_id
                : msg.document?.file_id;

            if (!fileId) return;

            session.specialistFiles = [fileId];

            return this.bot.sendMessage(chatId, '❗ Нужно прикрепить ровно 7 файлов. Сейчас загружено 1. Пожалуйста, прикрепите все 7 файлов в одном сообщении или альбоме.');
        }
    }
    clearSession(session) {
        session.step = null;
        session.specialistFiles = [];
        session.specialistText = '';
    }
}

module.exports = SpecialistFormHandler;
