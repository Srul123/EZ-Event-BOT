import { env } from './config/env.js';
import { logger } from './logger/logger.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { startHttpServer, stopHttpServer } from './http/server.js';
import { createBot } from './bot/createBot.js';
import type { Server } from 'http';

let httpServer: Server | null = null;
let bot: ReturnType<typeof createBot> | null = null;

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting bot service...');

    await connectMongo();

    httpServer = startHttpServer();

    bot = createBot();
    await bot.launch();
    logger.info('Telegram bot launched');

    logger.info('Service started successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to start service');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  try {
    if (bot) {
      bot.stop();
      logger.info('Telegram bot stopped');
    }
  } catch (error) {
    logger.error({ error }, 'Error stopping bot');
  }

  try {
    if (httpServer) {
      await stopHttpServer(httpServer);
    }
  } catch (error) {
    logger.error({ error }, 'Error stopping HTTP server');
  }

  try {
    await disconnectMongo();
  } catch (error) {
    logger.error({ error }, 'Error disconnecting MongoDB');
  }

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap().catch((error) => {
  logger.error({ error }, 'Unhandled error in bootstrap');
  process.exit(1);
});
