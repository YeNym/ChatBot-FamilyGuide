module.exports = function sendMainMenu(bot, chatId, name = '', role = 'user', messageId = null) {
    const inline_keyboard = [
        [
            { text: '🎮 Список игр', callback_data: 'view_games' },
            { text: '❓ Задать вопрос', callback_data: 'ask_question' }
        ],
        [
            { text: '🤝 Сотрудничество', callback_data: 'specialist' },
            { text: '🔍 Поиск игры', callback_data: 'search_game_by_name' },
        ]
    ];

    if (['admin', 'moderator', 'superadmin'].includes(role)) {
        inline_keyboard.push([
            { text: '📁 Контент', callback_data: 'open_content_menu' }
        ]);
    }

    if (['moderator', 'superadmin'].includes(role)) {
        inline_keyboard.push([
            { text: '🧾 Модерация', callback_data: 'open_moderation_menu' }
        ]);
    }

    if (role === 'superadmin') {
        inline_keyboard.push([
            { text: '🛠 Администрирование', callback_data: 'open_admin_menu' }
        ]);
    }

    const text = `Выберите действие:`;

    if (messageId) {
        return bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: { inline_keyboard }
        });
    }

    return bot.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard }
    });
};
