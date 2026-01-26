import type { AmbiguityReason } from './types.js';

/**
 * Builds a human-like clarification question based on ambiguity reason and attempt count.
 * 
 * This function provides context-aware questions that feel natural and help guests
 * understand what information is needed. Different questions for different ambiguity types
 * enable more precise follow-up.
 * 
 * IMPORTANT: Never expose internal reason names to users. Questions are natural and friendly.
 */
export function buildHeadcountClarificationQuestion({
  reason,
  language,
  guestName,
  attemptNumber = 1,
}: {
  reason: AmbiguityReason | null | undefined;
  language: 'he' | 'en';
  guestName?: string;
  attemptNumber?: number;
}): string {
  // Fallback for missing/unknown reasons
  if (!reason) {
    if (language === 'he') {
      return attemptNumber === 1
        ? `${guestName ? guestName + ', ' : ''}רק כדי לדעת, כמה תהיו סהכ?`
        : attemptNumber === 2
        ? `כדי לרשום נכון, אפשר מספר בלבד? למשל: 3`
        : `אין בעיה, אשאיר כרגע בלי מספר. תמיד אפשר לעדכן בהמשך.`;
    } else {
      return attemptNumber === 1
        ? `${guestName ? guestName + ', ' : ''}Just to confirm, how many in total?`
        : attemptNumber === 2
        ? `To record correctly, can you provide just a number? For example: 3`
        : `No problem, I'll leave it without a number for now. You can always update later.`;
    }
  }

  // Attempt 1: Reason-specific questions
  if (attemptNumber === 1) {
    if (reason === 'FAMILY_TERM') {
      if (language === 'he') {
        return `מעולה! כמה ילדים יגיעו איתך? כלומר כמה תהיו סהכ?`;
      } else {
        return `Great! How many kids are coming with you, so how many in total?`;
      }
    }

    if (reason === 'RELATIONAL') {
      if (language === 'he') {
        return `רק כדי לדייק, כמה תהיו סהכ?`;
      } else {
        return `Just to confirm, how many in total?`;
      }
    }

    if (reason === 'RANGE_OR_APPROX') {
      if (language === 'he') {
        return `הבנתי, זה בערך. רוצה שאכתוב כרגע מספר משוער, או שתעדכן כשזה סופי?`;
      } else {
        return `Got it, it's approximate. Want me to record an estimate for now, or update later?`;
      }
    }

    // UNKNOWN or other
    if (language === 'he') {
      return `רק כדי לוודא, כמה תהיו סהכ?`;
    } else {
      return `Just to confirm, how many in total?`;
    }
  }

  // Attempt 2: Rephrase with example
  if (attemptNumber === 2) {
    if (language === 'he') {
      return `כדי לרשום נכון, אפשר מספר בלבד? למשל: 3`;
    } else {
      return `To record correctly, can you provide just a number? For example: 3`;
    }
  }

  // Attempt 3: Gracefully stop insisting
  if (language === 'he') {
    return `אין בעיה, אשאיר כרגע בלי מספר. תמיד אפשר לעדכן בהמשך.`;
  } else {
    return `No problem, I'll leave it without a number for now. You can always update later.`;
  }
}
