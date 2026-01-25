import { interpretMessage } from './interpret/index.js';
import { composeReply } from './respond/index.js';
import { extractHeadcount } from './interpret/rules.js';
import type { Action, FlowContext, Interpretation } from './types.js';
import type { GuestDocument } from '../../domain/campaigns/guest.model.js';

export interface HandleIncomingTextMessageParams {
  guest: GuestDocument;
  messageText: string;
  flowContext: FlowContext;
}

export interface HandleIncomingTextMessageResult {
  action: Action;
  replyText: string;
}

export async function handleIncomingTextMessage({
  guest,
  messageText,
  flowContext,
}: HandleIncomingTextMessageParams): Promise<HandleIncomingTextMessageResult> {
  const now = new Date();
  const currentRsvpStatus = flowContext.currentRsvpStatus;
  const conversationState = flowContext.conversationState;

  // Already recorded check (before state logic)
  if (
    (currentRsvpStatus === 'YES' || currentRsvpStatus === 'NO') &&
    conversationState === 'DEFAULT'
  ) {
    // Default behavior: acknowledge without modifying DB
    // (unless explicitly detecting clear intent to change - keep simple for MVP)
    const action: Action = {
      type: 'ACK',
      nextState: 'DEFAULT',
      updates: {
        lastResponseAt: now,
      },
    };

    const replyText = await composeReply(
      action,
      {
        rsvp: currentRsvpStatus,
        headcount: flowContext.currentHeadcount ?? null,
        confidence: 1.0,
        needsHeadcount: false,
      },
      flowContext
    );

    return { action, replyText };
  }

  // State-based logic
  if (conversationState === 'YES_AWAITING_HEADCOUNT') {
    // Do NOT call interpretMessage - only attempt headcount extraction
    const headcount = extractHeadcount(messageText);

    if (headcount !== null && headcount > 0) {
      // Headcount found: confirm YES + headcount
      const action: Action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount,
          lastResponseAt: now,
        },
      };

      const replyText = await composeReply(
        action,
        {
          rsvp: 'YES',
          headcount,
          confidence: 0.9,
          needsHeadcount: false,
        },
        flowContext
      );

      return { action, replyText };
    } else {
      // No headcount found: ask again
      const action: Action = {
        type: 'CLARIFY',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: {
          lastResponseAt: now,
        },
      };

      const replyText = await composeReply(
        action,
        {
          rsvp: 'YES',
          headcount: null,
          confidence: 0.5,
          needsHeadcount: true,
        },
        flowContext
      );

      return { action, replyText };
    }
  }

  // DEFAULT state: full interpretation
  const interpretation: Interpretation = await interpretMessage(messageText, flowContext);

  let action: Action;

  if (interpretation.rsvp === 'YES') {
    if (interpretation.headcount !== null && interpretation.headcount > 0) {
      // Has headcount: SET_RSVP YES + headcount
      action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount: interpretation.headcount,
          lastResponseAt: now,
        },
      };
    } else {
      // No headcount: ASK_HEADCOUNT
      action = {
        type: 'ASK_HEADCOUNT',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: {
          rsvpStatus: 'YES',
          lastResponseAt: now,
        },
      };
    }
  } else if (interpretation.rsvp === 'NO') {
    action = {
      type: 'SET_RSVP',
      nextState: 'DEFAULT',
      updates: {
        rsvpStatus: 'NO',
        headcount: null,
        lastResponseAt: now,
      },
    };
  } else if (interpretation.rsvp === 'MAYBE') {
    action = {
      type: 'SET_RSVP',
      nextState: 'DEFAULT',
      updates: {
        rsvpStatus: 'MAYBE',
        headcount: null,
        lastResponseAt: now,
      },
    };
  } else {
    // UNKNOWN: CLARIFY
    action = {
      type: 'CLARIFY',
      nextState: 'DEFAULT',
      updates: {
        lastResponseAt: now,
      },
    };
  }

  const replyText = await composeReply(action, interpretation, flowContext);

  return { action, replyText };
}
