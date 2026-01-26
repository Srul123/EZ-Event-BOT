import { env } from '../../../config/env.js';
import { generateLLMResponse } from './llmResponder.js';
import * as templates from './templates.js';
import { buildHeadcountClarificationQuestion } from '../clarificationQuestions.js';
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
    case 'ASK_HEADCOUNT': {
      // Use clarification question helper for initial ask
      const reason =
        interpretation.headcountExtraction.kind === 'ambiguous'
          ? interpretation.headcountExtraction.reason
          : null;

      return buildHeadcountClarificationQuestion({
        reason,
        language: flowContext.locale,
        guestName: flowContext.guestName,
        attemptNumber: 1,
      });
    }

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
      // If in YES_AWAITING_HEADCOUNT state, use clarification question helper
      if (
        flowContext.conversationState === 'YES_AWAITING_HEADCOUNT' ||
        action.nextState === 'YES_AWAITING_HEADCOUNT'
      ) {
        // Use clarification question helper with attempt tracking
        const attemptNumber = (flowContext.headcountClarificationAttempts ?? 0) + 1;
        const reason = flowContext.lastHeadcountClarificationReason;
        
        // If interpretation has headcountExtraction, use its reason
        const extractionReason =
          interpretation.headcountExtraction.kind === 'ambiguous'
            ? interpretation.headcountExtraction.reason
            : null;

        return buildHeadcountClarificationQuestion({
          reason: reason ?? extractionReason ?? null,
          language: flowContext.locale,
          guestName: flowContext.guestName,
          attemptNumber,
        });
      }
      return templates.replyClarify({ guestName: flowContext.guestName });
    }

    default:
      return templates.replyClarify({ guestName: flowContext.guestName });
  }
}
