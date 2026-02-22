import type { RsvpGraphPorts } from '../ports.js';
import type { RsvpAnnotation } from '../state.js';
import type { Action, GuestContext, EffectsPatch } from '../types.js';
import type { ClockPort } from '../ports.js';

export function buildEffects(
  action: Action,
  guestContext: GuestContext,
  clock: ClockPort,
): EffectsPatch {
  const now = clock.now();

  switch (action.type) {
    case 'SET_RSVP': {
      const statusChanged = action.rsvpStatus !== guestContext.currentRsvpStatus;
      const headcountChanged = action.headcount !== guestContext.currentHeadcount;
      const meaningfulChange = statusChanged || headcountChanged;

      const patch: EffectsPatch = {
        rsvpStatus: action.rsvpStatus,
        headcount: action.headcount,
        conversationState: 'DEFAULT',
        lastResponseAt: now,
        clarificationAttempts: 0,
      };

      if (meaningfulChange) {
        patch.rsvpUpdatedAt = now;
      }

      return patch;
    }

    case 'ASK_HEADCOUNT': {
      const statusChanged = guestContext.currentRsvpStatus !== 'YES';

      const patch: EffectsPatch = {
        rsvpStatus: 'YES',
        conversationState: 'YES_AWAITING_HEADCOUNT',
        lastResponseAt: now,
        clarificationAttempts: 0,
      };

      if (statusChanged) {
        patch.rsvpUpdatedAt = now;
      }

      return patch;
    }

    case 'CLARIFY_HEADCOUNT':
      return {
        conversationState: 'YES_AWAITING_HEADCOUNT',
        lastResponseAt: now,
        clarificationAttempts: action.attemptNumber,
        lastClarificationReason: action.reason ?? undefined,
      };

    case 'CLARIFY_INTENT':
      return { lastResponseAt: now };

    case 'ACK_NO_CHANGE':
      return { lastResponseAt: now };

    case 'STOP_WAITING_FOR_HEADCOUNT':
      return {
        conversationState: 'DEFAULT',
        lastResponseAt: now,
        clarificationAttempts: 0,
      };
  }
}

export function createBuildEffectsNode(ports: RsvpGraphPorts) {
  return (state: typeof RsvpAnnotation.State) => {
    if (!state.action) {
      return { effects: null };
    }

    const effects = buildEffects(state.action, state.guestContext, ports.clock);

    ports.logger.debug(
      {
        node: 'buildEffects',
        actionType: state.action.type,
        patchKeys: Object.keys(effects),
      },
      'Effects patch built',
    );

    return { effects };
  };
}
