import type { RsvpGraphPorts } from './ports.js';
import type { GraphInput, GraphOutput } from './types.js';
import { createRsvpGraph } from './graph.js';

export type { RsvpGraphPorts } from './ports.js';
export type {
  GraphInput,
  GraphOutput,
  GuestContext,
  Action,
  EffectsPatch,
} from './types.js';

export function createRsvpGraphRunner(
  ports: RsvpGraphPorts,
): (input: GraphInput) => Promise<GraphOutput> {
  const graph = createRsvpGraph(ports);

  return async (input: GraphInput): Promise<GraphOutput> => {
    const result = await graph.invoke({
      messageText: input.messageText,
      guestContext: input.guestContext,
      interpretation: null,
      headcountExtraction: null,
      action: null,
      replyText: '',
      effects: null,
    });

    return { replyText: result.replyText, effects: result.effects! };
  };
}
