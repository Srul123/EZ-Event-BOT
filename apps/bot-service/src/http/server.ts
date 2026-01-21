import express from 'express';
import { createServer, type Server } from 'http';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export function startHttpServer(): Server {
  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'HTTP server started');
  });
  return server;
}

export function stopHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        logger.error({ error: err }, 'Error closing HTTP server');
        reject(err);
      } else {
        logger.info('HTTP server stopped');
        resolve();
      }
    });
  });
}
