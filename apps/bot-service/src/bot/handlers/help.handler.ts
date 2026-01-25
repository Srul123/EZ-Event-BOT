import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import type { GuestSessionData } from '../../domain/campaigns/guest-session.service.js';

interface BotSession {
  guest?: GuestSessionData;
}

interface SessionContext extends Context<Update> {
  session?: BotSession;
}

export function helpHandler(ctx: SessionContext): void {
  const guestName = ctx.session?.guest?.name;

  if (guestName) {
    ctx.reply(`Hi ${guestName}! Available commands:\n/start - Start the bot\n/help - Show this help message`);
  } else {
    ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this help message');
  }
}
