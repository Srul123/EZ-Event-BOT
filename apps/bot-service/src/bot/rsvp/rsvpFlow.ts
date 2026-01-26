import { interpretMessage } from './interpret/index.js';
import { composeReply } from './respond/index.js';
import { interpretHeadcountOnly } from './interpret/headcountOnly.js';
import { buildHeadcountClarificationQuestion } from './clarificationQuestions.js';
import type { Action, FlowContext, Interpretation } from './types.js';
import type { GuestDocument } from '../../domain/campaigns/guest.model.js';

/**
 * Context words that indicate the message is about headcount.
 * Used to gate fuzzy matching confirmation - only accept fuzzy matches if context suggests headcount intent.
 */
const HEADCOUNT_CONTEXT_WORDS = ['אנחנו', 'נהיה', 'מגיעים', 'בסוף', 'סהכ', 'כולל'];

/**
 * Keywords that indicate explicit change intent.
 * Used to detect when a guest wants to update their RSVP.
 */
const CHANGE_KEYWORDS = ['רק', 'משנה', 'מעדכן', 'מעדכנת', 'change', 'update', 'changing', 'updating'];

/**
 * Keywords that indicate correction/mistake intent.
 * When these appear with a headcount, it's likely a correction, not a status change.
 */
const CORRECTION_KEYWORDS = ['טעיתי', 'טעות', 'אופס', 'שגיאה', 'תיקנתי', 'מתקן', 'mistake', 'error', 'oops', 'correct', 'correction', 'fix', 'fixed'];

/**
 * Checks if message has headcount context words.
 * Used to determine if fuzzy match can be accepted without confirmation.
 */
function hasHeadcountContext(messageText: string): boolean {
  const lowerText = messageText.toLowerCase();
  return HEADCOUNT_CONTEXT_WORDS.some(word => lowerText.includes(word));
}

/**
 * Detects if a message indicates intent to change the RSVP.
 * Returns true if the interpretation suggests a change from the current state.
 * 
 * @param interpretation - The interpreted message
 * @param currentRsvpStatus - Current RSVP status
 * @param currentHeadcount - Current headcount (if any)
 * @param messageText - Original message text for keyword detection
 * @returns true if change intent is detected
 */
function detectChangeIntent(
  interpretation: Interpretation,
  currentRsvpStatus: FlowContext['currentRsvpStatus'],
  currentHeadcount: number | null | undefined,
  messageText: string
): boolean {
  const normalizedText = messageText.toLowerCase().trim();
  
  // Check for explicit change keywords
  const hasChangeKeyword = CHANGE_KEYWORDS.some(keyword => normalizedText.includes(keyword));
  if (hasChangeKeyword) {
    return true;
  }
  
  // Check for correction keywords (especially important for headcount updates)
  const hasCorrectionKeyword = CORRECTION_KEYWORDS.some(keyword => normalizedText.includes(keyword));
  
  // Check for headcount change (when current status is YES)
  // This check comes BEFORE status change check to prioritize headcount updates
  if (currentRsvpStatus === 'YES') {
    // If interpretation has exact headcount and it's different from current
    if (
      interpretation.headcountExtraction.kind === 'exact' &&
      currentHeadcount !== null &&
      currentHeadcount !== undefined &&
      interpretation.headcountExtraction.headcount !== currentHeadcount
    ) {
      // If there's a correction keyword, definitely treat as headcount update
      if (hasCorrectionKeyword) {
        return true;
      }
      // Even without correction keyword, different headcount suggests update
      return true;
    }
    
    // If message contains only a number (headcount-only update)
    // e.g., "רק 2" or "2 אנשים" when current is 4
    if (interpretation.headcountExtraction.kind === 'exact') {
      // Check if message is primarily about headcount (contains number but no clear RSVP keywords)
      const hasRsvpKeywords = ['כן', 'לא', 'אולי', 'yes', 'no', 'maybe'].some(
        keyword => normalizedText.includes(keyword)
      );
      
      // If we have a headcount but no RSVP keywords, it's likely an update
      // OR if there's a correction keyword with headcount, it's definitely an update
      if ((!hasRsvpKeywords && interpretation.rsvp === 'UNKNOWN') || hasCorrectionKeyword) {
        return true;
      }
    }
  }
  
  // Check for RSVP status change (but only if not a correction with headcount)
  // If there's a correction keyword with a headcount and current status is YES,
  // treat it as headcount update, not status change
  if (
    interpretation.rsvp !== 'UNKNOWN' &&
    interpretation.rsvp !== currentRsvpStatus &&
    !(currentRsvpStatus === 'YES' && hasCorrectionKeyword && interpretation.headcountExtraction.kind === 'exact')
  ) {
    return true;
  }
  
  return false;
}

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

  // Check if guest has confirmed RSVP and is in DEFAULT state
  // If so, interpret message first to detect change intent
  let interpretation: Interpretation | null = null;
  if (
    (currentRsvpStatus === 'YES' || currentRsvpStatus === 'NO') &&
    conversationState === 'DEFAULT'
  ) {
    // Interpret the message to detect change intent
    interpretation = await interpretMessage(messageText, flowContext);
    
    // Check if change is detected
    const hasChangeIntent = detectChangeIntent(
      interpretation,
      currentRsvpStatus,
      flowContext.currentHeadcount,
      messageText
    );
    
    // If no change detected, acknowledge without modifying DB
    if (!hasChangeIntent) {
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
          headcountExtraction:
            flowContext.currentHeadcount !== null && flowContext.currentHeadcount !== undefined
              ? { kind: 'exact' as const, headcount: flowContext.currentHeadcount }
              : { kind: 'none' as const },
          confidence: 1.0,
          needsHeadcount: false,
        },
        flowContext
      );

      return { action, replyText };
    }
    
    // Change detected - continue with normal processing below
    // The interpretation will be reused in the DEFAULT state logic
  }

  // State-based logic
  if (conversationState === 'YES_AWAITING_HEADCOUNT') {
    // CRITICAL: In YES_AWAITING_HEADCOUNT state, we ONLY extract headcount.
    // Do NOT re-evaluate RSVP intent (no YES/NO/MAYBE transitions).
    // This prevents unintended conversational drift and ensures we stay focused on headcount.
    const headcountExtraction = await interpretHeadcountOnly(
      messageText,
      flowContext.locale
    );

    // Track clarification attempts
    const currentAttempts = flowContext.headcountClarificationAttempts ?? 0;
    const nextAttempts = currentAttempts + 1;
    const lastReason = flowContext.lastHeadcountClarificationReason;

    if (headcountExtraction.kind === 'exact') {
      // Headcount found: check if it's fuzzy and needs confirmation
      const isFuzzy = headcountExtraction.fuzzy === true;
      const headcount = headcountExtraction.headcount;
      
      // Check if context words exist (indicates clear headcount intent)
      const hasContextWords = hasHeadcountContext(messageText);
      
      // If fuzzy match and no context words, ask for confirmation
      if (isFuzzy && !hasContextWords) {
        // Ask confirmation question instead of finalizing
        const action: Action = {
          type: 'CLARIFY',
          nextState: 'YES_AWAITING_HEADCOUNT',
          updates: {
            lastResponseAt: now,
          },
        };
        
        const replyText = flowContext.locale === 'he'
          ? `רק לוודא, הכוונה ${headcount} אנשים סהכ?`
          : `Just to confirm, is it ${headcount} people total?`;
        
        return { action, replyText };
      }
      
      // Either exact match or fuzzy with context words - proceed to finalize
      const action: Action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount: headcount,
          lastResponseAt: now,
        },
      };

      const replyText = await composeReply(
        action,
        {
          rsvp: 'YES',
          headcount: headcount,
          headcountExtraction,
          confidence: isFuzzy ? 0.7 : 0.9, // Lower confidence for fuzzy matches
          needsHeadcount: false,
        },
        flowContext
      );

      return { action, replyText };
    } else {
      // No exact headcount found: ask again with adaptive question
      // Cap at 3 attempts, then gracefully stop insisting
      if (nextAttempts >= 3) {
        // Gracefully stop insisting - don't finalize headcount
        const action: Action = {
          type: 'SET_RSVP',
          nextState: 'DEFAULT',
          updates: {
            rsvpStatus: 'YES',
            headcount: null, // Leave without headcount
            lastResponseAt: now,
          },
        };

        const replyText = buildHeadcountClarificationQuestion({
          reason: headcountExtraction.kind === 'ambiguous' ? headcountExtraction.reason : null,
          language: flowContext.locale,
          guestName: flowContext.guestName,
          attemptNumber: 3,
        });

        return { action, replyText };
      }

      // Ask again with adaptive question based on attempt number
      const action: Action = {
        type: 'CLARIFY',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: {
          lastResponseAt: now,
        },
      };

      const reason = headcountExtraction.kind === 'ambiguous' ? headcountExtraction.reason : null;
      const replyText = buildHeadcountClarificationQuestion({
        reason,
        language: flowContext.locale,
        guestName: flowContext.guestName,
        attemptNumber: nextAttempts,
      });

      // Update flow context with attempt tracking (will be persisted via session)
      flowContext.headcountClarificationAttempts = nextAttempts;
      flowContext.lastHeadcountClarificationReason = reason ?? undefined;

      return { action, replyText };
    }
  }

  // DEFAULT state: full interpretation
  // Reuse interpretation if already done (for change detection), otherwise interpret now
  if (!interpretation) {
    interpretation = await interpretMessage(messageText, flowContext);
  }

  let action: Action;

  // Handle headcount-only updates when guest has YES status
  // e.g., "רק 2 אנשים" when current is 4, or "אופס טעיתי, נהיה 2" when current is 3
  const normalizedMessage = messageText.toLowerCase().trim();
  const hasCorrectionKeyword = CORRECTION_KEYWORDS.some(keyword => normalizedMessage.includes(keyword));
  
  if (
    currentRsvpStatus === 'YES' &&
    interpretation.headcountExtraction.kind === 'exact' &&
    flowContext.currentHeadcount !== null &&
    flowContext.currentHeadcount !== undefined &&
    interpretation.headcountExtraction.headcount !== flowContext.currentHeadcount &&
    (interpretation.rsvp === 'UNKNOWN' || (interpretation.rsvp === 'NO' && hasCorrectionKeyword))
  ) {
    // Guest is updating their headcount with a headcount-only message or correction
    // Even if interpretation says NO, if there's a correction keyword and headcount,
    // treat it as headcount update (they made a mistake, not canceling)
    action = {
      type: 'SET_RSVP',
      nextState: 'DEFAULT',
      updates: {
        rsvpStatus: 'YES',
        headcount: interpretation.headcountExtraction.headcount,
        lastResponseAt: now,
      },
    };

    const replyText = flowContext.locale === 'he'
      ? `סבבה, מעדכן ל-${interpretation.headcountExtraction.headcount} סהכ.`
      : `Got it, updating to ${interpretation.headcountExtraction.headcount} total.`;

    return { action, replyText };
  }

  if (interpretation.rsvp === 'YES') {
    // Handle headcount update case: if guest already has a headcount and provides a new one
    if (
      flowContext.currentHeadcount !== null &&
      flowContext.currentHeadcount !== undefined &&
      interpretation.headcountExtraction.kind === 'exact' &&
      interpretation.headcountExtraction.headcount !== flowContext.currentHeadcount
    ) {
      // Guest is updating their headcount
      action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount: interpretation.headcountExtraction.headcount,
          lastResponseAt: now,
        },
      };

      // Use a natural update response
      const replyText = flowContext.locale === 'he'
        ? `סבבה, מעדכן ל-${interpretation.headcountExtraction.headcount} סהכ.`
        : `Got it, updating to ${interpretation.headcountExtraction.headcount} total.`;

      return { action, replyText };
    }

    // Check headcount extraction result
    if (interpretation.headcountExtraction.kind === 'exact') {
      // Has exact headcount: SET_RSVP YES + headcount
      action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount: interpretation.headcountExtraction.headcount,
          lastResponseAt: now,
        },
      };
    } else {
      // No exact headcount (ambiguous or none): ASK_HEADCOUNT
      // Preserve semantic distinction: ambiguous gets reason-specific question, none gets generic
      action = {
        type: 'ASK_HEADCOUNT',
        nextState: 'YES_AWAITING_HEADCOUNT',
        updates: {
          rsvpStatus: 'YES',
          lastResponseAt: now,
        },
      };

      // Use clarification question helper for the initial ask
      const reason = interpretation.headcountExtraction.kind === 'ambiguous'
        ? interpretation.headcountExtraction.reason
        : null;

      const replyText = buildHeadcountClarificationQuestion({
        reason,
        language: flowContext.locale,
        guestName: flowContext.guestName,
        attemptNumber: 1,
      });

      // Update flow context with attempt tracking
      flowContext.headcountClarificationAttempts = 1;
      flowContext.lastHeadcountClarificationReason = reason ?? undefined;

      return { action, replyText };
    }
  } else if (interpretation.rsvp === 'NO') {
    // Special case: if current status is YES, there's a correction keyword, and a headcount,
    // we already handled it above as a headcount update. Otherwise, proceed with NO.
    // (This check is redundant but makes the logic clearer)
    if (
      currentRsvpStatus === 'YES' &&
      hasCorrectionKeyword &&
      interpretation.headcountExtraction.kind === 'exact'
    ) {
      // Should have been handled above, but just in case, treat as headcount update
      action = {
        type: 'SET_RSVP',
        nextState: 'DEFAULT',
        updates: {
          rsvpStatus: 'YES',
          headcount: interpretation.headcountExtraction.headcount,
          lastResponseAt: now,
        },
      };

      const replyText = flowContext.locale === 'he'
        ? `סבבה, מעדכן ל-${interpretation.headcountExtraction.headcount} סהכ.`
        : `Got it, updating to ${interpretation.headcountExtraction.headcount} total.`;

      return { action, replyText };
    }
    
    // Normal NO response
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
