import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = './src/Languages'; // <-- ПУТЬ К ПАПКЕ С JSON
const RU_FILE = 'RU.json';

/**
 * Рекурсивно синхронизирует объект по эталону (RU)
 * - порядок как в RU
 * - лишние ключи удаляются
 * - отсутствующие НЕ добавляются
 */
function syncByTemplate(template, target) {
    if (typeof template !== 'object' || template === null) {
        return target;
    }

    const result = {};

    for (const key of Object.keys(template)) {
        if (!(key in target)) continue;

        const tVal = template[key];
        const vVal = target[key];

        if (typeof tVal === 'object' && tVal !== null && typeof vVal === 'object' && vVal !== null) {
            result[key] = syncByTemplate(tVal, vVal);
        } else {
            result[key] = vVal;
        }
    }

    return result;
}

function run() {
    const ruPath = path.join(LOCALES_DIR, RU_FILE);

    if (!fs.existsSync(ruPath)) {
        console.error('RU.json не найден');
        process.exit(1);
    }

    const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

    const files = fs.readdirSync(LOCALES_DIR)
        .filter(f => f.endsWith('.json') && f !== RU_FILE);

    console.log(`Найдено языков: ${files.length}`);

    for (const file of files) {
        const filePath = path.join(LOCALES_DIR, file);

        try {
            const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            const synced = syncByTemplate(ru, json);

            fs.writeFileSync(
                filePath,
                JSON.stringify(synced, null, 4) + '\n',
                'utf8'
            );

            console.log(`✔ ${file} синхронизирован`);
        } catch (_) {
        }
    }

    console.log('Готово.');
}

run();
