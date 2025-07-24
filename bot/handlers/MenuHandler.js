const sendMainMenu = require('../views/MainMenu');
const menus = require('../views/menus');
const { checkAdminRole } = require('../utils/utils');

class MenuHandler {
    constructor(bot) {
        this.bot = bot;

        bot.on('callback_query', async (query) => {
            const { data, message, from } = query;
            const chatId = message.chat.id;
            const userId = from.id;

            const check = await checkAdminRole(userId, 'user');
            const role = check.ok ? check.data.role : 'user';
            const name = check.data?.name || from.first_name || '';

            if (data === 'back_to_main') {
                return sendMainMenu(bot, chatId, name, role, message.message_id);
            }


            const menuMap = {
                open_content_menu: menus.contentMenu,
                open_admin_menu: menus.adminMenu,
                open_moderation_menu: menus.moderationMenu
            };

            if (menuMap[data]) {
                return this.bot.editMessageReplyMarkup(
                    { inline_keyboard: menuMap[data] },
                    { chat_id: chatId, message_id: message.message_id }
                );
            }

            return bot.answerCallbackQuery(query.id, { text: 'Неизвестная команда.', show_alert: false });
        });
    }
}

module.exports = MenuHandler;
