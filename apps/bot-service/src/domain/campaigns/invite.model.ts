import mongoose from 'mongoose';

export interface InviteDocument extends mongoose.Document {
  token: string;
  guestId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new mongoose.Schema<InviteDocument>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    usedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

inviteSchema.index({ token: 1 }, { unique: true });
inviteSchema.index({ guestId: 1 });
inviteSchema.index({ campaignId: 1 });

export const InviteModel = mongoose.model<InviteDocument>('Invite', inviteSchema);
