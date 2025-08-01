module.exports = {
    contentMenu: [
        [
            { text: '🎮 Добавить игру', callback_data: 'add_game' },
            // { text: '📘 Добавить гайд', callback_data: 'add_guide' }
        ],
        [
            { text: '📨 Ответить на вопросы', callback_data: 'answer_questions' }
        ],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ],
    adminMenu: [
        [
            { text: '📢 Создать пост', callback_data: 'create_post' },
            { text: '⚙️ Админ панель', callback_data: 'open_admin_panel' }
        ],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ],
    moderationMenu: [
        [
            { text: '🧾 Предложения', callback_data: 'view_profiles' },
            { text: '🎮 Новые игры', callback_data: 'moderate_games' }
        ],
        [
            // { text: '📘 Новые гайды', callback_data: 'review_guides' },
            { text: '🗑 Удалить игру', callback_data: 'delete_game' }
        ],
        [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ]
};
