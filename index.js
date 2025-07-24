require('dotenv').config();
const Bot = require('./bot/Bot');

new Bot(process.env.BOT_TOKEN);
