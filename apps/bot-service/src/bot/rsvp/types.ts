import type {
  RsvpStatus,
  ConversationState,
  AmbiguityReason,
} from '../../domain/rsvp/types.js';

export type {
  RsvpStatus,
  ConversationState,
  AmbiguityReason,
  HeadcountExtraction,
  Interpretation,
} from '../../domain/rsvp/types.js';

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
