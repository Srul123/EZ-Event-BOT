import { env } from '../../../config/env.js';
import { generateLLMResponse } from './llmResponder.js';
import * as templates from './templates.js';
import type { Action, Interpretation, FlowContext } from '../types.js';

export async function composeReply(
  action: Action,
  interpretation: Interpretation,
  flowContext: FlowContext
): Promise<string> {
  // If LLM responses are disabled, always use templates
  if (!env.RSVP_USE_LLM_RESPONSES) {
    return getTemplateReply(action, flowContext);
  }

  // Try LLM, fallback to templates on error
  try {
    return await generateLLMResponse(action, interpretation, flowContext);
  } catch (error) {
    // Fallback to templates
    return getTemplateReply(action, flowContext);
  }
}

function getTemplateReply(action: Action, flowContext: FlowContext): string {
  switch (action.type) {
    case 'ASK_HEADCOUNT':
      return templates.replyAskHeadcount({ guestName: flowContext.guestName });

    case 'SET_RSVP': {
      const rsvpStatus = action.updates.rsvpStatus;
      if (rsvpStatus === 'YES' && action.updates.headcount !== undefined && action.updates.headcount !== null) {
        return templates.replyYesConfirmed({
          guestName: flowContext.guestName,
          headcount: action.updates.headcount,
        });
      }
      if (rsvpStatus === 'NO') {
        return templates.replyNo({ guestName: flowContext.guestName });
      }
      if (rsvpStatus === 'MAYBE') {
        return templates.replyMaybe({ guestName: flowContext.guestName });
      }
      // Fallback
      return templates.replyClarify({ guestName: flowContext.guestName });
    }

    case 'ACK': {
      return templates.replyAlreadyRecorded({
        guestName: flowContext.guestName,
        rsvpStatus: flowContext.currentRsvpStatus,
        headcount: flowContext.currentHeadcount,
      });
    }

    case 'CLARIFY': {
      // If in YES_AWAITING_HEADCOUNT state, ask for headcount specifically
      if (
        flowContext.conversationState === 'YES_AWAITING_HEADCOUNT' ||
        action.nextState === 'YES_AWAITING_HEADCOUNT'
      ) {
        return templates.replyAskHeadcount({ guestName: flowContext.guestName });
      }
      return templates.replyClarify({ guestName: flowContext.guestName });
    }

    default:
      return templates.replyClarify({ guestName: flowContext.guestName });
  }
}
