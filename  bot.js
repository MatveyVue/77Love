const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process'); // Для доступа к process.env

// --- КОНФИГУРАЦИЯ ---
// Используйте переменные окружения для чувствительных данных!
const TELEGRAM_BOT_TOKEN = 6632695365:AAH234LsLWIcoCL5EzKy_kGyj18skhd5xCU; // Ваш токен бота
const FORWARD_TO_CHAT_ID = -1003482543725; // ID чата/канала для пересылки
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Публичный URL вашего сервера (например, https://your-domain.com или ngrok URL)
const PORT = process.env.PORT || 3000; // Порт, на котором будет слушать веб-сервер

const READY_REPLY_TEXT = "Здравствуйте! Ваше сообщение принято в обработку."; // Готовое сообщение-автоответ

// --- КОНЕЦ КОНФИГУРАЦИИ ---

// Базовая проверка конфигурации
if (!TELEGRAM_BOT_TOKEN || !FORWARD_TO_CHAT_ID || !WEBHOOK_URL) {
    console.error("Пожалуйста, настройте TELEGRAM_BOT_TOKEN, FORWARD_TO_CHAT_ID и WEBHOOK_URL в .env файле.");
    process.exit(1);
}

// Инициализация Telegram Bot
// Указываем 'polling: false' для работы в режиме вебхуков
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Создаем Express приложение
const app = express();
app.use(bodyParser.json()); // Для парсинга JSON-обновлений от Telegram

// --- Эндпоинт Вебхука ---
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body); // Обрабатываем входящее обновление от Telegram
    res.sendStatus(200); // Обязательно отвечаем Telegram HTTP 200 OK, чтобы он не переотправлял обновление
});

// --- Установка URL вебхука в Telegram ---
bot.setWebHook(`${WEBHOOK_URL}/webhook`)
    .then(() => console.log(`[INFO] Вебхук успешно установлен на: ${WEBHOOK_URL}/webhook`))
    .catch(e => console.error(`[ERROR] Ошибка при установке вебхука: ${e.message}`));

// --- Установка команд бота (отображаются в меню Telegram) ---
async function setBotCommands() {
    const commands = [
        { command: 'start', description: 'Начать общение с ботом' },
        { command: 'help', description: 'Показать информацию о боте и командах' },
    ];
    try {
        await bot.setMyCommands(commands);
        console.log('[INFO] Команды бота успешно установлены.');
    } catch (e) {
        console.error(`[ERROR] Не удалось установить команды бота: ${e.message}`);
    }
}
setBotCommands(); // Вызываем при старте бота

// --- Обработчики команд ---

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const chatType = msg.chat.type;

    if (chatType === 'private') {
        await bot.sendMessage(chatId, `Привет, <a href="tg://user?id=${user.id}">${user.first_name || user.username}</a>! Я бот-автоответчик. Напиши мне что-нибудь, и я отвечу и перешлю сообщение в чат поддержки.`, { parse_mode: 'HTML' });
        console.log(`[INFO] Отправлен ответ на /start в личный чат ${chatId}`);
    } else if (chatType === 'group' || chatType === 'supergroup') {
        // В группах обычно не отвечаем на /start всем, если нет упоминания
        console.log(`[INFO] Получена команда /start в групповом чате ${chatId}, ответ не отправлен.`);
    }
});

// Обработчик команды /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
Я бот, который:
1. Автоматически отвечает на ваши сообщения готовым текстом.
2. Пересылает каждое ваше сообщение в указанный чат поддержки.

Доступные команды:
/start - начать общение
/help - показать это сообщение
    `;
    await bot.sendMessage(chatId, helpText);
    console.log(`[INFO] Отправлен ответ на /help в чат ${chatId}`);
});

// --- Обработчик всех текстовых сообщений ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const userMessage = msg.text;

    // Игнорируем сообщения от самого бота
    if (user && user.is_bot) {
        return;
    }

    // Игнорируем команды (они обрабатываются onText)
    if (userMessage && userMessage.startsWith('/')) {
        return;
    }

    console.log(`[INFO] Получено сообщение в чате ${chatId} от ${user.first_name || user.username} (ID: ${user.id}): '${userMessage}'`);

    // --- 1. Отправка готового автоответа ---
    let replyText = READY_REPLY_TEXT;
    if (userMessage && userMessage.toLowerCase().includes("как дела") && msg.chat.type === 'private') {
        replyText = "У меня все хорошо, спасибо! Надеюсь, у вас тоже.";
    }

    try {
        await bot.sendMessage(chatId, replyText);
        console.log(`[INFO] Отправлен автоответ в чат ${chatId}`);
    } catch (e) {
        console.error(`[ERROR] Не удалось отправить автоответ в чат ${chatId}: ${e.message}`);
    }

    // --- 2. Пересылка сообщения в указанный чат/канал ---
    try {
        const senderInfo = user.username 
            ? `👤 От: ${user.first_name} ${user.last_name || ''} (@${user.username} - ${user.id})`
            : `👤 От: ${user.first_name} ${user.last_name || ''} (ID: ${user.id})`;

        let chatName;
        switch (msg.chat.type) {
            case 'private':
                chatName = "Личные сообщения";
                break;
            case 'group':
                chatName = `Группа: ${msg.chat.title}`;
                break;
            case 'supergroup':
                chatName = `Супергруппа: ${msg.chat.title}`;
                break;
            case 'channel':
                chatName = `Канал: ${msg.chat.title || msg.chat.username}`; 
                break;
            default:
                chatName = 'Неизвестный чат';
        }

        const chatInfo = `📍 В чате: ${chatName} (ID: ${chatId})`;
        const forwardedMessageText = `${senderInfo}\n${chatInfo}\n\n📜 Сообщение:\n${userMessage}`;

        await bot.sendMessage(FORWARD_TO_CHAT_ID, forwardedMessageText);
        console.log(`[INFO] Сообщение от ${user.id} переслано в чат ${FORWARD_TO_CHAT_ID}`);

    } catch (e) {
        console.error(`[ERROR] Не удалось переслать сообщение от ${user.id} в чат ${FORWARD_TO_TO_CHAT_ID}: ${e.message}`);
    }
});

// --- Запуск Вебхук-сервера ---
app.listen(PORT, () => {
    console.log(`[INFO] Вебхук-сервер запущен на порту ${PORT}`);
    console.log(`[INFO] Убедитесь, что ваш WEBHOOK_URL (${WEBHOOK_URL}) публично доступен и указывает на этот сервер.`);
    console.log(`[INFO] Для локальной разработки используйте ngrok: 'ngrok http ${PORT}' и укажите HTTPS URL в WEBHOOK_URL.`);
});

// Обработка ошибок бота (общие ошибки)
bot.on('webhook_error', (error) => {
    console.error('[ERROR] Ошибка вебхука:', error);
});

// Корректное завершение работы
process.once('SIGINT', () => bot.stopWebHook());
process.once('SIGTERM', () => bot.stopWebHook());