import type { RsvpGraphPorts } from '../ports.js';
import type { RsvpAnnotation } from '../state.js';
import type {
  Action,
  GuestContext,
  Interpretation,
  HeadcountExtraction,
} from '../types.js';

const CHANGE_KEYWORDS = [
  'רק', 'משנה', 'מעדכן', 'מעדכנת',
  'change', 'update', 'changing', 'updating',
];

const CORRECTION_KEYWORDS = [
  'טעיתי', 'טעות', 'אופס', 'שגיאה', 'תיקנתי', 'מתקן',
  'mistake', 'error', 'oops', 'correct', 'correction', 'fix', 'fixed',
];

export interface DecideActionInput {
  guestContext: GuestContext;
  interpretation: Interpretation | null;
  headcountExtraction: HeadcountExtraction | null;
  messageText: string;
}

function detectChangeIntent(
  interpretation: Interpretation,
  guestContext: GuestContext,
  messageText: string,
): boolean {
  const normalized = messageText.toLowerCase().trim();

  if (CHANGE_KEYWORDS.some(kw => normalized.includes(kw))) return true;

  const hasCorrectionKeyword = CORRECTION_KEYWORDS.some(kw => normalized.includes(kw));

  if (guestContext.currentRsvpStatus === 'YES') {
    if (
      interpretation.headcountExtraction.kind === 'exact' &&
      guestContext.currentHeadcount !== null &&
      interpretation.headcountExtraction.headcount !== guestContext.currentHeadcount
    ) {
      return true;
    }

    if (interpretation.headcountExtraction.kind === 'exact') {
      const rsvpKeywords = ['כן', 'לא', 'אולי', 'yes', 'no', 'maybe'];
      const hasRsvpKeywords = rsvpKeywords.some(kw => normalized.includes(kw));
      if ((!hasRsvpKeywords && interpretation.rsvp === 'UNKNOWN') || hasCorrectionKeyword) {
        return true;
      }
    }
  }

  if (
    interpretation.rsvp !== 'UNKNOWN' &&
    interpretation.rsvp !== guestContext.currentRsvpStatus &&
    !(
      guestContext.currentRsvpStatus === 'YES' &&
      hasCorrectionKeyword &&
      interpretation.headcountExtraction.kind === 'exact'
    )
  ) {
    return true;
  }

  return false;
}

export function decideAction(input: DecideActionInput): Action {
  const { guestContext, interpretation, headcountExtraction, messageText } = input;
  const { conversationState, clarificationAttempts } = guestContext;

  if (conversationState === 'YES_AWAITING_HEADCOUNT') {
    if (clarificationAttempts >= 3) {
      return { type: 'STOP_WAITING_FOR_HEADCOUNT' };
    }

    if (headcountExtraction?.kind === 'exact' && !headcountExtraction.fuzzy) {
      return {
        type: 'SET_RSVP',
        rsvpStatus: 'YES',
        headcount: headcountExtraction.headcount,
      };
    }

    if (interpretation) {
      if (interpretation.rsvp === 'NO') {
        // Only exit the headcount loop for high-confidence cancellations.
        // Low-confidence NO may mean "I don't know" (e.g., "לא ידוע" = don't know),
        // not an actual cancellation.
        const confidence = interpretation.confidence ?? 1.0;
        if (confidence >= 0.8) {
          return { type: 'SET_RSVP', rsvpStatus: 'NO', headcount: null };
        }
        // Treat low-confidence NO as UNKNOWN — keep asking for headcount
        return {
          type: 'CLARIFY_HEADCOUNT',
          reason: null,
          attemptNumber: clarificationAttempts + 1,
        };
      }
      if (interpretation.rsvp === 'MAYBE') {
        return { type: 'SET_RSVP', rsvpStatus: 'MAYBE', headcount: null };
      }
      if (
        interpretation.rsvp === 'YES' &&
        interpretation.headcountExtraction.kind === 'exact'
      ) {
        return {
          type: 'SET_RSVP',
          rsvpStatus: 'YES',
          headcount: interpretation.headcountExtraction.headcount,
        };
      }
      if (interpretation.rsvp === 'YES') {
        const reason =
          interpretation.headcountExtraction.kind === 'ambiguous'
            ? interpretation.headcountExtraction.reason
            : null;
        return {
          type: 'CLARIFY_HEADCOUNT',
          reason,
          attemptNumber: clarificationAttempts + 1,
        };
      }
      // UNKNOWN -- stay in headcount loop, re-ask
      return {
        type: 'CLARIFY_HEADCOUNT',
        reason: null,
        attemptNumber: clarificationAttempts + 1,
      };
    }

    // Only headcountExtraction available (no interpretation) and not exact
    const reason =
      headcountExtraction?.kind === 'ambiguous'
        ? headcountExtraction.reason
        : null;
    return {
      type: 'CLARIFY_HEADCOUNT',
      reason,
      attemptNumber: clarificationAttempts + 1,
    };
  }

  // --- DEFAULT state ---

  if (!interpretation) {
    return { type: 'CLARIFY_INTENT' };
  }

  // Already-confirmed guest: check for change intent
  if (
    (guestContext.currentRsvpStatus === 'YES' || guestContext.currentRsvpStatus === 'NO') &&
    !detectChangeIntent(interpretation, guestContext, messageText)
  ) {
    return { type: 'ACK_NO_CHANGE' };
  }

  // Headcount-only update for YES guests:
  // UNKNOWN rsvp + exact headcount + currently YES => update headcount
  if (
    guestContext.currentRsvpStatus === 'YES' &&
    interpretation.rsvp === 'UNKNOWN' &&
    interpretation.headcountExtraction.kind === 'exact'
  ) {
    return {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: interpretation.headcountExtraction.headcount,
    };
  }

  if (interpretation.rsvp === 'YES') {
    if (interpretation.headcountExtraction.kind === 'exact') {
      return {
        type: 'SET_RSVP',
        rsvpStatus: 'YES',
        headcount: interpretation.headcountExtraction.headcount,
      };
    }
    return { type: 'ASK_HEADCOUNT' };
  }

  if (interpretation.rsvp === 'NO') {
    return { type: 'SET_RSVP', rsvpStatus: 'NO', headcount: null };
  }

  if (interpretation.rsvp === 'MAYBE') {
    return { type: 'SET_RSVP', rsvpStatus: 'MAYBE', headcount: null };
  }

  // UNKNOWN
  return { type: 'CLARIFY_INTENT' };
}

export function createDecideActionNode(ports: RsvpGraphPorts) {
  return (state: typeof RsvpAnnotation.State) => {
    const action = decideAction({
      guestContext: state.guestContext,
      interpretation: state.interpretation,
      headcountExtraction: state.headcountExtraction,
      messageText: state.messageText,
    });

    ports.logger.debug(
      { node: 'decideAction', actionType: action.type },
      'Action decided',
    );

    return { action };
  };
}
