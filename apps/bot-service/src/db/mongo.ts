import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

export async function connectMongo(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function disconnectMongo(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect from MongoDB');
    throw error;
  }
}
