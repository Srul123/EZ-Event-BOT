import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { GuestModel } from '../../domain/campaigns/guest.model.js';
import { updateGuestRsvp } from '../../domain/campaigns/guest.service.js';
import { createRsvpGraphRunner } from '../../domain/rsvp-graph/index.js';
import type { GuestContext, EffectsPatch } from '../../domain/rsvp-graph/index.js';
import { nluAdapter } from '../adapters/nluAdapter.js';
import { nlgAdapter } from '../adapters/nlgAdapter.js';
import { logger } from '../../logger/logger.js';

interface BotSession {
  guest?: {
    guestId: string;
    campaignId: string;
    name: string;
    phone: string;
    rsvpStatus: string;
    headcount?: number;
    conversationState?: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
    lastResponseAt?: Date;
  };
  eventTitle?: string;
  eventDate?: string;
  headcountClarificationAttempts?: number;
  lastHeadcountClarificationReason?: 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN';
}

interface SessionContext extends Context<Update> {
  session?: BotSession;
}

const runGraph = createRsvpGraphRunner({
  nlu: nluAdapter,
  nlg: nlgAdapter,
  clock: { now: () => new Date() },
  logger,
});

// Module-level deduplication: prevents double-processing the same update when
// Telegraf's middleware chain runs guestMessageHandler after a command handler
// (e.g. /start fires both startHandler AND this handler), or on webhook retries.
const processedUpdateIds = new Set<number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

export async function guestMessageHandler(ctx: SessionContext): Promise<void> {
  if (!ctx.message || !('text' in ctx.message)) {
    return;
  }

  const messageText = ctx.message.text;

  // Skip Telegram commands — they are handled by dedicated command handlers.
  // Without this check, bot.on('text') also fires for /start, /help, etc.,
  // causing a spurious RSVP response immediately after the welcome message.
  if (messageText.startsWith('/')) {
    return;
  }

  // Deduplicate updates to guard against webhook retries or middleware re-entry.
  const updateId = ctx.update.update_id;
  if (processedUpdateIds.has(updateId)) {
    logger.warn({ updateId }, 'Skipping duplicate update delivery');
    return;
  }
  processedUpdateIds.add(updateId);
  setTimeout(() => processedUpdateIds.delete(updateId), DEDUP_WINDOW_MS);

  if (!ctx.session?.guest) {
    ctx.reply('כדי להתחיל, פתח את הקישור האישי שקיבלת להזמנה.');
    return;
  }

  try {
    const guest = await GuestModel.findById(ctx.session.guest.guestId);
    if (!guest) {
      logger.error({ guestId: ctx.session.guest.guestId }, 'Guest not found in database');
      ctx.reply('שגיאה: לא נמצא מידע עליך במערכת. אנא פתח את הקישור האישי שלך שוב.');
      return;
    }

    // conversationState sync (DB is source of truth)
    let conversationState: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT' = 'DEFAULT';
    if (ctx.session.guest.conversationState) {
      conversationState = ctx.session.guest.conversationState;
    } else if (guest.conversationState) {
      conversationState = guest.conversationState;
    }
    if (ctx.session.guest.conversationState !== guest.conversationState) {
      conversationState = guest.conversationState || 'DEFAULT';
    }

    const guestContext: GuestContext = {
      guestId: guest._id.toString(),
      guestName: ctx.session.guest.name,
      eventTitle: ctx.session.eventTitle,
      eventDate: ctx.session.eventDate,
      locale: 'he',
      currentRsvpStatus: guest.rsvpStatus as GuestContext['currentRsvpStatus'],
      currentHeadcount: guest.headcount ?? null,
      conversationState,
      clarificationAttempts: ctx.session.headcountClarificationAttempts ?? 0,
      lastClarificationReason: ctx.session.lastHeadcountClarificationReason,
    };

    const { replyText, effects } = await runGraph({
      messageText,
      guestContext,
    });

    // Apply EffectsPatch -- only write keys that are present
    await applyEffectsPatch(ctx.session.guest.guestId, effects, ctx);

    // Sync session from patch
    if (effects.conversationState !== undefined && ctx.session.guest) {
      ctx.session.guest.conversationState = effects.conversationState;
    }
    if (effects.clarificationAttempts !== undefined) {
      ctx.session.headcountClarificationAttempts = effects.clarificationAttempts;
    }
    if (effects.lastClarificationReason !== undefined) {
      ctx.session.lastHeadcountClarificationReason = effects.lastClarificationReason;
    }

    // Reset clarification tracking when returning to DEFAULT from awaiting
    if (
      effects.conversationState === 'DEFAULT' &&
      conversationState === 'YES_AWAITING_HEADCOUNT'
    ) {
      ctx.session.headcountClarificationAttempts = undefined;
      ctx.session.lastHeadcountClarificationReason = undefined;
    }

    ctx.reply(replyText);
  } catch (error) {
    logger.error({ error, guestId: ctx.session.guest.guestId }, 'Error handling guest message');
    ctx.reply('שגיאה בעיבוד ההודעה. אנא נסה שוב.');
  }
}

async function applyEffectsPatch(
  guestId: string,
  effects: EffectsPatch,
  ctx: SessionContext,
): Promise<void> {
  const updateParams: Record<string, unknown> = {};

  if (effects.rsvpStatus !== undefined) updateParams.rsvpStatus = effects.rsvpStatus;
  if (effects.headcount !== undefined) updateParams.headcount = effects.headcount;
  if (effects.conversationState !== undefined) updateParams.conversationState = effects.conversationState;
  if (effects.lastResponseAt !== undefined) updateParams.lastResponseAt = effects.lastResponseAt;

  if (Object.keys(updateParams).length === 0) return;

  const updatedGuest = await updateGuestRsvp(guestId, updateParams);

  if (ctx.session?.guest) {
    ctx.session.guest = {
      guestId: updatedGuest._id.toString(),
      campaignId: updatedGuest.campaignId.toString(),
      name: updatedGuest.name,
      phone: updatedGuest.phone,
      rsvpStatus: updatedGuest.rsvpStatus,
      headcount: updatedGuest.headcount,
      conversationState: updatedGuest.conversationState || 'DEFAULT',
      lastResponseAt: updatedGuest.lastResponseAt,
    };
  }
}
