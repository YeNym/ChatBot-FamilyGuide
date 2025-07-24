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
                { text: '🗣 Общение', callback_data: 'set_game_category_Communication' },
                { text: '🧠 Интеллект', callback_data: 'set_game_category_Cognitive' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'set_game_category_Speech' },
                { text: '🎨 Творчество', callback_data: 'set_game_category_Artistic' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'set_game_category_Physical' },
                { text: '🧘 Духовность', callback_data: 'set_game_category_Spiritual' }
            ]
        ]
    },
    filterCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'filter_game_category_Communication' },
                { text: '🧠 Интеллект', callback_data: 'filter_game_category_Cognitive' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'filter_game_category_Speech' },
                { text: '🎨 Творчество', callback_data: 'filter_game_category_Artistic' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'filter_game_category_Physical' },
                { text: '🧘 Духовность', callback_data: 'filter_game_category_Spiritual' }
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
                { text: '🗣 Общение', callback_data: 'search_game_category_Communication' },
                { text: '🧠 Интеллект', callback_data: 'search_game_category_Cognitive' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'search_game_category_Speech' },
                { text: '🎨 Творчество', callback_data: 'search_game_category_Artistic' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'search_game_category_Physical' },
                { text: '🧘 Духовность', callback_data: 'search_game_category_Spiritual' }
            ]
        ]
    },
    editCategoryKeyboard: {
        inline_keyboard: [
            [
                { text: '🗣 Общение', callback_data: 'update_category_Communication' },
                { text: '🧠 Интеллект', callback_data: 'update_category_Cognitive' }
            ],
            [
                { text: '🗨 Речь', callback_data: 'update_category_Speech' },
                { text: '🎨 Творчество', callback_data: 'update_category_Artistic' }
            ],
            [
                { text: '🏃 Спорт', callback_data: 'update_category_Physical' },
                { text: '🧘 Духовность', callback_data: 'update_category_Spiritual' }
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

    cancelKeyboard: {
        inline_keyboard: [
            [{ text: '❌ Отменить', callback_data: 'cancel_game_creation' }]
        ]
    }




};
