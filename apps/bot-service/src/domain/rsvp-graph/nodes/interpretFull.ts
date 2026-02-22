import type { RsvpGraphPorts } from '../ports.js';
import type { RsvpAnnotation } from '../state.js';

export function createInterpretFullNode(ports: RsvpGraphPorts) {
  return async (state: typeof RsvpAnnotation.State) => {
    const interpretation = await ports.nlu.interpretMessage(
      state.messageText,
      state.guestContext,
    );

    ports.logger.debug(
      {
        node: 'interpretFull',
        rsvp: interpretation.rsvp,
        confidence: interpretation.confidence,
        headcountKind: interpretation.headcountExtraction.kind,
      },
      'Full NLU interpretation complete',
    );

    return { interpretation };
  };
}
