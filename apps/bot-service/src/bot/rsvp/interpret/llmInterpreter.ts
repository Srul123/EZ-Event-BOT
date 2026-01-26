import { z } from 'zod';
import { callLLM } from '../../../infra/llm/llmClient.js';
import { logger } from '../../../logger/logger.js';
import { buildInterpretPrompt, type InterpretPromptParams } from './prompts/interpret.prompt.js';
import type { Interpretation } from '../types.js';
import { env } from '../../../config/env.js';

const DEFAULT_MAX_TOKENS_INTERPRET = 200;

const headcountExtractionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('exact'),
    headcount: z.number(),
  }),
  z.object({
    kind: z.literal('ambiguous'),
    reason: z.enum(['FAMILY_TERM', 'RELATIONAL', 'RANGE_OR_APPROX', 'UNKNOWN']),
  }),
  z.object({
    kind: z.literal('none'),
  }),
]);

const interpretationSchema = z.object({
  rsvp: z.enum(['YES', 'NO', 'MAYBE', 'UNKNOWN']),
  headcount: z.number().nullable(),
  headcountExtraction: headcountExtractionSchema,
  confidence: z.number().min(0).max(1),
  needsHeadcount: z.boolean(),
  language: z.enum(['he', 'en']).optional(),
});

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

export async function interpretWithLLM(
  params: InterpretPromptParams
): Promise<Interpretation> {
  try {
    const { system, prompt } = buildInterpretPrompt(params);

    const response = await callLLM({
      system,
      prompt,
      maxTokens: DEFAULT_MAX_TOKENS_INTERPRET,
    });

    const jsonText = extractJsonFromText(response);
    if (!jsonText) {
      logger.warn({ response }, 'Failed to extract JSON from LLM response');
      return {
        rsvp: 'UNKNOWN',
        headcount: null,
        headcountExtraction: { kind: 'none' },
        confidence: 0.2,
        needsHeadcount: false,
      };
    }

    const parsed = JSON.parse(jsonText);
    const validated = interpretationSchema.parse(parsed);

    // Clamp confidence to [0, 1]
    const confidence = Math.max(0, Math.min(1, validated.confidence));

    return {
      rsvp: validated.rsvp,
      headcount: validated.headcount,
      headcountExtraction: validated.headcountExtraction,
      confidence,
      needsHeadcount: validated.needsHeadcount,
      language: validated.language,
    };
  } catch (error) {
    logger.error({ error, params }, 'Error in LLM interpretation');
    return {
      rsvp: 'UNKNOWN',
      headcount: null,
      headcountExtraction: { kind: 'none' },
      confidence: 0.2,
      needsHeadcount: false,
    };
  }
}
