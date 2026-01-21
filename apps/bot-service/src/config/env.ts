import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load .env from repo root (current working directory when running npm scripts)
config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  MONGODB_URI: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export const env = envSchema.parse(process.env);
