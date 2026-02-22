import type { RsvpGraphPorts } from '../ports.js';
import type { RsvpAnnotation } from '../state.js';
import type { Interpretation } from '../types.js';

export function createComposeReplyNode(ports: RsvpGraphPorts) {
  return async (state: typeof RsvpAnnotation.State) => {
    const { action, guestContext, interpretation } = state;

    if (!action) {
      return { replyText: '' };
    }

    let replyText: string;

    switch (action.type) {
      case 'SET_RSVP':
      case 'ACK_NO_CHANGE':
      case 'CLARIFY_INTENT': {
        const interp: Interpretation = interpretation ?? {
          rsvp: guestContext.currentRsvpStatus === 'NO_RESPONSE' ? 'UNKNOWN' : guestContext.currentRsvpStatus,
          headcount: guestContext.currentHeadcount,
          headcountExtraction: guestContext.currentHeadcount !== null
            ? { kind: 'exact', headcount: guestContext.currentHeadcount }
            : { kind: 'none' },
          confidence: 1.0,
          needsHeadcount: false,
        };
        replyText = await ports.nlg.composeReply(action, interp, guestContext);
        break;
      }

      case 'ASK_HEADCOUNT':
        replyText = ports.nlg.buildClarificationQuestion({
          reason: null,
          language: guestContext.locale,
          guestName: guestContext.guestName,
          attemptNumber: 1,
        });
        break;

      case 'CLARIFY_HEADCOUNT':
        replyText = ports.nlg.buildClarificationQuestion({
          reason: action.reason,
          language: guestContext.locale,
          guestName: guestContext.guestName,
          attemptNumber: action.attemptNumber,
        });
        break;

      case 'STOP_WAITING_FOR_HEADCOUNT':
        replyText = guestContext.locale === 'he'
          ? 'אין בעיה, אשאיר כרגע בלי מספר. תמיד אפשר לעדכן בהמשך.'
          : 'No problem, I\'ll leave it without a number for now. You can always update later.';
        break;

      default:
        replyText = '';
    }

    return { replyText };
  };
}
