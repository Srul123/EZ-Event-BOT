import { Telegraf, session, type Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { env } from '../config/env.js';
import type { GuestSessionData } from '../domain/campaigns/guest-session.service.js';
import { startHandler } from './handlers/start.handler.js';
import { helpHandler } from './handlers/help.handler.js';
import { guestMessageHandler } from './handlers/guestMessage.handler.js';

interface BotSession {
  guest?: GuestSessionData;
  eventTitle?: string;
  eventDate?: string;
}

interface SessionContext extends Context<Update> {
  session?: BotSession;
}

export function createBot(): Telegraf<SessionContext> {
  const bot = new Telegraf<SessionContext>(env.TELEGRAM_BOT_TOKEN);

  // Initialize session middleware with type
  bot.use(session<BotSession, SessionContext>());

  // Wire handlers
  bot.start(startHandler);
  bot.command('help', helpHandler);
  bot.on('text', guestMessageHandler);

  return bot;
}
