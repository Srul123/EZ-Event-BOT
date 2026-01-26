import type { Interpretation, HeadcountExtraction } from '../types.js';

const YES_KEYWORDS = ['כן', 'מגיע', 'אני בא', 'נכון', 'סבבה', 'בסדר', 'אוקיי', 'ok', 'yes', 'yeah'];
const NO_KEYWORDS = ['לא', 'לא מגיע', 'לא יכול', 'לא נוכל', 'no', 'nope'];
const MAYBE_KEYWORDS = ['תלוי', 'אולי', 'עוד לא סגור', 'לא בטוח', 'maybe', 'perhaps', 'possibly'];

/**
 * Hebrew number word mappings (0-10)
 * Includes all common variants for deterministic parsing.
 * Used for extracting headcount from Hebrew number words like "ארבע", "שלושה".
 */
const HEBREW_NUMBER_WORDS: Record<string, number> = {
  'אפס': 0,
  'אחד': 1,
  'אחת': 1,
  'שניים': 2,
  'שתיים': 2,
  'שני': 2,
  'שתי': 2,
  'שלושה': 3,
  'שלוש': 3,
  'ארבעה': 4,
  'ארבע': 4,
  'חמישה': 5,
  'חמש': 5,
  'שישה': 6,
  'שש': 6,
  'שבעה': 7,
  'שבע': 7,
  'שמונה': 8,
  'תשעה': 9,
  'תשע': 9,
  'עשרה': 10,
  'עשר': 10,
};

/**
 * Number word mappings (Hebrew and English, 0-10)
 * Used for normalizing natural language number expressions before headcount extraction.
 * This enables understanding of phrases like "אני ועוד שניים" or "three people total".
 */
const NUMBER_WORDS_HE: Record<string, number> = {
  'אחד': 1,
  'אחת': 1,
  'שניים': 2,
  'שתיים': 2,
  'שלושה': 3,
  'שלוש': 3,
  'ארבעה': 4,
  'ארבע': 4,
  'חמישה': 5,
  'חמש': 5,
  'שישה': 6,
  'שש': 6,
  'שבעה': 7,
  'שבע': 7,
  'שמונה': 8,
  'תשעה': 9,
  'תשע': 9,
  'עשרה': 10,
  'עשר': 10,
};

const NUMBER_WORDS_EN: Record<string, number> = {
  'zero': 0,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
};

/**
 * Normalizes Hebrew text for headcount extraction.
 * - lower-case, trim, remove punctuation
 * - collapse whitespace
 * - strip Hebrew niqqud (diacritical marks) if present
 * - tokenize by whitespace
 * - for each token, strip common single-letter Hebrew prefixes (ו, ה, ב, ל, כ, מ, ש) only if token length > 2
 * 
 * This helps handle typos and variants like "שנים" (typo of "שניים") or "שתיים" with prefixes.
 */
function normalizeHebrewText(text: string): { normalized: string; tokens: string[] } {
  // Lower-case and trim
  let normalized = text.toLowerCase().trim();
  
  // Remove punctuation (keep Hebrew characters and spaces)
  normalized = normalized.replace(/[^\u0590-\u05FF\s]/g, '');
  
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Strip Hebrew niqqud (diacritical marks)
  // Niqqud are in range \u0591-\u05C7
  normalized = normalized.replace(/[\u0591-\u05C7]/g, '');
  
  // Tokenize by whitespace
  const tokens = normalized.split(/\s+/).filter(t => t.length > 0);
  
  // Strip common single-letter Hebrew prefixes (ו, ה, ב, ל, כ, מ, ש) only if token length > 2
  const prefixPattern = /^[והבלכמש]/;
  const normalizedTokens = tokens.map(token => {
    if (token.length > 2 && prefixPattern.test(token)) {
      return token.substring(1);
    }
    return token;
  });
  
  return {
    normalized: normalizedTokens.join(' '),
    tokens: normalizedTokens,
  };
}

/**
 * Calculates Levenshtein distance between two strings.
 * Used for fuzzy matching of Hebrew number words with typos.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Context words that indicate the message is about headcount.
 * Used to gate fuzzy matching - only apply fuzzy if context suggests headcount intent.
 */
const HEADCOUNT_CONTEXT_WORDS = ['אנחנו', 'נהיה', 'מגיעים', 'בסוף', 'סהכ', 'כולל'];

/**
 * Checks if message has headcount context words or is very short.
 * Used to gate fuzzy matching to avoid false positives.
 */
function hasHeadcountContext(tokens: string[], normalized: string): boolean {
  // Check if message is very short (<= 3 tokens)
  if (tokens.length <= 3) {
    return true;
  }
  
  // Check if contains context words
  for (const contextWord of HEADCOUNT_CONTEXT_WORDS) {
    if (normalized.includes(contextWord)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extracts number from Hebrew number words with fuzzy matching support.
 * This helper is called when digit-based parsing didn't find a number.
 * 
 * Conservative principle: Only extracts when we can confidently identify a Hebrew number word.
 * Does NOT guess for family terms - those should be handled separately.
 * 
 * Supports common Hebrew number words 0-10 including variants:
 * - 0: "אפס"
 * - 1: "אחד", "אחת"
 * - 2: "שניים", "שתיים", "שני", "שתי"
 * - 3: "שלושה", "שלוש"
 * - 4: "ארבעה", "ארבע"
 * - 5: "חמישה", "חמש"
 * - 6: "שישה", "שש"
 * - 7: "שבעה", "שבע"
 * - 8: "שמונה"
 * - 9: "תשעה", "תשע"
 * - 10: "עשרה", "עשר"
 * 
 * Fix: Parse Hebrew number words for headcount replies (e.g., 'אנחנו נהיה ארבע')
 * 
 * @param text - The text to search for Hebrew number words
 * @param allowFuzzy - If true, attempt fuzzy matching (Levenshtein distance <= 1) for typos
 * @returns Object with extracted number and fuzzy flag, or null if no Hebrew number word found
 */
function extractNumberFromHebrewWords(
  text: string,
  allowFuzzy: boolean = false
): { number: number; fuzzy: boolean } | null {
  // Normalize the text
  const { normalized, tokens } = normalizeHebrewText(text);
  
  // First try exact match on normalized tokens
  for (const token of tokens) {
    if (token in HEBREW_NUMBER_WORDS) {
      return { number: HEBREW_NUMBER_WORDS[token], fuzzy: false };
    }
  }
  
  // If fuzzy matching is allowed and context suggests headcount intent
  if (allowFuzzy && hasHeadcountContext(tokens, normalized)) {
    // Try fuzzy matching for tokens length >= 3
    for (const token of tokens) {
      if (token.length >= 3) {
        // Check against all known Hebrew number words
        for (const [word, num] of Object.entries(HEBREW_NUMBER_WORDS)) {
          const distance = levenshteinDistance(token, word);
          if (distance <= 1) {
            // Found fuzzy match
            return { number: num, fuzzy: true };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Normalizes number words to digits in the text.
 * This is a conservative normalization - only exact matches for 0-10.
 * Does NOT normalize ranges or approximations ("a few" stays as-is).
 * 
 * Note: For Hebrew, we use a separate extraction function because word boundaries
 * don't work reliably with Hebrew characters in JavaScript regex.
 */
function normalizeNumberWords(text: string): string {
  let normalized = text;
  
  // English number words (word boundaries work for English)
  for (const [word, num] of Object.entries(NUMBER_WORDS_EN)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, num.toString());
  }
  
  // For Hebrew, we'll extract directly in extractHeadcount() using extractNumberFromHebrewWords()
  // This avoids issues with word boundaries in Hebrew text
  
  return normalized;
}

/**
 * Extracts headcount from text, returning a HeadcountExtraction result.
 * This function distinguishes between exact counts, ambiguous mentions, and no signal.
 * 
 * IMPORTANT: Never guesses counts for family terms (kids/children/family).
 * Only returns exact when count can be computed deterministically.
 * 
 * @param text - The text to extract headcount from
 * @param allowFuzzy - If true, allow fuzzy matching for Hebrew number words (only in YES_AWAITING_HEADCOUNT context)
 */
export function extractHeadcount(text: string, allowFuzzy: boolean = false): HeadcountExtraction {
  // Normalize Hebrew text first (handles niqqud, prefixes, etc.)
  const { normalized: normalizedHebrew, tokens } = normalizeHebrewText(text);
  
  // Also normalize English number words to digits
  const textWithNumbers = normalizeNumberWords(text);
  const normalized = textWithNumbers.toLowerCase().trim();

  // Check for ranges/approximations first (ambiguous)
  const rangePatterns = [
    /\bבערך\s*(\d+)/i, // בערך 3
    /\bכ-(\d+)/i, // כ-3
    /\b(\d+)\s*-\s*(\d+)/, // 2-3
    /\baround\s*(\d+)/i, // around 3
    /\babout\s*(\d+)/i, // about 3
  ];
  
  for (const pattern of rangePatterns) {
    if (pattern.test(normalized)) {
      return { kind: 'ambiguous', reason: 'RANGE_OR_APPROX' };
    }
  }

  // Check for ambiguous family terms (NO guessing)
  // Use normalized Hebrew text for checking Hebrew family terms (after prefix stripping)
  // Hebrew family terms - only ambiguous if no explicit number found
  const hebrewFamilyTerms = ['ילדים', 'משפחה', 'בנות', 'בנים'];
  for (const term of hebrewFamilyTerms) {
    if (normalizedHebrew.includes(term) || normalized.includes(term)) {
      // Check if there's an explicit number anywhere in the text (digits or Hebrew number words)
      const hasDigit = normalized.match(/\b(\d+)\b/);
      const hasHebrewNumber = extractNumberFromHebrewWords(normalizedHebrew, false); // No fuzzy for this check
      if (!hasDigit && !hasHebrewNumber) {
        // No number found - ambiguous
        return { kind: 'ambiguous', reason: 'FAMILY_TERM' };
      }
      // If number exists, continue to digit extraction logic below
    }
  }

  // English family terms - only ambiguous if no explicit number found
  const englishFamilyTerms = ['kids', 'children', 'family'];
  for (const term of englishFamilyTerms) {
    if (normalized.includes(term)) {
      // Check if there's an explicit number anywhere in the text (not just after the term)
      const hasNumber = normalized.match(/\b(\d+)\b/);
      if (!hasNumber) {
        // No number found - ambiguous
        return { kind: 'ambiguous', reason: 'FAMILY_TERM' };
      }
      // If number exists, continue to digit extraction logic below
    }
  }

  // Direct digits (after normalization)
  const allDigits = normalized.match(/\b(\d+)\b/g);
  if (allDigits && allDigits.length > 0) {
    // Check for contradictions: multiple different numbers
    const uniqueNumbers = new Set(allDigits.map(d => parseInt(d, 10)));
    if (uniqueNumbers.size > 1) {
      // Multiple different numbers detected - contradiction
      return { kind: 'ambiguous', reason: 'UNKNOWN' };
    }

    // Single number or all same numbers
    const num = parseInt(allDigits[0], 10);
    if (num > 0 && num <= 20) {
      return { kind: 'exact', headcount: num };
    }
  }

  // If no digits found, try extracting Hebrew number words
  // This handles cases like "אנחנו נהיה ארבע" or "נהיה שלושה"
  const hebrewNumberResult = extractNumberFromHebrewWords(normalizedHebrew, allowFuzzy);
  if (hebrewNumberResult !== null && hebrewNumberResult.number > 0 && hebrewNumberResult.number <= 20) {
    const hebrewNumber = hebrewNumberResult.number;
    const isFuzzy = hebrewNumberResult.fuzzy;
    // Found a Hebrew number word
    // But be conservative: if there are family terms, the number might refer to them, not the total
    // Check if text contains family terms that might make the number ambiguous
    // Use normalizedHebrew for Hebrew terms (after prefix stripping)
    const hasFamilyTerm = 
      normalizedHebrew.includes('ילדים') ||
      normalizedHebrew.includes('משפחה') ||
      normalizedHebrew.includes('בנות') ||
      normalizedHebrew.includes('בנים') ||
      normalized.includes('kids') ||
      normalized.includes('children') ||
      normalized.includes('family');
    
    if (hasFamilyTerm) {
      // Family term present - the Hebrew number might refer to the family members, not total
      // Only return exact if there's an explicit total indicator like "סהכ", "כולל", "total", "אנחנו"
      // The presence of "אנחנו" (we) or "נהיה" (we will be) suggests the number refers to total
      const hasExplicitTotal = 
        normalized.includes('סהכ') ||
        normalized.includes('כולל') ||
        normalized.includes('total') ||
        normalized.includes('אנחנו') ||
        normalized.includes('נהיה') ||
        normalized.match(/(?:we\s+are|we're)\s+\d+/i);
      
      if (!hasExplicitTotal) {
        // Conservative: don't guess - the number might refer to family members
        return { kind: 'ambiguous', reason: 'FAMILY_TERM' };
      }
    }
    
    // Check for contradictions: if there are other numbers mentioned
    const allNumbers: number[] = [];
    if (allDigits) {
      allNumbers.push(...allDigits.map(d => parseInt(d, 10)));
    }
    allNumbers.push(hebrewNumber);
    
    const uniqueNumbers = new Set(allNumbers);
    if (uniqueNumbers.size > 1) {
      // Contradiction: Hebrew number word conflicts with digits
      return { kind: 'ambiguous', reason: 'UNKNOWN' };
    }
    
    // Safe to return exact count (with fuzzy flag if applicable)
    return { kind: 'exact', headcount: hebrewNumber, fuzzy: isFuzzy };
  }

  // Hebrew phrases - deterministic
  if (normalized.includes('זוג') || normalized.includes('couple')) {
    return { kind: 'exact', headcount: 2 };
  }

  // "רק אני" / "just me" patterns
  if (
    (normalized.includes('רק אני') || normalized.includes('רק אני')) &&
    !normalized.includes('ועוד') &&
    !normalized.includes('+')
  ) {
    return { kind: 'exact', headcount: 1 };
  }
  if (normalized.match(/\bjust\s+me\b/i) && !normalized.includes('and') && !normalized.includes('with')) {
    return { kind: 'exact', headcount: 1 };
  }

  // Deterministic spouse patterns
  // Hebrew: "אני ואשתי", "אני ובעלי"
  const hebrewSpousePatterns = [
    /אני\s+(?:ו|ועם)\s*אשתי/i,
    /אני\s+(?:ו|ועם)\s*בעלי/i,
    /אני\s+(?:ו|ועם)\s*בעלה/i,
  ];
  for (const pattern of hebrewSpousePatterns) {
    if (pattern.test(normalized)) {
      return { kind: 'exact', headcount: 2 };
    }
  }

  // English: "me and my wife", "me and my husband"
  const englishSpousePatterns = [
    /\bme\s+(?:and|with)\s+my\s+wife\b/i,
    /\bme\s+(?:and|with)\s+my\s+husband\b/i,
    /\bmy\s+wife\s+and\s+i\b/i,
    /\bmy\s+husband\s+and\s+i\b/i,
  ];
  for (const pattern of englishSpousePatterns) {
    if (pattern.test(normalized)) {
      return { kind: 'exact', headcount: 2 };
    }
  }

  // Singular child detection - ONLY when clearly singular
  // Hebrew: "ילד" or "הילד" (singular, not plural "ילדים")
  // IMPORTANT: Only if clearly singular in context, otherwise mark as ambiguous
  const hebrewSingularChild = /(?:אני\s+(?:ו|ועם)\s*)?(?:הילד|ילד)\s*(?:אחד|אחת)?(?!ים)/i;
  if (hebrewSingularChild.test(normalized) && !normalized.includes('ילדים')) {
    // Check if there's already a count mentioned
    const existingCount = normalized.match(/\b(\d+)\b/);
    if (existingCount) {
      const count = parseInt(existingCount[1], 10);
      return { kind: 'exact', headcount: count };
    }
    // "אני והילד" = 2 (me + 1 child)
    if (normalized.includes('אני')) {
      return { kind: 'exact', headcount: 2 };
    }
    // Just "ילד" without context - be conservative
    return { kind: 'ambiguous', reason: 'FAMILY_TERM' };
  }

  // English: "child" (singular, not plural "children")
  // IMPORTANT: Only if clearly singular, otherwise mark as ambiguous
  const englishSingularChild = /\b(?:me\s+(?:and|with)\s+)?(?:my\s+)?child\b(?!ren)/i;
  if (englishSingularChild.test(normalized) && !normalized.includes('children')) {
    // Check if there's already a count mentioned
    const existingCount = normalized.match(/\b(\d+)\b/);
    if (existingCount) {
      const count = parseInt(existingCount[1], 10);
      return { kind: 'exact', headcount: count };
    }
    // "me and my child" = 2 (me + 1 child)
    if (normalized.includes('me')) {
      return { kind: 'exact', headcount: 2 };
    }
    // Just "child" without context - be conservative
    return { kind: 'ambiguous', reason: 'FAMILY_TERM' };
  }

  // "אני+1" or "אני ועוד אחד" patterns
  if (
    normalized.includes('אני+1') ||
    normalized.includes('אני ועוד אחד') ||
    normalized.includes('אני ועוד 1') ||
    normalized.includes('me+1') ||
    normalized.includes('me + 1')
  ) {
    return { kind: 'exact', headcount: 2 };
  }

  // "אני ועוד שניים" = 3, etc. (after normalization, numbers are digits)
  const ועודMatch = normalized.match(/אני\s*ועוד\s*(\d+)/);
  if (ועודMatch) {
    const num = parseInt(ועודMatch[1], 10);
    if (num > 0 && num <= 10) {
      return { kind: 'exact', headcount: 1 + num }; // "אני" (1) + the number
    }
  }

  // "me and X" patterns where X is a number
  const meAndNumberMatch = normalized.match(/\bme\s+(?:and|with|,)\s+(\d+)/i);
  if (meAndNumberMatch) {
    const num = parseInt(meAndNumberMatch[1], 10);
    if (num > 0 && num <= 10) {
      return { kind: 'exact', headcount: 1 + num };
    }
  }

  // "אנחנו X" / "we are X" patterns
  const weAreMatch = normalized.match(/(?:אנחנו|we\s+are|we're)\s+(\d+)/i);
  if (weAreMatch) {
    const num = parseInt(weAreMatch[1], 10);
    if (num > 0 && num <= 20) {
      return { kind: 'exact', headcount: num };
    }
  }

  // "סהכ X" / "total X" patterns
  const totalMatch = normalized.match(/(?:סהכ|total|כולל)\s+(\d+)/i);
  if (totalMatch) {
    const num = parseInt(totalMatch[1], 10);
    if (num > 0 && num <= 20) {
      return { kind: 'exact', headcount: num };
    }
  }

  // Relational patterns that might be ambiguous
  // "אני וX" where X is not a number and not a spouse
  const relationalMatch = normalized.match(/אני\s+(?:ו|ועם)\s*([^\d]+)/);
  if (relationalMatch) {
    const other = relationalMatch[1].trim();
    // If it's a known entity we can count, return exact
    // Otherwise, mark as ambiguous
    if (other.includes('אשתי') || other.includes('בעלי') || other.includes('wife') || other.includes('husband')) {
      return { kind: 'exact', headcount: 2 };
    }
    // Unknown relational - mark as ambiguous
    return { kind: 'ambiguous', reason: 'RELATIONAL' };
  }

  // No signal found
  return { kind: 'none' };
}

export function detectLanguage(text: string): 'he' | 'en' {
  // Simple heuristic: if contains Hebrew characters, it's Hebrew
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text) ? 'he' : 'en';
}

export function interpretWithRules(text: string): Interpretation {
  const normalized = text.toLowerCase().trim();
  const language = detectLanguage(text);

  // Extract headcount using new extraction logic
  const headcountExtraction = extractHeadcount(text);

  // Derive backwards-compatible headcount and needsHeadcount
  let headcount: number | null = null;
  let needsHeadcount = false;

  if (headcountExtraction.kind === 'exact') {
    headcount = headcountExtraction.headcount;
    needsHeadcount = false;
  } else if (headcountExtraction.kind === 'ambiguous') {
    needsHeadcount = true;
  } else {
    // kind === 'none'
    needsHeadcount = false;
  }

  // Check for YES
  const hasYes = YES_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (hasYes) {
    return {
      rsvp: 'YES',
      headcount,
      headcountExtraction,
      confidence: 0.9,
      needsHeadcount: headcountExtraction.kind !== 'exact',
      language,
    };
  }

  // Check for NO
  const hasNo = NO_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
  if (hasNo) {
    return {
      rsvp: 'NO',
      headcount: null,
      headcountExtraction: { kind: 'none' },
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
      headcountExtraction: { kind: 'none' },
      confidence: 0.85,
      needsHeadcount: false,
      language,
    };
  }

  // Try to extract headcount even if no clear RSVP intent
  if (headcountExtraction.kind === 'exact') {
    // If we found a headcount but no clear intent, confidence is lower
    return {
      rsvp: 'UNKNOWN',
      headcount: headcountExtraction.headcount,
      headcountExtraction,
      confidence: 0.5,
      needsHeadcount: false,
      language,
    };
  }

  // No clear match
  return {
    rsvp: 'UNKNOWN',
    headcount: null,
    headcountExtraction: { kind: 'none' },
    confidence: 0.3,
    needsHeadcount: false,
    language,
  };
}
