import type { RsvpGraphPorts } from '../ports.js';
import type { RsvpAnnotation } from '../state.js';

export function createInterpretHeadcountNode(ports: RsvpGraphPorts) {
  return async (state: typeof RsvpAnnotation.State) => {
    const headcountExtraction = await ports.nlu.interpretHeadcountOnly(
      state.messageText,
      state.guestContext.locale,
    );

    ports.logger.debug(
      {
        node: 'interpretHeadcount',
        kind: headcountExtraction.kind,
        ...(headcountExtraction.kind === 'exact' && {
          headcount: headcountExtraction.headcount,
          fuzzy: headcountExtraction.fuzzy,
        }),
        ...(headcountExtraction.kind === 'ambiguous' && {
          reason: headcountExtraction.reason,
        }),
      },
      'Headcount-only extraction complete',
    );

    return { headcountExtraction };
  };
}
