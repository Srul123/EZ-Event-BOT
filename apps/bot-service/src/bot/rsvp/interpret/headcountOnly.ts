import { z } from 'zod';
import { callLLM } from '../../../infra/llm/llmClient.js';
import { logger } from '../../../logger/logger.js';
import { extractHeadcount } from './rules.js';
import type { HeadcountExtraction } from '../types.js';
import { env } from '../../../config/env.js';

const DEFAULT_MAX_TOKENS_HEADCOUNT_ONLY = 100;

const headcountExtractionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('exact'),
    headcount: z.number(),
    fuzzy: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('ambiguous'),
    reason: z.enum(['FAMILY_TERM', 'RELATIONAL', 'RANGE_OR_APPROX', 'UNKNOWN']),
  }),
  z.object({
    kind: z.literal('none'),
  }),
]);

function extractJsonFromText(text: string): string | null {
  // First, try direct JSON parse
  try {
    JSON.parse(text.trim());
    return text.trim();
  } catch {
    // If that fails, try to extract first {...} block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
  }
  return null;
}

/**
 * Interprets headcount only from a message.
 * This is used in YES_AWAITING_HEADCOUNT state to avoid RSVP re-evaluation.
 * 
 * CRITICAL: This function does NOT classify RSVP intent (YES/NO/MAYBE).
 * It is purely extractive - only returns headcount extraction results.
 * 
 * This prevents unintended conversational drift and ensures we don't
 * re-decide RSVP status when we're only waiting for headcount.
 */
export async function interpretHeadcountOnly(
  messageText: string,
  language: 'he' | 'en' = 'he'
): Promise<HeadcountExtraction> {
  // First try rules-based extraction with fuzzy matching enabled
  // Fuzzy matching is safe in YES_AWAITING_HEADCOUNT context because we're only extracting headcount
  const rulesResult = extractHeadcount(messageText, true); // allowFuzzy = true
  
  // If we got an exact result from rules (including fuzzy matches), return it
  if (rulesResult.kind === 'exact') {
    return rulesResult;
  }

  // If rules didn't find an exact count, try LLM (if enabled)
  // But only for headcount extraction, NOT RSVP classification
  if (env.RSVP_USE_LLM_INTERPRETATION) {
    try {
      const system = `You are a headcount extractor. Output ONLY valid JSON. No prose, no explanations, no markdown formatting.

You must output a JSON object with this exact structure:
{
  "headcountExtraction": {
    "kind": "exact" | "ambiguous" | "none",
    "headcount": number (only if kind === "exact"),
    "reason": string (only if kind === "ambiguous", one of: "FAMILY_TERM", "RELATIONAL", "RANGE_OR_APPROX", "UNKNOWN")
  }
}

CRITICAL RULES:
- Do NOT classify RSVP intent (YES/NO/MAYBE) - this is ONLY for headcount extraction
- Do NOT output conversational text - only JSON
- Extract number of people mentioned in the message
- If quantity is mentioned but unclear (e.g., "kids" without number), return kind: "ambiguous" with reason: "FAMILY_TERM"
- If range/approx detected, return kind: "ambiguous" with reason: "RANGE_OR_APPROX"
- NEVER guess how many kids/children/family members
- Be conservative: when in doubt, return kind: "ambiguous" or "none"

Examples:
- "3 אנשים" => { headcountExtraction: { kind: "exact", headcount: 3 } }
- "אני ועוד שניים" => { headcountExtraction: { kind: "exact", headcount: 3 } }
- "כמה ילדים" => { headcountExtraction: { kind: "ambiguous", reason: "FAMILY_TERM" } }
- "בערך 3" => { headcountExtraction: { kind: "ambiguous", reason: "RANGE_OR_APPROX" } }
- "שלום" => { headcountExtraction: { kind: "none" } }`;

      const prompt = `Extract headcount from this message:\n\n"${messageText}"\n\nOutput the JSON now.`;

      const response = await callLLM({
        system,
        prompt,
        maxTokens: DEFAULT_MAX_TOKENS_HEADCOUNT_ONLY,
      });

      const jsonText = extractJsonFromText(response);
      if (!jsonText) {
        logger.warn({ response }, 'Failed to extract JSON from LLM headcount-only response');
        return rulesResult; // Fallback to rules result
      }

      const parsed = JSON.parse(jsonText);
      const validated = z.object({ headcountExtraction: headcountExtractionSchema }).parse(parsed);

      return validated.headcountExtraction;
    } catch (error) {
      logger.error({ error, messageText }, 'Error in LLM headcount-only interpretation');
      return rulesResult; // Fallback to rules result
    }
  }

  // If LLM is disabled, return rules result
  return rulesResult;
}
