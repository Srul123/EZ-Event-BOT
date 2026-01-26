import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { GuestModel } from '../../domain/campaigns/guest.model.js';
import { updateGuestRsvp } from '../../domain/campaigns/guest.service.js';
import { handleIncomingTextMessage } from '../rsvp/rsvpFlow.js';
import type { FlowContext } from '../rsvp/types.js';
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
  // Lightweight clarification attempt tracking (session-only, not persisted to DB)
  headcountClarificationAttempts?: number;
  lastHeadcountClarificationReason?: 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN';
}

interface SessionContext extends Context<Update> {
  session?: BotSession;
}

export async function guestMessageHandler(ctx: SessionContext): Promise<void> {
  // Only handle text messages (ignore stickers/media)
  if (!ctx.message || !('text' in ctx.message)) {
    return;
  }

  const messageText = ctx.message.text;

  // Check if guest is in session
  if (!ctx.session?.guest) {
    ctx.reply('כדי להתחיל, פתח את הקישור האישי שקיבלת להזמנה.');
    return;
  }

  try {
    // Fetch current guest from DB (source of truth)
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

    // If mismatch exists: override session with DB value
    if (ctx.session.guest.conversationState !== guest.conversationState) {
      conversationState = guest.conversationState || 'DEFAULT';
    }

    // Build flowContext with clarification attempt tracking from session
    const flowContext: FlowContext = {
      guestName: ctx.session.guest.name,
      eventTitle: ctx.session.eventTitle,
      eventDate: ctx.session.eventDate,
      locale: 'he',
      currentRsvpStatus: guest.rsvpStatus as FlowContext['currentRsvpStatus'],
      currentHeadcount: guest.headcount ?? null,
      conversationState,
      headcountClarificationAttempts: ctx.session.headcountClarificationAttempts,
      lastHeadcountClarificationReason: ctx.session.lastHeadcountClarificationReason,
    };

    // Call RSVP flow
    const { action, replyText } = await handleIncomingTextMessage({
      guest,
      messageText,
      flowContext,
    });

    // Persist updates (only if action type is not ACK)
    if (action.type !== 'ACK') {
      const updateParams: Parameters<typeof updateGuestRsvp>[1] = {
        lastResponseAt: action.updates.lastResponseAt,
        conversationState: action.nextState,
      };

      if (action.type === 'SET_RSVP' || action.type === 'ASK_HEADCOUNT') {
        if (action.updates.rsvpStatus !== undefined) {
          updateParams.rsvpStatus = action.updates.rsvpStatus;
        }
        if (action.type === 'SET_RSVP' && 'headcount' in action.updates) {
          updateParams.headcount = action.updates.headcount;
        }
      }

      const updatedGuest = await updateGuestRsvp(ctx.session.guest.guestId, updateParams);

      // Update session with returned guest data
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
    } else {
      // For ACK, only update lastResponseAt if provided
      if (action.updates.lastResponseAt) {
        const updatedGuest = await updateGuestRsvp(ctx.session.guest.guestId, {
          lastResponseAt: action.updates.lastResponseAt,
        });

        // Update session lastResponseAt
        if (ctx.session.guest) {
          ctx.session.guest.lastResponseAt = updatedGuest.lastResponseAt;
        }
      }
    }

    // Update conversationState in session after flow decision
    if (ctx.session.guest) {
      ctx.session.guest.conversationState = action.nextState;
    }

    // Update clarification attempt tracking in session (if flow context was updated)
    if (flowContext.headcountClarificationAttempts !== undefined) {
      ctx.session.headcountClarificationAttempts = flowContext.headcountClarificationAttempts;
    }
    if (flowContext.lastHeadcountClarificationReason !== undefined) {
      ctx.session.lastHeadcountClarificationReason = flowContext.lastHeadcountClarificationReason;
    }

    // Reset clarification attempts when leaving YES_AWAITING_HEADCOUNT state
    if (action.nextState === 'DEFAULT' && conversationState === 'YES_AWAITING_HEADCOUNT') {
      ctx.session.headcountClarificationAttempts = undefined;
      ctx.session.lastHeadcountClarificationReason = undefined;
    }

    // Always ensure deterministic reply
    ctx.reply(replyText);
  } catch (error) {
    logger.error({ error, guestId: ctx.session.guest.guestId }, 'Error handling guest message');
    ctx.reply('שגיאה בעיבוד ההודעה. אנא נסה שוב.');
  }
}
