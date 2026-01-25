import { anthropicJsonCompletion, type AnthropicCompletionParams } from './anthropic.js';
import { logger } from '../../logger/logger.js';

const TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 1;

export interface LLMCallParams {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

async function callWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('LLM call timeout')), timeoutMs)
    ),
  ]);
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  context: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.warn({ attempt, context }, 'Retrying LLM call');
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return await callWithTimeout(fn(), TIMEOUT_MS);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors or timeouts
      const isRetryable =
        lastError.message.includes('timeout') ||
        lastError.message.includes('network') ||
        lastError.message.includes('fetch');

      if (!isRetryable || attempt >= maxRetries) {
        logger.error({ error: lastError, attempt, context }, 'LLM call failed');
        throw lastError;
      }
    }
  }

  throw lastError || new Error('LLM call failed after retries');
}

export async function callLLM({
  system,
  prompt,
  maxTokens,
  temperature,
}: LLMCallParams): Promise<string> {
  const context = `LLM call (maxTokens: ${maxTokens ?? 'default'})`;

  logger.debug({ context, promptLength: prompt.length }, 'Calling LLM');

  try {
    const result = await callWithRetry(
      () =>
        anthropicJsonCompletion({
          system,
          prompt,
          maxTokens,
          temperature,
        }),
      MAX_RETRIES,
      context
    );

    logger.debug({ context, resultLength: result.length }, 'LLM call succeeded');
    return result;
  } catch (error) {
    logger.error({ error, context }, 'LLM call failed after retries');
    throw error;
  }
}
