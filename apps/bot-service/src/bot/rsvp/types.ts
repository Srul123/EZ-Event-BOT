export type RsvpStatus = 'YES' | 'NO' | 'MAYBE' | 'NO_RESPONSE';
export type ConversationState = 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';

export interface Interpretation {
  rsvp: 'YES' | 'NO' | 'MAYBE' | 'UNKNOWN';
  headcount: number | null;
  confidence: number; // 0..1
  needsHeadcount: boolean;
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
}
