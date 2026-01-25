import type { Interpretation } from '../types.js';

const YES_KEYWORDS = ['כן', 'מגיע', 'אני בא', 'נכון', 'סבבה', 'בסדר', 'אוקיי', 'ok', 'yes', 'yeah'];
const NO_KEYWORDS = ['לא', 'לא מגיע', 'לא יכול', 'לא נוכל', 'no', 'nope'];
const MAYBE_KEYWORDS = ['תלוי', 'אולי', 'עוד לא סגור', 'לא בטוח', 'maybe', 'perhaps', 'possibly'];

export function extractHeadcount(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  // Direct digits
  const digitMatch = normalized.match(/\b(\d+)\b/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num > 0 && num <= 20) {
      // Reasonable headcount range
      return num;
    }
  }

  // Hebrew phrases
  if (normalized.includes('זוג') || normalized.includes('couple')) {
    return 2;
  }

  if (normalized.includes('אני') && !normalized.includes('ועוד') && !normalized.includes('+')) {
    return 1;
  }

  // "אני+1" or "אני ועוד אחד" patterns
  if (
    normalized.includes('אני+1') ||
    normalized.includes('אני ועוד אחד') ||
    normalized.includes('אני ועוד 1') ||
    normalized.includes('me+1') ||
    normalized.includes('me + 1')
  ) {
    return 2;
  }

  // "אני ועוד שניים" = 3, etc.
  const ועודMatch = normalized.match(/אני\s*ועוד\s*(\d+)/);
  if (ועודMatch) {
    const num = parseInt(ועודMatch[1], 10);
    if (num > 0 && num <= 10) {
      return 1 + num; // "אני" (1) + the number
    }
  }

  return null;
}

export function detectLanguage(text: string): 'he' | 'en' {
  // Simple heuristic: if contains Hebrew characters, it's Hebrew
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text) ? 'he' : 'en';
}

export function interpretWithRules(text: string): Interpretation {
  const normalized = text.toLowerCase().trim();
  const language = detectLanguage(text);

  // Check for YES
  const hasYes = YES_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (hasYes) {
    const headcount = extractHeadcount(text);
    return {
      rsvp: 'YES',
      headcount,
      confidence: 0.9,
      needsHeadcount: headcount === null,
      language,
    };
  }

  // Check for NO
  const hasNo = NO_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (hasNo) {
    return {
      rsvp: 'NO',
      headcount: null,
      confidence: 0.9,
      needsHeadcount: false,
      language,
    };
  }

  // Check for MAYBE
  const hasMaybe = MAYBE_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (hasMaybe) {
    return {
      rsvp: 'MAYBE',
      headcount: null,
      confidence: 0.85,
      needsHeadcount: false,
      language,
    };
  }

  // Try to extract headcount even if no clear RSVP intent
  const headcount = extractHeadcount(text);
  if (headcount !== null) {
    // If we found a headcount but no clear intent, confidence is lower
    return {
      rsvp: 'UNKNOWN',
      headcount,
      confidence: 0.5,
      needsHeadcount: false,
      language,
    };
  }

  // No clear match
  return {
    rsvp: 'UNKNOWN',
    headcount: null,
    confidence: 0.3,
    needsHeadcount: false,
    language,
  };
}
