module.exports = {
    noAccess: '⛔ У вас нет доступа к админ панели',
    adminPanelInfo: '⚙️Доступные инструменты в нижнем меню',
    backToMain: 'Вы вернулись в главное меню.',

    enterAdminId: 'Введите Telegram ID нового администратора:',
    enterAdminName: 'Введите имя администратора:',
    selectRole: 'Выберите роль администратора:',
    enterDeleteId: 'Введите Telegram ID администратора для удаления:',

    adminAdded: (id, name, role) => `✅ Администратор добавлен:\nID: ${id}\nИмя: ${name}\nРоль: ${role}`,
    adminDeleted: (id) => `🗑️ Администратор с ID ${id} удалён.`,

    adminListEmpty: 'Список админов пуст.',
    adminListHeader: '📋 Список администраторов:\n\n',
    adminListItem: (id, name, role) => `👤 ID: ${id}\nИмя: ${name}\nРоль: ${role}\n\n`,

    enterPostText: '✍️ Отправьте сообщение (любого типа), которое хотите разослать:',
    enterNewPost: '✏️ Отправьте новое сообщение для рассылки:',
    postConfirmPrompt: '✅ Сообщение сохранено. Выберите действие:',
    noDraft: '⚠️ Вы ещё не отправили сообщение для рассылки.',
    noSubscribers: '⚠️ Нет пользователей для рассылки.',
    postSent: (count) => `✅ Пост успешно разослан ${count} пользователям.`,
    postCancelled: '❌ Рассылка отменена.',


};
