import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { logger } from '../../logger/logger.js';

const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const DEFAULT_MAX_TOKENS_INTERPRET = 200;
const DEFAULT_MAX_TOKENS_RESPOND = 120;
const DEFAULT_TEMPERATURE = 0.2;

// Create Anthropic client instance (singleton)
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicClient;
}

export interface AnthropicCompletionParams {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function anthropicJsonCompletion({
  system,
  prompt,
  maxTokens = DEFAULT_MAX_TOKENS_INTERPRET,
  temperature = DEFAULT_TEMPERATURE,
}: AnthropicCompletionParams): Promise<string> {
  const client = getAnthropicClient();

  try {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Invalid response format from Anthropic API: no text content');
    }

    return textBlock.text;
  } catch (error) {
    // Handle SDK errors with better logging
    if (error instanceof Anthropic.APIError) {
      logger.error(
        {
          status: error.status,
          error: error.message,
          errorCode: error.error?.type,
        },
        'Anthropic API error'
      );
      throw new Error(`Anthropic API error: ${error.status} ${error.message}`);
    }

    if (error instanceof Error) {
      logger.error({ error: error.message }, 'Error calling Anthropic API');
      throw error;
    }

    throw new Error('Unknown error calling Anthropic API');
  }
}
