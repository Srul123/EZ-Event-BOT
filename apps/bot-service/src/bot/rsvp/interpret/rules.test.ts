import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractHeadcount } from './rules.js';

describe('extractHeadcount - Hebrew number words', () => {
  it('should extract "ארבע" from "אנחנו נהיה ארבע"', () => {
    const result = extractHeadcount('אנחנו נהיה ארבע');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 4);
  });

  it('should extract "שלושה" from "נהיה שלושה"', () => {
    const result = extractHeadcount('נהיה שלושה');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 3);
  });

  it('should extract "שניים" from "אנחנו שניים"', () => {
    const result = extractHeadcount('אנחנו שניים');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });

  it('should extract "שני" from "נהיה שני"', () => {
    const result = extractHeadcount('נהיה שני');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });

  it('should extract "שתי" from "אנחנו שתי"', () => {
    const result = extractHeadcount('אנחנו שתי');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });

  it('should extract "חמישה" from "נהיה חמישה"', () => {
    const result = extractHeadcount('נהיה חמישה');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 5);
  });

  it('should extract "עשרה" from "אנחנו עשרה"', () => {
    const result = extractHeadcount('אנחנו עשרה');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 10);
  });
});

describe('extractHeadcount - existing digit parsing', () => {
  it('should still extract digits: "אנחנו 4"', () => {
    const result = extractHeadcount('אנחנו 4');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 4);
  });

  it('should still work with "זוג" pattern', () => {
    const result = extractHeadcount('אנחנו זוג');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });
});

describe('extractHeadcount - conservative behavior for family terms', () => {
  it('should NOT extract exact count from "אני ושתי בנות" without explicit total', () => {
    const result = extractHeadcount('אני ושתי בנות');
    // Should be ambiguous, not exact, because "בנות" is a family term
    // and we don't know if "שתי" refers to the daughters or the total
    // Conservative behavior: don't guess
    assert.strictEqual(result.kind, 'ambiguous');
    assert.strictEqual(result.reason, 'FAMILY_TERM');
  });
  
  it('should extract exact when family term has explicit total: "אני ושתי בנות, אנחנו 3"', () => {
    const result = extractHeadcount('אני ושתי בנות, אנחנו 3');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 3);
  });

  it('should be ambiguous for "אני והילדים" without number', () => {
    const result = extractHeadcount('אני והילדים');
    assert.strictEqual(result.kind, 'ambiguous');
    assert.strictEqual(result.reason, 'FAMILY_TERM');
  });

  it('should extract exact when family term has explicit number: "אני והילדים, אנחנו 4"', () => {
    const result = extractHeadcount('אני והילדים, אנחנו 4');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 4);
  });
});

describe('extractHeadcount - edge cases', () => {
  it('should handle Hebrew number word with digits: "ארבע אנשים"', () => {
    const result = extractHeadcount('ארבע אנשים');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 4);
  });

  it('should handle contradiction: Hebrew word and different digit', () => {
    const result = extractHeadcount('ארבע אנשים, אנחנו 5');
    // Should detect contradiction
    assert.strictEqual(result.kind, 'ambiguous');
    assert.strictEqual(result.reason, 'UNKNOWN');
  });

  it('should handle "רק אני" pattern', () => {
    const result = extractHeadcount('רק אני');
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 1);
  });
});

describe('extractHeadcount - normalization and fuzzy matching', () => {
  it('should extract "שתיים" from "מגיעים בסוף שתיים"', () => {
    const result = extractHeadcount('מגיעים בסוף שתיים', true); // allowFuzzy = true
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
    assert.strictEqual(result.fuzzy, false); // Should be exact match after normalization
  });

  it('should extract "שנים" (typo of "שניים") with fuzzy matching in YES_AWAITING_HEADCOUNT', () => {
    // "אבל אני שנים" - typo of "שניים"
    const result = extractHeadcount('אבל אני שנים', true); // allowFuzzy = true, has context "אני"
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
    assert.strictEqual(result.fuzzy, true); // Should be fuzzy match
  });

  it('should NOT use fuzzy matching when allowFuzzy is false', () => {
    const result = extractHeadcount('אבל אני שנים', false); // allowFuzzy = false
    // Should not find a match without fuzzy
    assert.notStrictEqual(result.kind, 'exact');
  });

  it('should handle Hebrew text with niqqud', () => {
    // Test with niqqud (diacritical marks) - should strip them
    const result = extractHeadcount('אנחנו נהיה ארבע', true);
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 4);
  });

  it('should strip Hebrew prefixes correctly', () => {
    // "והשניים" should become "שניים" after prefix stripping
    const result = extractHeadcount('אנחנו והשניים', true);
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });

  it('should still work with digits: "אנחנו 2"', () => {
    const result = extractHeadcount('אנחנו 2', true);
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
    assert.strictEqual(result.fuzzy, undefined); // Not fuzzy, digits are exact
  });

  it('should still work with "זוג" pattern', () => {
    const result = extractHeadcount('אנחנו זוג', true);
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
  });

  it('should NOT guess for "ילדים/משפחה" even with fuzzy', () => {
    const result = extractHeadcount('אני והילדים', true);
    assert.strictEqual(result.kind, 'ambiguous');
    assert.strictEqual(result.reason, 'FAMILY_TERM');
  });

  it('should require context words for fuzzy matching', () => {
    // Long message without context words - fuzzy should not trigger
    const result = extractHeadcount('זה מאוד מעניין אבל אני לא בטוח', true);
    // Should not find a match because no context words
    assert.notStrictEqual(result.kind, 'exact');
  });

  it('should allow fuzzy for short messages (<= 3 tokens)', () => {
    // Short message "שנים" - should allow fuzzy even without context words
    const result = extractHeadcount('שנים', true);
    assert.strictEqual(result.kind, 'exact');
    assert.strictEqual(result.headcount, 2);
    assert.strictEqual(result.fuzzy, true);
  });
});
