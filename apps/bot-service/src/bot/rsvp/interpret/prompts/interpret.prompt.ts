export interface InterpretPromptParams {
  text: string;
  locale: 'he' | 'en';
  eventTitle?: string;
  eventDate?: string;
}

export function buildInterpretPrompt({
  text,
  locale,
  eventTitle,
  eventDate,
}: InterpretPromptParams): { system: string; prompt: string } {
  const system = `You are an RSVP classifier. Output ONLY valid JSON. No prose, no explanations, no markdown formatting.

You must output a JSON object with this exact structure:
{
  "rsvp": "YES" | "NO" | "MAYBE" | "UNKNOWN",
  "headcount": number | null,
  "confidence": number (0.0 to 1.0),
  "needsHeadcount": boolean,
  "language": "he" | "en"
}

Rules:
- rsvp: Classify the user's intent (YES/NO/MAYBE/UNKNOWN)
- headcount: Extract number of attendees if mentioned, otherwise null
- confidence: Your confidence in the classification (0.0 to 1.0)
- needsHeadcount: true if rsvp is YES but headcount is missing
- language: Detect the language of the message (he/en)`;

  let prompt = `Classify this RSVP message:\n\n"${text}"\n\n`;

  if (eventTitle) {
    prompt += `Event: ${eventTitle}\n`;
  }
  if (eventDate) {
    prompt += `Date: ${eventDate}\n`;
  }

  prompt += `\nOutput the JSON classification now.`;

  return { system, prompt };
}
