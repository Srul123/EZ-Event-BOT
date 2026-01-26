export type RsvpStatus = 'YES' | 'NO' | 'MAYBE' | 'NO_RESPONSE';
export type ConversationState = 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';

/**
 * Headcount extraction result type.
 * Distinguishes between exact counts, ambiguous mentions, and no signal.
 * This prevents guessing and enables context-aware clarification questions.
 */
export type HeadcountExtraction =
  | { kind: 'exact'; headcount: number; fuzzy?: boolean } // fuzzy: true if derived from fuzzy matching
  | { kind: 'ambiguous'; reason: 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN' }
  | { kind: 'none' };

export type AmbiguityReason = 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN';

export interface Interpretation {
  rsvp: 'YES' | 'NO' | 'MAYBE' | 'UNKNOWN';
  headcount: number | null; // Keep for backwards compatibility
  headcountExtraction: HeadcountExtraction; // New explicit field
  confidence: number; // 0..1
  needsHeadcount: boolean; // Derived from headcountExtraction.kind === 'ambiguous' (or 'none')
  language?: 'he' | 'en';
}

export type Action =
  | {
      type: 'ASK_HEADCOUNT';
      nextState: 'YES_AWAITING_HEADCOUNT';
      updates: Partial<{ rsvpStatus: 'YES'; lastResponseAt: Date }>;
    }
  | {
      type: 'SET_RSVP';
      nextState: 'DEFAULT';
      updates: Partial<{ rsvpStatus: RsvpStatus; headcount: number | null; lastResponseAt: Date }>;
    }
  | {
      type: 'ACK';
      nextState: 'DEFAULT';
      updates: Partial<{ lastResponseAt: Date }>;
    }
  | {
      type: 'CLARIFY';
      nextState: ConversationState;
      updates: Partial<{ lastResponseAt: Date }>;
    };

export interface FlowContext {
  guestName: string;
  eventTitle?: string;
  eventDate?: string;
  locale: 'he' | 'en';
  currentRsvpStatus: RsvpStatus;
  currentHeadcount?: number | null;
  conversationState: ConversationState;
  // Clarification attempt tracking (lightweight, can be in session or guest record)
  headcountClarificationAttempts?: number;
  lastHeadcountClarificationReason?: AmbiguityReason;
}
