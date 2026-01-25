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
- Be consistent with the action type
- Keep it natural and friendly`;

  let prompt = `Generate a short Hebrew reply for this RSVP interaction:\n\n`;

  prompt += `Guest: ${flowContext.guestName}\n`;
  prompt += `Interpretation: ${interpretation.rsvp} (confidence: ${interpretation.confidence})\n`;
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
