import mongoose from 'mongoose';
import type { CampaignStatus } from './types.js';

export interface CampaignDocument extends mongoose.Document {
  name: string;
  eventTitle: string;
  eventDate?: string;
  scheduledAt: Date;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new mongoose.Schema<CampaignDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    eventTitle: {
      type: String,
      required: true,
    },
    eventDate: {
      type: String,
      required: false,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'SCHEDULED',
    },
  },
  {
    timestamps: true,
  }
);

campaignSchema.index({ scheduledAt: 1, status: 1 });

export const CampaignModel = mongoose.model<CampaignDocument>('Campaign', campaignSchema);
