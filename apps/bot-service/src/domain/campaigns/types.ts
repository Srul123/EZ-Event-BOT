export type RsvpStatus = 'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CreateCampaignGuestInput = {
  name: string;
  phone: string;
};

export type CreateCampaignRequest = {
  name: string;
  eventTitle: string;
  eventDate?: string;
  scheduledAt: string; // ISO string in request
  guests: CreateCampaignGuestInput[];
};
