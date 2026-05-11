import {
  anthropicJsonCompletion,
  DEFAULT_LLM_TEMPERATURE,
} from "./anthropic.js";
import { env } from "../../config/env.js";
import { logger } from "../../logger/logger.js";

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
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("LLM call timeout")), timeoutMs),
    ),
  ]);
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  context: string,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.warn({ attempt, context }, "Retrying LLM call");
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return await callWithTimeout(fn(), TIMEOUT_MS);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network errors or timeouts
      const isRetryable =
        lastError.message.includes("timeout") ||
        lastError.message.includes("network") ||
        lastError.message.includes("fetch");

      if (!isRetryable || attempt >= maxRetries) {
        logger.error({ error: lastError, attempt, context }, "LLM call failed");
        throw lastError;
      }
    }
  }

  throw lastError || new Error("LLM call failed after retries");
}

function logLlmFullExchange(
  msg: string,
  payload: {
    context: string;
    system: string;
    prompt: string;
    response?: string;
    error?: unknown;
  },
): void {
  logger.debug(payload, msg);
  if (env.RSVP_LOG_LLM_FULL) {
    logger.info(payload, msg);
  }
}

export async function callLLM({
  system,
  prompt,
  maxTokens,
  temperature = DEFAULT_LLM_TEMPERATURE,
}: LLMCallParams): Promise<string> {
  const context = `LLM call (maxTokens: ${maxTokens ?? "default"}, temperature: ${temperature})`;

  logger.debug({ context, promptLength: prompt.length }, "Calling LLM");

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
      context,
    );

    logLlmFullExchange("LLM full exchange", {
      context,
      system,
      prompt,
      response: result,
    });
    return result;
  } catch (error) {
    logLlmFullExchange("LLM full exchange failed", {
      context,
      system,
      prompt,
      error,
    });
    logger.error({ error, context }, "LLM call failed after retries");
    throw error;
  }
}
