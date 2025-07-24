const { checkAdminRole } = require('../utils/utils');
const db = require('../../firebase');
const sendMainMenu = require('../views/MainMenu');

class StartCommand {
    constructor(bot) {
        this.bot = bot;

        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            const name = msg.from.first_name || 'Пользователь';

            console.log('Команда /start сработала от:', userId);

            const userRef = db.collection('users').doc(userId.toString());
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                await userRef.set({
                    name,
                    createdAt: new Date().toISOString()
                });
                console.log(`➕ Новый пользователь добавлен: ${userId}`);
            }

            const check = await checkAdminRole(userId, 'user');
            const role = check.ok ? check.data.role : 'user';
            return sendMainMenu(bot, chatId, name, role);
        });
    }
}

module.exports = StartCommand;
