import { InviteModel } from './invite.model.js';
import { GuestModel } from './guest.model.js';
import { logger } from '../../logger/logger.js';

export interface GuestSessionData {
  guestId: string;
  campaignId: string;
  name: string;
  phone: string;
  rsvpStatus: string;
  headcount?: number;
  conversationState?: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
  lastResponseAt?: Date;
}

export async function getGuestByToken(token: string): Promise<GuestSessionData | null> {
  try {
    const invite = await InviteModel.findOne({ token }).lean();
    if (!invite) {
      logger.warn({ token }, 'Invite token not found');
      return null;
    }

    const guest = await GuestModel.findById(invite.guestId).lean();
    if (!guest) {
      logger.warn({ guestId: invite.guestId.toString() }, 'Guest not found for invite');
      return null;
    }

    // Mark invite as used if not already used
    if (!invite.usedAt) {
      await InviteModel.updateOne(
        { _id: invite._id },
        { usedAt: new Date() }
      );
    }

    return {
      guestId: guest._id.toString(),
      campaignId: guest.campaignId.toString(),
      name: guest.name,
      phone: guest.phone,
      rsvpStatus: guest.rsvpStatus,
      headcount: guest.headcount,
      conversationState: guest.conversationState || 'DEFAULT',
      lastResponseAt: guest.lastResponseAt,
    };
  } catch (error) {
    logger.error({ error, token }, 'Error looking up guest by token');
    return null;
  }
}
