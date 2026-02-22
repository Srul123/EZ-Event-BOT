import { interpretMessage } from '../rsvp/interpret/index.js';
import { interpretHeadcountOnly } from '../rsvp/interpret/headcountOnly.js';
import type { NluPort } from '../../domain/rsvp-graph/ports.js';
import type { GuestContext } from '../../domain/rsvp-graph/types.js';
import type { FlowContext } from '../rsvp/types.js';

function toFlowContext(ctx: GuestContext): FlowContext {
  return {
    guestName: ctx.guestName,
    eventTitle: ctx.eventTitle,
    eventDate: ctx.eventDate,
    locale: ctx.locale,
    currentRsvpStatus: ctx.currentRsvpStatus,
    currentHeadcount: ctx.currentHeadcount,
    conversationState: ctx.conversationState,
    headcountClarificationAttempts: ctx.clarificationAttempts,
    lastHeadcountClarificationReason: ctx.lastClarificationReason,
  };
}

export const nluAdapter: NluPort = {
  async interpretMessage(text, context) {
    return interpretMessage(text, toFlowContext(context));
  },

  async interpretHeadcountOnly(text, language) {
    return interpretHeadcountOnly(text, language);
  },
};
