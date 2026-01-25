import type { Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { getGuestByToken, type GuestSessionData } from '../../domain/campaigns/guest-session.service.js';
import { CampaignModel } from '../../domain/campaigns/campaign.model.js';
import { logger } from '../../logger/logger.js';

interface BotSession {
  guest?: GuestSessionData;
  eventTitle?: string;
  eventDate?: string;
}

interface SessionContext extends Context<Update> {
  session?: BotSession;
}

export async function startHandler(ctx: SessionContext): Promise<void> {
  // Initialize session if not present
  ctx.session = ctx.session ?? {};

  // Extract token from start parameter (e.g., /start inv_abc123)
  // Parse from message text: "/start inv_token" or "/start inv_token extra text"
  if (!ctx.message || !('text' in ctx.message)) {
    ctx.reply('Welcome! This is the EZ-Event bot. Use /help to see available commands.');
    return;
  }

  const messageText = ctx.message.text || '';
  const parts = messageText.split(' ');
  const token = parts.length > 1 ? parts[1] : undefined;

  if (token) {
    try {
      // Lookup guest by token
      const guestData = await getGuestByToken(token);

      if (guestData) {
        // Fetch Campaign to get eventTitle and eventDate
        const campaign = await CampaignModel.findById(guestData.campaignId).lean();
        if (campaign) {
          ctx.session.eventTitle = campaign.eventTitle;
          ctx.session.eventDate = campaign.eventDate;
        }

        // Store guest data in session
        ctx.session.guest = guestData;

        logger.info(
          {
            userId: ctx.from?.id,
            username: ctx.from?.username,
            guestId: guestData.guestId,
            token,
          },
          'Guest session initialized'
        );

        // Personalized invitation message
        let invitationMessage = `שלום ${guestData.name}! 👋\n\n`;
        
        if (campaign) {
          invitationMessage += `הוזמנת לאירוע: ${campaign.eventTitle}\n`;
          if (campaign.eventDate) {
            invitationMessage += `תאריך: ${campaign.eventDate}\n`;
          }
          invitationMessage += `\nאנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.`;
        } else {
          // Fallback if campaign not found
          invitationMessage += `הוזמנת לאירוע.\n\nאנא עדכן אותי אם תוכל להגיע. תוכל לכתוב "כן", "לא", "אולי" או כל הודעה אחרת.`;
        }
        
        ctx.reply(invitationMessage);
        return;
      } else {
        logger.warn({ token, userId: ctx.from?.id }, 'Invalid or expired invite token');
        ctx.reply('Sorry, this invite link is invalid or has expired. Please contact the event organizer.');
        return;
      }
    } catch (error) {
      logger.error({ error, token }, 'Error processing start command with token');
      ctx.reply('An error occurred while processing your invite. Please try again later.');
      return;
    }
  }

  // No token provided - generic welcome
  if (ctx.session.guest) {
    // User already has a session
    ctx.reply(`Welcome back ${ctx.session.guest.name}! 👋\n\nUse /help to see available commands.`);
  } else {
    // New user without token
    ctx.reply('Welcome! This is the EZ-Event bot. Use /help to see available commands.');
  }
}
