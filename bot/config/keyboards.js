module.exports = {
    adminPanelKeyboard: {
        keyboard: [
            ['➕ Добавить админа', '🗑️ Удалить админа'],
            ['📋 Список админов'],
            ['🔙 Назад']
        ],
        resize_keyboard: true
    },

    selectRoleKeyboard: {
        inline_keyboard: [
            [
                { text: '🛡 Суперадмин', callback_data: 'set_role_superadmin' },
                { text: '⚙️ Админ', callback_data: 'set_role_admin' },
                { text: '🧾 Модератор', callback_data: 'set_role_moderator' }
            ]
        ]
    },
    gameCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'set_game_category_Общение' },
                { text: '🧠 Интеллект', callback_data: 'set_game_category_Ителлект' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'set_game_category_Речь' },
                { text: '🎨 Творчество', callback_data: 'set_game_category_Творчество' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'set_game_category_Спорт' },
                { text: '🧘 Духовность', callback_data: 'set_game_category_Духовность' }
            ]
        ]
    },
    filterCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'filter_game_category_Общение' },
                { text: '🧠 Интеллект', callback_data: 'filter_game_category_Ителлект' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'filter_game_category_Речь' },
                { text: '🎨 Творчество', callback_data: 'filter_game_category_Творчество' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'filter_game_category_Спорт' },
                { text: '🧘 Духовность', callback_data: 'filter_game_category_Духовность' }
            ]
        ]
    },

    searchAgeKeyboard: {
        inline_keyboard: [
            [
                { text: '0+', callback_data: 'search_game_age_0' },
                { text: '3+', callback_data: 'search_game_age_3' }
            ],
            [
                { text: '6+', callback_data: 'search_game_age_6' },
                { text: '12+', callback_data: 'search_game_age_12' }
            ]
        ]
    },
    searchCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'search_game_category_Общение' },
                { text: '🧠 Интеллект', callback_data: 'search_game_category_Ителлект' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'search_game_category_Речь' },
                { text: '🎨 Творчество', callback_data: 'search_game_category_Творчество' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'search_game_category_Спорт' },
                { text: '🧘 Духовность', callback_data: 'search_game_category_Духовность' }
            ]
        ]
    },
    editCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'update_category_Общение' },
                { text: '🧠 Интеллект', callback_data: 'update_category_Ителлект' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'update_category_Речь' },
                { text: '🎨 Творчество', callback_data: 'update_category_Творчество' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'update_category_Спорт' },
                { text: '🧘 Духовность', callback_data: 'update_category_Духовность' }
            ]
        ]
    },

    editAgeKeyboard: {
        inline_keyboard: [
            [{ text: '0+', callback_data: 'update_age_0' }],
            [{ text: '3+', callback_data: 'update_age_3' }],
            [{ text: '6+', callback_data: 'update_age_6' }],
            [{ text: '12+', callback_data: 'update_age_12' }]
        ]
    },
    gameAgeKeyboard: {
        inline_keyboard: [
            [
                { text: '0+', callback_data: 'set_game_age_0' },
                { text: '3+', callback_data: 'set_game_age_3' }
            ],
            [
                { text: '6+', callback_data: 'set_game_age_6' },
                { text: '12+', callback_data: 'set_game_age_12' }
            ]
        ]
    },
    filterAgeKeyboard: {
        inline_keyboard: [
            [
                { text: '0+', callback_data: 'filter_game_age_0' },
                { text: '3+', callback_data: 'filter_game_age_3' }
            ],
            [
                { text: '6+', callback_data: 'filter_game_age_6' },
                { text: '12+', callback_data: 'filter_game_age_12' }
            ]
        ]
    },
    backKeyboard: {
        inline_keyboard: [
            [{ text: '❌ Отменить', callback_data: 'backKeyboard_menu' }]
        ]
    },

    cancelKeyboard: {
        inline_keyboard: [
            [{ text: '❌ Отменить', callback_data: 'cancel_game_creation' }]
        ]
    }




};
