const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');

class Bot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
        this.loadCommands();
        this.loadHandlers();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        fs.readdirSync(commandsPath).forEach(file => {
            const CommandClass = require(path.join(commandsPath, file));
            new CommandClass(this.bot);
        });
    }

    loadHandlers() {
        const handlersPath = path.join(__dirname, 'handlers');
        fs.readdirSync(handlersPath).forEach(file => {
            const HandlerClass = require(path.join(handlersPath, file));
            if (typeof HandlerClass === 'function') {
                new HandlerClass(this.bot);
            }else{
                console.warn(`[HandlerClass] ${file} не экспортирует класс и был пропущен`);
            }
        });
    }
}

module.exports = Bot;
