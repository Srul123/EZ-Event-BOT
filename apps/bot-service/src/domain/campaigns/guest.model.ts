import mongoose from 'mongoose';
import type { RsvpStatus } from './types.js';

export interface GuestDocument extends mongoose.Document {
  campaignId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  rsvpStatus: RsvpStatus;
  headcount?: number;
  rsvpUpdatedAt?: Date;
  conversationState?: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
  lastResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guestSchema = new mongoose.Schema<GuestDocument>(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    rsvpStatus: {
      type: String,
      enum: ['NO_RESPONSE', 'YES', 'NO', 'MAYBE'],
      default: 'NO_RESPONSE',
    },
    headcount: {
      type: Number,
      required: false,
      min: 0,
    },
    rsvpUpdatedAt: {
      type: Date,
      required: false,
    },
    conversationState: {
      type: String,
      enum: ['DEFAULT', 'YES_AWAITING_HEADCOUNT'],
      required: false,
      default: 'DEFAULT',
    },
    lastResponseAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const GuestModel = mongoose.model<GuestDocument>('Guest', guestSchema);
