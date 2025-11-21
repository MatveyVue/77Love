const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const token = '7784753596:AAFRSOreZUSN_w2-g6lhxRjKg1HUN6oa0tg'; // вставьте сюда ваш токен
const webhookUrl = 'https://<your-vercel-deployment-url>/api/webhook'; // вставьте сюда URL вашего деплоя
const forwardChatId = '-1002647773080';

const app = express();
app.use(express.json());

const bot = new TelegramBot(token);

// при старте — установите вебхук
// важно: В serverless нужно убедиться, что он вызывается только один раз, например, через глобальную переменную
let webhookSet = false;

app.all('*', async (req, res) => {
  if (!webhookSet) {
    try {
      await bot.setWebHook(webhookUrl);
      console.log('Webhook установлен');
      webhookSet = true;
    } catch (err) {
      console.error('Ошибка установки webhook:', err);
    }
  }

  const update = req.body;

  if (update.message) {
    const message = update.message;
    const chatId = message.chat.id;
    const user = message.from;
    const text = message.text || '';

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
      let replyMsg = 'Здравствуйте! Ваше сообщение отправлено в @nagpz.';
      if (text.toLowerCase().includes('как дела') && chatId < 0) {
        replyMsg = 'У меня все хорошо, спасибо! Надеюсь, у вас тоже.';
      }
      await bot.sendMessage(chatId, replyMsg);

      try {
        await bot.sendMessage(forwardChatId, text);
      } catch (err) {
        console.error('Ошибка при пересылке:', err);
      }
    }
  }
  res.sendStatus(200);
});

module.exports = app;
