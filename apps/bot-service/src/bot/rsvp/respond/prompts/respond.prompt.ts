import type { Interpretation, Action, FlowContext } from '../../types.js';

export interface RespondPromptParams {
  interpretation: Interpretation;
  action: Action;
  flowContext: FlowContext;
}

export function buildRespondPrompt({
  interpretation,
  action,
  flowContext,
}: RespondPromptParams): { system: string; prompt: string } {
  const system = `You are a friendly Hebrew-speaking event RSVP bot. Output ONLY valid JSON with a 'reply' field containing the message text. No prose, no explanations, no markdown formatting.

Output format:
{
  "reply": "your message here"
}

Constraints:
- Write in Hebrew
- Maximum 2 short sentences
- At most 1 emoji (optional)
- Do NOT invent event details if they are not provided
- Keep it natural and friendly

TONE RULES BY RSVP STATUS (critical — never confuse these):
- YES with headcount: Confirm joyfully. e.g., "תודה! נרשמת 2 אנשים 🎉"
- YES without headcount: Ask how many will attend. e.g., "מעולה! כמה תהיו סהכ?"
- NO: Warm farewell. e.g., "תודה, נשמח לראות אותך בפעם הבאה."
- MAYBE: Acknowledge uncertainty positively, invite update later. e.g., "הבנתי! תעדכן אותי כשתדע."
  IMPORTANT FOR MAYBE: NEVER write "נשמח לראות אותך בפעם הבאה" — that phrase is reserved for NO only.
  NEVER sound like a farewell for MAYBE. The guest might still come.
- ACK (no change): Acknowledge their confirmation is already recorded. e.g., "תודה, כבר נרשמת!"`;

  // Extract the actual rsvpStatus being set (for SET_RSVP actions)
  const rsvpStatus = action.type === 'SET_RSVP' ? action.updates?.rsvpStatus : undefined;

  let prompt = `Generate a short Hebrew reply for this RSVP interaction:\n\n`;

  prompt += `Guest: ${flowContext.guestName}\n`;
  prompt += `Guest intent detected: ${interpretation.rsvp}\n`;
  if (rsvpStatus) {
    prompt += `New RSVP status being recorded: ${rsvpStatus}\n`;
  }
  prompt += `Action: ${action.type}\n`;

  if (flowContext.eventTitle) {
    prompt += `Event: ${flowContext.eventTitle}\n`;
  }
  if (flowContext.eventDate) {
    prompt += `Date: ${flowContext.eventDate}\n`;
  }

  if (interpretation.headcount !== null) {
    prompt += `Headcount: ${interpretation.headcount}\n`;
  }

  prompt += `\nGenerate the reply JSON now.`;

  return { system, prompt };
}
