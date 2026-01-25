import { CampaignModel } from './campaign.model.js';
import { GuestModel } from './guest.model.js';
import type { CreateCampaignRequest } from './types.js';
import { logger } from '../../logger/logger.js';

export async function createCampaign(
  req: CreateCampaignRequest
): Promise<{ campaignId: string }> {
  if (!req.guests || req.guests.length < 1) {
    throw new Error('At least one guest is required');
  }

  const scheduledAt = new Date(req.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new Error('Invalid scheduledAt date');
  }

  const campaign = await CampaignModel.create({
    name: req.name,
    eventTitle: req.eventTitle,
    eventDate: req.eventDate,
    scheduledAt,
    status: 'SCHEDULED',
  });

  const guests = req.guests.map((guest) => ({
    campaignId: campaign._id,
    name: guest.name,
    phone: guest.phone,
    rsvpStatus: 'NO_RESPONSE' as const,
  }));

  await GuestModel.insertMany(guests);

  logger.info({ campaignId: campaign._id.toString() }, 'Campaign created with guests');

  return { campaignId: campaign._id.toString() };
}

export async function listCampaigns(): Promise<any[]> {
  const campaigns = await CampaignModel.find()
    .sort({ createdAt: -1 })
    .select('_id name eventTitle scheduledAt status createdAt')
    .lean();

  return campaigns.map((campaign) => ({
    id: campaign._id.toString(),
    name: campaign.name,
    eventTitle: campaign.eventTitle,
    scheduledAt: campaign.scheduledAt,
    status: campaign.status,
    createdAt: campaign.createdAt,
  }));
}

export async function getCampaignDetails(campaignId: string): Promise<any> {
  const campaign = await CampaignModel.findById(campaignId).lean();
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  const guests = await GuestModel.find({ campaignId })
    .select('_id name phone rsvpStatus headcount updatedAt')
    .lean();

  return {
    id: campaign._id.toString(),
    name: campaign.name,
    eventTitle: campaign.eventTitle,
    eventDate: campaign.eventDate,
    scheduledAt: campaign.scheduledAt,
    status: campaign.status,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    guests: guests.map((guest) => ({
      id: guest._id.toString(),
      name: guest.name,
      phone: guest.phone,
      rsvpStatus: guest.rsvpStatus,
      headcount: guest.headcount,
      updatedAt: guest.updatedAt,
    })),
  };
}
