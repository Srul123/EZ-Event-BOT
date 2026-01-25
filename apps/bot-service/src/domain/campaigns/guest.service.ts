import { GuestModel, type GuestDocument } from './guest.model.js';
import type { RsvpStatus } from './types.js';
import { logger } from '../../logger/logger.js';

export interface UpdateGuestRsvpParams {
  rsvpStatus?: RsvpStatus;
  headcount?: number | null;
  lastResponseAt?: Date;
  conversationState?: 'DEFAULT' | 'YES_AWAITING_HEADCOUNT';
}

export async function updateGuestRsvp(
  guestId: string,
  updates: UpdateGuestRsvpParams
): Promise<GuestDocument> {
  const guest = await GuestModel.findById(guestId);
  if (!guest) {
    throw new Error('Guest not found');
  }

  // Validate rsvpStatus if provided
  if (updates.rsvpStatus !== undefined) {
    const validStatuses: RsvpStatus[] = ['NO_RESPONSE', 'YES', 'NO', 'MAYBE'];
    if (!validStatuses.includes(updates.rsvpStatus)) {
      throw new Error(`Invalid rsvpStatus: ${updates.rsvpStatus}`);
    }
  }

  const updateData: Record<string, unknown> = {};
  const previousRsvpStatus = guest.rsvpStatus;
  const previousHeadcount = guest.headcount;

  // Handle rsvpStatus
  if (updates.rsvpStatus !== undefined) {
    updateData.rsvpStatus = updates.rsvpStatus;
  }

  // Handle headcount: undefined = no change, null = clear, number = set
  if (updates.headcount !== undefined) {
    if (updates.headcount === null) {
      updateData.headcount = null;
    } else if (typeof updates.headcount === 'number') {
      updateData.headcount = updates.headcount;
    }
  }

  // Handle conversationState
  if (updates.conversationState !== undefined) {
    updateData.conversationState = updates.conversationState;
  }

  // Always update lastResponseAt on meaningful messages
  if (updates.lastResponseAt !== undefined) {
    updateData.lastResponseAt = updates.lastResponseAt;
  }

  // Update rsvpUpdatedAt ONLY when:
  // - rsvpStatus changes, OR
  // - headcount changes (when rsvpStatus is YES)
  const rsvpStatusChanged = updates.rsvpStatus !== undefined && updates.rsvpStatus !== previousRsvpStatus;
  const headcountChanged =
    updates.headcount !== undefined &&
    updates.headcount !== previousHeadcount &&
    (updates.rsvpStatus === 'YES' || (updates.rsvpStatus === undefined && previousRsvpStatus === 'YES'));

  if (rsvpStatusChanged || headcountChanged) {
    updateData.rsvpUpdatedAt = new Date();
  }

  // Apply updates
  Object.assign(guest, updateData);
  await guest.save();

  logger.info(
    {
      guestId,
      updates: updateData,
      previousRsvpStatus,
      newRsvpStatus: guest.rsvpStatus,
    },
    'Guest RSVP updated'
  );

  return guest;
}
