import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load .env from repo root (current working directory when running npm scripts)
config({ path: resolve(process.cwd(), '.env') });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).pipe(z.number().int().positive()),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_BOT_USERNAME: z.string().min(1).default('EzEventBot'),
    MONGODB_URI: z.string().url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    ANTHROPIC_API_KEY: z.string().optional(),
    RSVP_USE_LLM_INTERPRETATION: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .pipe(z.boolean())
      .default('true'),
    RSVP_USE_LLM_RESPONSES: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .pipe(z.boolean())
      .default('false'),
    RSVP_CONFIDENCE_THRESHOLD: z
      .string()
      .transform(Number)
      .pipe(z.number().min(0).max(1))
      .default('0.85'),
  })
  .refine(
    (data) => {
      // ANTHROPIC_API_KEY required if RSVP_USE_LLM_INTERPRETATION is true
      if (data.RSVP_USE_LLM_INTERPRETATION && !data.ANTHROPIC_API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: 'ANTHROPIC_API_KEY is required when RSVP_USE_LLM_INTERPRETATION is true',
    }
  );

export const env = envSchema.parse(process.env);
