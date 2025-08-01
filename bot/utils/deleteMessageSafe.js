// utils/bot.js
async function deleteMessageSafe(bot, chatId, messageId) {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (e) {
        console.warn('⚠ Не удалось удалить сообщение:', e.message);
    }
}

module.exports = { deleteMessageSafe };
