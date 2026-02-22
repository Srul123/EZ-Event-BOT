export type RsvpStatus = 'YES' | 'NO' | 'MAYBE' | 'NO_RESPONSE';
export type ConversationState = 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
export type AmbiguityReason = 'FAMILY_TERM' | 'RELATIONAL' | 'RANGE_OR_APPROX' | 'UNKNOWN';

export type HeadcountExtraction =
  | { kind: 'exact'; headcount: number; fuzzy?: boolean }
  | { kind: 'ambiguous'; reason: AmbiguityReason }
  | { kind: 'none' };

export interface Interpretation {
  rsvp: 'YES' | 'NO' | 'MAYBE' | 'UNKNOWN';
  headcount: number | null;
  headcountExtraction: HeadcountExtraction;
  confidence: number;
  needsHeadcount: boolean;
  language?: 'he' | 'en';
}
