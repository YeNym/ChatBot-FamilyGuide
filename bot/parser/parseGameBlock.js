const fs = require('fs');
const readline = require('readline');
const db = require('../../firebase'); // путь к твоему firebase.js

const filePath = 'games.txt';
const data = fs.readFileSync(filePath, 'utf-8');

const categories = [
    'Общение',
    'Интеллект',
    'Речь',
    'Творчество',
    'Спорт',
    'Духовность'
];

// Вспомогательная функция: первая буква заглавная
const capitalizeFirstLetter = str => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

// Отображение текста локаций на внутренние коды
const mapLocation = {
    'Дом': 'Дом',
    'Улица': 'Улица',
    'Заведение': 'Заведение',
    'Со снегом': 'Со снегом',
    'Дом/Улица': 'Улица/Дом',
    'Улица/Дом': 'Улица/Дом'
};

// Парсинг одного блока игры
function parseGameBlock(block) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let name = '', age = '', location = '';
    const descriptionParts = [];

    for (const line of lines) {
        const cleanLine = line.replace(/^.*Игра:/, '').trim(); // удаляем всё до "Игра:"
        if (line.includes('🎯 Игра:') && cleanLine) {
            name = cleanLine;
        } else if (line.startsWith('👶 Возраст:')) {
            age = line.replace('👶 Возраст:', '').trim();
        } else if (line.startsWith('🏡 Локация:')) {
            let loc = line.replace('🏡 Локация:', '').trim();
            loc = capitalizeFirstLetter(loc);          // первая буква заглавная
            location = mapLocation[loc] || loc;       // нормализация через mapLocation
        } else {
            descriptionParts.push(line);
        }
    }

    const description = descriptionParts.join('\n\n');
    return { name, age, location, description };
}

async function main() {
    console.log('Выберите категорию:');
    categories.forEach((cat, idx) => console.log(`${idx + 1}. ${cat}`));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const categoryIndex = await new Promise(resolve => {
        rl.question('Введите номер категории: ', ans => resolve(parseInt(ans) - 1));
    });

    rl.close();

    if (categoryIndex < 0 || categoryIndex >= categories.length) {
        console.log('Неверная категория!');
        return;
    }

    const selectedCategory = categories[categoryIndex];
    console.log(`Выбрана категория: ${selectedCategory}`);

    // Разбиваем текст на блоки по номерам игр
    const gameBlocks = data.split(/\d+\./).filter(Boolean);

    for (const block of gameBlocks) {
        const gameData = parseGameBlock(block);
        if (!gameData.name) continue; // пропускаем пустые блоки

        gameData.category = capitalizeFirstLetter(selectedCategory);
        gameData.createdAt = new Date();

        try {
            await db.collection('games').add(gameData);
            console.log(`✅ Добавлено: ${gameData.name}`);
        } catch (err) {
            console.error('❌ Ошибка при добавлении игры:', err.message);
        }
    }

    console.log('Все игры добавлены в базу!');
}

main();
