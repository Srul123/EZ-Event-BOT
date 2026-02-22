import { Annotation } from '@langchain/langgraph';
import type {
  GuestContext,
  Interpretation,
  HeadcountExtraction,
  Action,
  EffectsPatch,
} from './types.js';

export const RsvpAnnotation = Annotation.Root({
  messageText: Annotation<string>,
  guestContext: Annotation<GuestContext>,
  interpretation: Annotation<Interpretation | null>,
  headcountExtraction: Annotation<HeadcountExtraction | null>,
  action: Annotation<Action | null>,
  replyText: Annotation<string>,
  effects: Annotation<EffectsPatch | null>,
});
