import { CampaignModel } from './campaign.model.js';
import { GuestModel } from './guest.model.js';
import { InviteModel } from './invite.model.js';
import { env } from '../../config/env.js';
import { logger } from '../../logger/logger.js';
import { randomBytes } from 'crypto';

export async function generateTelegramInviteLinks(
  campaignId: string
): Promise<{
  campaignId: string;
  botUsername: string;
  links: Array<{
    guestId: string;
    name: string;
    phone: string;
    link: string;
    token: string;
  }>;
}> {
  const campaign = await CampaignModel.findById(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const guests = await GuestModel.find({ campaignId }).lean();

  const botUsername = env.TELEGRAM_BOT_USERNAME;
  const links = [];

  for (const guest of guests) {
    // Generate a URL-safe token (10-14 chars)
    const tokenBytes = randomBytes(8);
    const token = tokenBytes.toString('base64url').substring(0, 12);
    const fullToken = `inv_${token}`;
    const link = `https://t.me/${botUsername}?start=${fullToken}`;

    // Persist the invite token
    await InviteModel.create({
      token: fullToken,
      guestId: guest._id,
      campaignId: campaign._id,
    });

    // Log the link
    logger.info(
      {
        campaign: campaignId,
        guest: guest._id.toString(),
        phone: guest.phone,
        name: guest.name,
        link,
      },
      '[LINK_SIM]'
    );

    links.push({
      guestId: guest._id.toString(),
      name: guest.name,
      phone: guest.phone,
      link,
      token: fullToken,
    });
  }

  return {
    campaignId,
    botUsername,
    links,
  };
}
