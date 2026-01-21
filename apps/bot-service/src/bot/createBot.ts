import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';

export function createBot(): Telegraf {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  bot.command('start', (ctx) => {
    ctx.reply('Welcome! This is the EZ-Event bot. Use /help to see available commands.');
  });

  bot.command('help', (ctx) => {
    ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this help message');
  });

  return bot;
}
