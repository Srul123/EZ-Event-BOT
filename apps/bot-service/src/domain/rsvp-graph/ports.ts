import type {
  AmbiguityReason,
  GuestContext,
  Interpretation,
  HeadcountExtraction,
  Action,
} from './types.js';

export interface NluPort {
  interpretMessage(text: string, context: GuestContext): Promise<Interpretation>;
  interpretHeadcountOnly(text: string, language: 'he' | 'en'): Promise<HeadcountExtraction>;
}

export interface NlgPort {
  composeReply(action: Action, interpretation: Interpretation, context: GuestContext): Promise<string>;
  buildClarificationQuestion(params: {
    reason: AmbiguityReason | null;
    language: 'he' | 'en';
    guestName: string;
    attemptNumber: number;
  }): string;
}

export interface ClockPort {
  now(): Date;
}

export interface LoggerPort {
  info(obj: Record<string, unknown>, msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
}

export interface RsvpGraphPorts {
  nlu: NluPort;
  nlg: NlgPort;
  clock: ClockPort;
  logger: LoggerPort;
}
