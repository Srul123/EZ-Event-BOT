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
  "headcountExtraction": {
    "kind": "exact" | "ambiguous" | "none",
    "headcount": number (only if kind === "exact"),
    "reason": string (only if kind === "ambiguous", one of: "FAMILY_TERM", "RELATIONAL", "RANGE_OR_APPROX", "UNKNOWN")
  },
  "confidence": number (0.0 to 1.0),
  "needsHeadcount": boolean,
  "language": "he" | "en"
}

Rules:
- rsvp: Classify the user's intent (YES/NO/MAYBE/UNKNOWN)
- headcount: Extract number of attendees if mentioned, otherwise null (for backwards compatibility)
- headcountExtraction: Explicit headcount extraction result
  - kind: "exact" if you can compute a confident integer count
  - kind: "ambiguous" if quantity is mentioned but unclear (e.g., "kids" without number, ranges)
  - kind: "none" if no quantity signal at all
  - reason: Only if kind === "ambiguous"
    - "FAMILY_TERM": Family terms without explicit number (kids/children/ילדים/family/משפחה)
    - "RELATIONAL": Relational phrases where count not fully derivable
    - "RANGE_OR_APPROX": Ranges or approximations (בערך, around, 2-3)
    - "UNKNOWN": Other ambiguous cases or contradictions
- confidence: Your confidence in the classification (0.0 to 1.0)
- needsHeadcount: true if rsvp is YES and headcountExtraction.kind !== "exact"
- language: Detect the language of the message (he/en)

CRITICAL RULES FOR HEADCOUNT DETECTION:
- Look for explicit numbers: "אנחנו 3", "3 people", "סהכ 4"
- Look for implied quantity: "אני והילדים", "me and my kids", "עם המשפחה"
- Look for relational phrases: "אני ואשתי", "me and my wife", "me, my wife, and 2 kids"
- NEVER guess how many kids/children/family members
- If "kids/children/ילדים/family/משפחה" appears without a number: set needsHeadcount=true and headcountExtraction.kind='ambiguous' (reason: 'FAMILY_TERM')
- If range/approx detected: set headcountExtraction.kind='ambiguous' (reason: 'RANGE_OR_APPROX')
- Be conservative: when in doubt, ask for clarification

Examples:
- "כן, אני והילדים" => { rsvp: "YES", headcountExtraction: { kind: "ambiguous", reason: "FAMILY_TERM" }, needsHeadcount: true }
- "מגיע, אני ואשתי" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 2 }, needsHeadcount: false }
- "Yes me and my wife and 2 kids" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 4 }, needsHeadcount: false }
- "אנחנו 2-3, עוד לא סגור" => { rsvp: "YES" or "MAYBE", headcountExtraction: { kind: "ambiguous", reason: "RANGE_OR_APPROX" }, needsHeadcount: true }
- "רק אני" / "just me" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 1 }, needsHeadcount: false }`;

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
