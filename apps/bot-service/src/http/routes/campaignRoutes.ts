import { Router } from 'express';
import { z } from 'zod';
import { createCampaignSchema } from '@ez-event-bot/shared';
import {
  createCampaign,
  listCampaigns,
  getCampaignDetails,
  deleteCampaign,
} from '../../domain/campaigns/campaign.service.js';
import { generateTelegramInviteLinks } from '../../domain/campaigns/links.service.js';
import { logger } from '../../logger/logger.js';

const router = Router();
const campaignIdParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid campaign id'),
});

router.post('/campaigns', async (req, res) => {
  try {
    const validated = createCampaignSchema.parse(req.body);
    const result = await createCampaign(validated);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.errors }, 'Validation error creating campaign');
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    logger.error({ error }, 'Error creating campaign');
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create campaign',
    });
  }
});

router.get('/campaigns', async (_req, res) => {
  try {
    const campaigns = await listCampaigns();
    res.json(campaigns);
  } catch (error) {
    logger.error({ error }, 'Error listing campaigns');
    res.status(500).json({
      error: 'Failed to list campaigns',
    });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await getCampaignDetails(req.params.id);
    res.json(campaign);
  } catch (error) {
    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }
    logger.error({ error }, 'Error getting campaign details');
    res.status(500).json({
      error: 'Failed to get campaign details',
    });
  }
});

router.post('/campaigns/:id/generate-telegram-links', async (req, res) => {
  try {
    const result = await generateTelegramInviteLinks(req.params.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }
    logger.error({ error }, 'Error generating Telegram links');
    res.status(500).json({
      error: 'Failed to generate Telegram links',
    });
  }
});

router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = campaignIdParamsSchema.parse(req.params);
    const result = await deleteCampaign(id);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ error: error.errors }, 'Validation error deleting campaign');
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    if (error instanceof Error && error.message === 'Campaign not found') {
      res.status(404).json({
        error: 'Campaign not found',
      });
      return;
    }
    logger.error({ error }, 'Error deleting campaign');
    res.status(500).json({
      error: 'Failed to delete campaign',
    });
  }
});

export default router;
