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

RSVP CLASSIFICATION RULES:
- YES: Guest is clearly coming ("כן", "נגיע", "אני בא/ה", "נבוא", "בטח")
- NO: Guest is clearly NOT coming ("לא", "לא נגיע", "לא אגיע", "לא נוכל")
- MAYBE: Guest is UNCERTAIN, possibly coming
- UNKNOWN: Message has no clear RSVP intent

CRITICAL RULE - HEBREW UNCERTAINTY PHRASES (THESE ARE MAYBE OR UNKNOWN, NEVER NO):
- "לא בטוח" / "לא בטוחה" = "not sure" → MAYBE
- "לא סגור" / "לא סגורה" = "not finalized" → MAYBE
- "יש מצב" / "יש מצב שנגיע" = "there's a chance we'll come" → MAYBE
- "אולי" = "maybe" → MAYBE
- "תלוי" = "depends" → MAYBE
- "לא ידוע" / "לא יודע" / "לא יודעת" = "don't know" → UNKNOWN (confidence ≤ 0.5)
- "עוד לא ידוע" / "עדיין לא ידוע" = "still unknown" → UNKNOWN

KEY RULE: "לא" (not) modifies the following word. "לא בטוח" = "not certain" ≠ "not coming".
- "לא נגיע" = "won't come" → NO
- "לא בטוח שנגיע" = "not sure we'll come" → MAYBE
- "לא ידוע" = "don't know" → UNKNOWN (NOT NO)

HEADCOUNT EXTRACTION RULES:
- headcount: Extract number of attendees if mentioned, otherwise null (for backwards compatibility)
- headcountExtraction: Explicit headcount extraction result
  - kind: "exact" if you can compute a confident integer count
  - kind: "ambiguous" if quantity is mentioned but unclear (e.g., "kids" without number, ranges)
  - kind: "none" if no quantity signal at all
  - reason: Only if kind === "ambiguous"
    - "FAMILY_TERM": Family terms without explicit number (kids/children/ילדים/family/משפחה)
    - "RELATIONAL": Relational phrases where count not fully derivable (e.g., "אנחנו", "we")
    - "RANGE_OR_APPROX": Ranges or approximations (בערך, around, 2-3)
    - "UNKNOWN": Other ambiguous cases
- "זוג" = "couple" = exactly 2 people → headcountExtraction: { kind: "exact", headcount: 2 }
- "אנחנו" alone (without a number) = "we" → headcountExtraction: { kind: "ambiguous", reason: "RELATIONAL" }
- NEVER guess how many kids/children/family members
- If "kids/children/ילדים/family/משפחה" appears without a number: kind="ambiguous", reason="FAMILY_TERM"
- If range/approx detected: kind="ambiguous", reason="RANGE_OR_APPROX"
- needsHeadcount: true if rsvp is YES and headcountExtraction.kind !== "exact"
- language: Detect the language of the message (he/en)

Examples:
- "כן, אני והילדים" => { rsvp: "YES", headcountExtraction: { kind: "ambiguous", reason: "FAMILY_TERM" }, needsHeadcount: true }
- "מגיע, אני ואשתי" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 2 }, needsHeadcount: false }
- "Yes me and my wife and 2 kids" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 4 }, needsHeadcount: false }
- "רק אני" / "just me" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 1 }, needsHeadcount: false }
- "לא בטוח עדיין, יש מצב נגיע זוג" => { rsvp: "MAYBE", headcountExtraction: { kind: "exact", headcount: 2 }, confidence: 0.85, needsHeadcount: false }
- "לא ידוע" => { rsvp: "UNKNOWN", headcountExtraction: { kind: "none" }, confidence: 0.5, needsHeadcount: false }
- "לא יודע כמה נהיה" => { rsvp: "UNKNOWN", headcountExtraction: { kind: "none" }, confidence: 0.5, needsHeadcount: false }
- "בסוף אנחנו כן נגיע" => { rsvp: "YES", headcountExtraction: { kind: "ambiguous", reason: "RELATIONAL" }, confidence: 0.9, needsHeadcount: true }
- "אבל אם נגיע אז נהיה 2" => { rsvp: "YES", headcountExtraction: { kind: "exact", headcount: 2 }, confidence: 0.9, needsHeadcount: false }
- "אנחנו 2-3, עוד לא סגור" => { rsvp: "MAYBE", headcountExtraction: { kind: "ambiguous", reason: "RANGE_OR_APPROX" }, needsHeadcount: true }`;

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
