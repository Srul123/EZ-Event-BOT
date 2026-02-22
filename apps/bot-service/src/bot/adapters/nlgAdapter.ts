import { composeReply } from '../rsvp/respond/index.js';
import { buildHeadcountClarificationQuestion } from '../rsvp/clarificationQuestions.js';
import type { NlgPort } from '../../domain/rsvp-graph/ports.js';
import type { Action as GraphAction, GuestContext, Interpretation } from '../../domain/rsvp-graph/types.js';
import type { Action as BotAction, FlowContext } from '../rsvp/types.js';

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

function toBotAction(action: GraphAction): BotAction {
  switch (action.type) {
    case 'SET_RSVP':
      return {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: action.rsvpStatus,
          headcount: action.headcount,
          lastResponseAt: new Date(),
        },
      };
    case 'ASK_HEADCOUNT':
      return {
        type: 'ASK_HEADCOUNT',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: { rsvpStatus: 'YES', lastResponseAt: new Date() },
      };
    case 'CLARIFY_INTENT':
      return {
        type: 'CLARIFY',
        nextState: 'DEFAULT',
        updates: { lastResponseAt: new Date() },
      };
    case 'ACK_NO_CHANGE':
      return {
        type: 'ACK',
        nextState: 'DEFAULT',
        updates: { lastResponseAt: new Date() },
      };
    case 'CLARIFY_HEADCOUNT':
      return {
        type: 'CLARIFY',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: { lastResponseAt: new Date() },
      };
    case 'STOP_WAITING_FOR_HEADCOUNT':
      return {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: { rsvpStatus: 'YES', headcount: null, lastResponseAt: new Date() },
      };
  }
}

export const nlgAdapter: NlgPort = {
  async composeReply(action, interpretation, context) {
    return composeReply(toBotAction(action), interpretation, toFlowContext(context));
  },

  buildClarificationQuestion(params) {
    return buildHeadcountClarificationQuestion(params);
  },
};
