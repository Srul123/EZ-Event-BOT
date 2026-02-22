import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideAction, type DecideActionInput } from './decideAction.js';
import type {
  GuestContext,
  Interpretation,
  HeadcountExtraction,
  Action,
} from '../types.js';
import { buildEffects } from './buildEffects.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGuestContext(overrides: Partial<GuestContext> = {}): GuestContext {
  return {
    guestId: 'g1',
    guestName: 'Test',
    locale: 'he',
    currentRsvpStatus: 'NO_RESPONSE',
    currentHeadcount: null,
    conversationState: 'DEFAULT',
    clarificationAttempts: 0,
    ...overrides,
  };
}

function makeInterpretation(overrides: Partial<Interpretation> = {}): Interpretation {
  return {
    rsvp: 'UNKNOWN',
    headcount: null,
    headcountExtraction: { kind: 'none' },
    confidence: 0.9,
    needsHeadcount: false,
    language: 'he',
    ...overrides,
  };
}

const fakeClock = { now: () => new Date('2026-01-01T00:00:00Z') };

// ---------------------------------------------------------------------------
// DEFAULT state
// ---------------------------------------------------------------------------

describe('decideAction – DEFAULT state', () => {
  it('YES + exact headcount -> SET_RSVP with headcount', () => {
    const action = decideAction({
      guestContext: makeGuestContext(),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcount: 3,
        headcountExtraction: { kind: 'exact', headcount: 3 },
      }),
      headcountExtraction: null,
      messageText: 'כן, נגיע 3',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: 3,
    });
  });

  it('YES + no headcount -> ASK_HEADCOUNT', () => {
    const action = decideAction({
      guestContext: makeGuestContext(),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcountExtraction: { kind: 'none' },
      }),
      headcountExtraction: null,
      messageText: 'כן',
    });

    assert.equal(action.type, 'ASK_HEADCOUNT');
  });

  it('NO -> SET_RSVP NO', () => {
    const action = decideAction({
      guestContext: makeGuestContext(),
      interpretation: makeInterpretation({ rsvp: 'NO' }),
      headcountExtraction: null,
      messageText: 'לא',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'NO',
      headcount: null,
    });
  });

  it('MAYBE -> SET_RSVP MAYBE', () => {
    const action = decideAction({
      guestContext: makeGuestContext(),
      interpretation: makeInterpretation({ rsvp: 'MAYBE' }),
      headcountExtraction: null,
      messageText: 'אולי',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'MAYBE',
      headcount: null,
    });
  });

  it('UNKNOWN -> CLARIFY_INTENT', () => {
    const action = decideAction({
      guestContext: makeGuestContext(),
      interpretation: makeInterpretation({ rsvp: 'UNKNOWN' }),
      headcountExtraction: null,
      messageText: 'שלום',
    });

    assert.equal(action.type, 'CLARIFY_INTENT');
  });

  it('confirmed YES guest, same intent, no change keywords -> ACK_NO_CHANGE', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        currentHeadcount: 3,
      }),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcount: 3,
        headcountExtraction: { kind: 'exact', headcount: 3 },
      }),
      headcountExtraction: null,
      messageText: 'כן, נגיע',
    });

    assert.equal(action.type, 'ACK_NO_CHANGE');
  });

  it('confirmed YES guest, different headcount -> SET_RSVP (change detected)', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        currentHeadcount: 3,
      }),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcount: 5,
        headcountExtraction: { kind: 'exact', headcount: 5 },
      }),
      headcountExtraction: null,
      messageText: 'כן, נהיה 5',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: 5,
    });
  });

  it('headcount-only update for YES guest (UNKNOWN rsvp + exact headcount) -> SET_RSVP', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        currentHeadcount: 3,
      }),
      interpretation: makeInterpretation({
        rsvp: 'UNKNOWN',
        headcount: 5,
        headcountExtraction: { kind: 'exact', headcount: 5 },
      }),
      headcountExtraction: null,
      messageText: '5',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: 5,
    });
  });
});

// ---------------------------------------------------------------------------
// YES_AWAITING_HEADCOUNT state
// ---------------------------------------------------------------------------

describe('decideAction – YES_AWAITING_HEADCOUNT state', () => {
  it('exact non-fuzzy headcount -> SET_RSVP YES + headcount', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
      }),
      interpretation: null,
      headcountExtraction: { kind: 'exact', headcount: 4 },
      messageText: '4',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: 4,
    });
  });

  it('fuzzy exact headcount -> falls through (no fast-path)', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
      }),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcountExtraction: { kind: 'none' },
      }),
      headcountExtraction: { kind: 'exact', headcount: 3, fuzzy: true },
      messageText: 'שלושה',
    });

    // With fuzzy, the fast-path is skipped. interpretation.rsvp=YES with no headcount
    // → CLARIFY_HEADCOUNT
    assert.equal(action.type, 'CLARIFY_HEADCOUNT');
  });

  it('ambiguous headcount, attempt 1 -> CLARIFY_HEADCOUNT with attempt 2', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        clarificationAttempts: 1,
      }),
      interpretation: null,
      headcountExtraction: { kind: 'ambiguous', reason: 'FAMILY_TERM' },
      messageText: 'אני והילדים',
    });

    assert.equal(action.type, 'CLARIFY_HEADCOUNT');
    if (action.type === 'CLARIFY_HEADCOUNT') {
      assert.equal(action.reason, 'FAMILY_TERM');
      assert.equal(action.attemptNumber, 2);
    }
  });

  it('3 failed attempts -> STOP_WAITING_FOR_HEADCOUNT', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        clarificationAttempts: 3,
      }),
      interpretation: null,
      headcountExtraction: { kind: 'none' },
      messageText: 'לא יודע',
    });

    assert.equal(action.type, 'STOP_WAITING_FOR_HEADCOUNT');
  });

  it('"actually no" (fallback rsvp=NO) -> SET_RSVP NO, exits headcount loop', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        clarificationAttempts: 1,
      }),
      interpretation: makeInterpretation({ rsvp: 'NO' }),
      headcountExtraction: { kind: 'none' },
      messageText: 'בעצם לא',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'NO',
      headcount: null,
    });
  });

  it('"maybe" (fallback rsvp=MAYBE) -> SET_RSVP MAYBE, exits headcount loop', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        clarificationAttempts: 1,
      }),
      interpretation: makeInterpretation({ rsvp: 'MAYBE' }),
      headcountExtraction: { kind: 'none' },
      messageText: 'אולי',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'MAYBE',
      headcount: null,
    });
  });

  it('"yes we are 4" (fallback rsvp=YES + exact) -> SET_RSVP YES with headcount', () => {
    const action = decideAction({
      guestContext: makeGuestContext({
        currentRsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        clarificationAttempts: 1,
      }),
      interpretation: makeInterpretation({
        rsvp: 'YES',
        headcount: 4,
        headcountExtraction: { kind: 'exact', headcount: 4 },
      }),
      headcountExtraction: { kind: 'none' },
      messageText: 'כן נהיה 4',
    });

    assert.deepStrictEqual(action, {
      type: 'SET_RSVP',
      rsvpStatus: 'YES',
      headcount: 4,
    });
  });
});

// ---------------------------------------------------------------------------
// EffectsPatch correctness
// ---------------------------------------------------------------------------

describe('buildEffects – patch correctness', () => {
  it('ACK_NO_CHANGE -> patch contains only lastResponseAt', () => {
    const action: Action = { type: 'ACK_NO_CHANGE' };
    const ctx = makeGuestContext({ currentRsvpStatus: 'YES', currentHeadcount: 3 });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.lastResponseAt.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(patch.rsvpStatus, undefined);
    assert.equal(patch.headcount, undefined);
    assert.equal(patch.conversationState, undefined);
    assert.equal(patch.rsvpUpdatedAt, undefined);
  });

  it('CLARIFY_INTENT -> patch contains only lastResponseAt', () => {
    const action: Action = { type: 'CLARIFY_INTENT' };
    const ctx = makeGuestContext();
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.lastResponseAt.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(patch.rsvpStatus, undefined);
    assert.equal(patch.conversationState, undefined);
  });

  it('SET_RSVP with no actual change -> rsvpUpdatedAt absent', () => {
    const action: Action = { type: 'SET_RSVP', rsvpStatus: 'YES', headcount: 3 };
    const ctx = makeGuestContext({ currentRsvpStatus: 'YES', currentHeadcount: 3 });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.rsvpStatus, 'YES');
    assert.equal(patch.headcount, 3);
    assert.equal(patch.rsvpUpdatedAt, undefined);
  });

  it('SET_RSVP with actual change -> rsvpUpdatedAt present', () => {
    const action: Action = { type: 'SET_RSVP', rsvpStatus: 'YES', headcount: 5 };
    const ctx = makeGuestContext({ currentRsvpStatus: 'YES', currentHeadcount: 3 });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.rsvpStatus, 'YES');
    assert.equal(patch.headcount, 5);
    assert.ok(patch.rsvpUpdatedAt);
  });

  it('ASK_HEADCOUNT -> patch includes rsvpStatus YES (Option A)', () => {
    const action: Action = { type: 'ASK_HEADCOUNT' };
    const ctx = makeGuestContext({ currentRsvpStatus: 'NO_RESPONSE' });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.rsvpStatus, 'YES');
    assert.equal(patch.conversationState, 'YES_AWAITING_HEADCOUNT');
    assert.ok(patch.rsvpUpdatedAt);
  });

  it('ASK_HEADCOUNT for already-YES guest -> no rsvpUpdatedAt', () => {
    const action: Action = { type: 'ASK_HEADCOUNT' };
    const ctx = makeGuestContext({ currentRsvpStatus: 'YES' });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.rsvpStatus, 'YES');
    assert.equal(patch.rsvpUpdatedAt, undefined);
  });

  it('STOP_WAITING_FOR_HEADCOUNT -> resets to DEFAULT, no rsvpStatus', () => {
    const action: Action = { type: 'STOP_WAITING_FOR_HEADCOUNT' };
    const ctx = makeGuestContext({
      currentRsvpStatus: 'YES',
      conversationState: 'YES_AWAITING_HEADCOUNT',
    });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.conversationState, 'DEFAULT');
    assert.equal(patch.clarificationAttempts, 0);
    assert.equal(patch.rsvpStatus, undefined);
    assert.equal(patch.headcount, undefined);
  });

  it('CLARIFY_HEADCOUNT -> tracks attempt and reason', () => {
    const action: Action = {
      type: 'CLARIFY_HEADCOUNT',
      reason: 'FAMILY_TERM',
      attemptNumber: 2,
    };
    const ctx = makeGuestContext({
      currentRsvpStatus: 'YES',
      conversationState: 'YES_AWAITING_HEADCOUNT',
    });
    const patch = buildEffects(action, ctx, fakeClock);

    assert.equal(patch.conversationState, 'YES_AWAITING_HEADCOUNT');
    assert.equal(patch.clarificationAttempts, 2);
    assert.equal(patch.lastClarificationReason, 'FAMILY_TERM');
    assert.equal(patch.rsvpStatus, undefined);
  });
});
