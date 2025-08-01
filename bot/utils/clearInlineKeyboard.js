async function clearInlineKeyboard(bot, chatId, messageId) {
    try {
        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: messageId }
        );
    } catch (err) {
        console.warn('⚠ Не удалось очистить клавиатуру:', err.message);
    }
}
