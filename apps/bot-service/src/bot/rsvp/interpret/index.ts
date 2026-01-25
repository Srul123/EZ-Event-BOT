import { env } from '../../../config/env.js';
import { interpretWithRules } from './rules.js';
import { interpretWithLLM } from './llmInterpreter.js';
import type { Interpretation } from '../types.js';
import type { FlowContext } from '../types.js';

export async function interpretMessage(
  text: string,
  flowContext: FlowContext
): Promise<Interpretation> {
  // Apply rules first
  const rulesResult = interpretWithRules(text);

  // If confidence meets threshold, return rules result
  const threshold = env.RSVP_CONFIDENCE_THRESHOLD;
  if (rulesResult.confidence >= threshold) {
    return rulesResult;
  }

  // Fall back to LLM if enabled
  if (env.RSVP_USE_LLM_INTERPRETATION) {
    return interpretWithLLM({
      text,
      locale: flowContext.locale,
      eventTitle: flowContext.eventTitle,
      eventDate: flowContext.eventDate,
    });
  }

  // If LLM is disabled, return rules result even if confidence is low
  return rulesResult;
}
