import { z } from 'zod';

// ─── RSVP Status ──────────────────────────────────────────────────────────────
export const rsvpStatusSchema = z.enum(['NO_RESPONSE', 'YES', 'NO', 'MAYBE']);
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;
/** Runtime array of all valid RSVP status values */
export const RSVP_STATUSES = rsvpStatusSchema.options;

// ─── Campaign Status ──────────────────────────────────────────────────────────
export const campaignStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED']);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
/** Runtime array of all valid campaign status values */
export const CAMPAIGN_STATUSES = campaignStatusSchema.options;

// ─── Campaign API contract ────────────────────────────────────────────────────
export const createCampaignGuestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
});
export type CreateCampaignGuestInput = z.infer<typeof createCampaignGuestSchema>;

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  eventTitle: z.string().min(1),
  eventDate: z.string().optional(),
  scheduledAt: z.string().datetime(),
  guests: z.array(createCampaignGuestSchema).min(1),
});
export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;
