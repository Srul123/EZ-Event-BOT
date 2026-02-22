import type {
  RsvpStatus,
  ConversationState,
  AmbiguityReason,
  HeadcountExtraction,
  Interpretation,
} from '../rsvp/types.js';

export type {
  RsvpStatus,
  ConversationState,
  AmbiguityReason,
  HeadcountExtraction,
  Interpretation,
};

export interface GuestContext {
  guestId: string;
  guestName: string;
  eventTitle?: string;
  eventDate?: string;
  locale: 'he' | 'en';
  currentRsvpStatus: RsvpStatus;
  currentHeadcount: number | null;
  conversationState: ConversationState;
  clarificationAttempts: number;
  lastClarificationReason?: AmbiguityReason;
}

export type Action =
  | { type: 'SET_RSVP'; rsvpStatus: RsvpStatus; headcount: number | null }
  | { type: 'ASK_HEADCOUNT' }
  | { type: 'CLARIFY_HEADCOUNT'; reason: AmbiguityReason | null; attemptNumber: number }
  | { type: 'CLARIFY_INTENT' }
  | { type: 'ACK_NO_CHANGE' }
  | { type: 'STOP_WAITING_FOR_HEADCOUNT' };

export interface EffectsPatch {
  rsvpStatus?: RsvpStatus;
  headcount?: number | null;
  conversationState?: ConversationState;
  lastResponseAt: Date;
  rsvpUpdatedAt?: Date;
  clarificationAttempts?: number;
  lastClarificationReason?: AmbiguityReason;
}

export interface GraphInput {
  messageText: string;
  guestContext: GuestContext;
}

export interface GraphOutput {
  replyText: string;
  effects: EffectsPatch;
}
