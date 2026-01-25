import { z } from 'zod';
import { callLLM } from '../../../infra/llm/llmClient.js';
import { logger } from '../../../logger/logger.js';
import { buildRespondPrompt, type RespondPromptParams } from './prompts/respond.prompt.js';
import { env } from '../../../config/env.js';
import * as templates from './templates.js';
import type { Action, Interpretation, FlowContext } from '../types.js';

const DEFAULT_MAX_TOKENS_RESPOND = 120;

const responseSchema = z.object({
  reply: z.string(),
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

export async function generateLLMResponse(
  action: Action,
  interpretation: Interpretation,
  flowContext: FlowContext
): Promise<string> {
  try {
    const { system, prompt } = buildRespondPrompt({
      interpretation,
      action,
      flowContext,
    });

    const response = await callLLM({
      system,
      prompt,
      maxTokens: DEFAULT_MAX_TOKENS_RESPOND,
    });

    const jsonText = extractJsonFromText(response);
    if (!jsonText) {
      logger.warn({ response }, 'Failed to extract JSON from LLM response');
      throw new Error('Failed to extract JSON');
    }

    const parsed = JSON.parse(jsonText);
    const validated = responseSchema.parse(parsed);

    return validated.reply;
  } catch (error) {
    logger.error({ error, action, interpretation }, 'Error generating LLM response');
    throw error; // Will fallback to templates
  }
}
