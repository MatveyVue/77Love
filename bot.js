const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const token = '7784753596:AAFRSOreZUSN_w2-g6lhxRjKg1HUN6oa0tg'; // Вставьте сюда токен
const webhookUrl = 'https://your.domain.com:port/path'; // Укажите ваш публичный HTTPS URL для вебхука
const forwardChatId = '-1002647773080'; // ID чата для пересылки

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

// Устанавливаем вебхук
bot.setWebHook(webhookUrl).then(() => {
  console.log('Webhook установлен');
}).catch(console.error);

// Обработка входящих обновлений
app.post('/webhook', async (req, res) => {
  const update = req.body;

  // Обработка команд /start и /help
  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text || '';

    // Обработка команд
    if (text.startsWith('/start')) {
      const reply = chatId > 0
        ? `Привет, ${user.is_bot ? '' : user.first_name}! Я бот-автоответчик. Напиши мне что-нибудь, и я перешлю сообщение в @nagpz.`
        : 'Я здесь, чтобы отвечать и пересылать сообщения!';
      await bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });
    } else if (text.startsWith('/help')) {
      const helpText = `
Я бот, который:
1. Пересылает каждое ваше сообщение анонимно в чат @nagpz.

Доступные команды:
/start - начать общение
/help - показать это сообщение
      `;
      await bot.sendMessage(chatId, helpText);
    } else {
      // Обработка обычных сообщений
      // 1. автоответ
      let replyMsg = 'Здравствуйте! Ваше сообщение отправлено в @nagpz.';
      if (text.toLowerCase().includes('как дела') && chatId < 0) { // В группе или канале
        replyMsg = 'У меня все хорошо, спасибо! Надеюсь, у вас тоже.';
      }
      await bot.sendMessage(chatId, replyMsg);

      // 2. пересылка
      try {
        await bot.sendMessage(forwardChatId, text);
      } catch (err) {
        console.error('Ошибка при пересылке:', err);
      }
    }
  }
  res.sendStatus(200);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
