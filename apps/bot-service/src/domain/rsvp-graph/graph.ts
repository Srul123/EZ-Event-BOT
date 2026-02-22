import { END, START, StateGraph } from '@langchain/langgraph';
import { RsvpAnnotation } from './state.js';
import type { RsvpGraphPorts } from './ports.js';
import { createInterpretFullNode } from './nodes/interpretFull.js';
import { createInterpretHeadcountNode } from './nodes/interpretHeadcount.js';
import { createDecideActionNode } from './nodes/decideAction.js';
import { createComposeReplyNode } from './nodes/composeReply.js';
import { createBuildEffectsNode } from './nodes/buildEffects.js';

function routeByStateRouter(state: typeof RsvpAnnotation.State) {
  return state.guestContext.conversationState;
}

function headcountResultRouter(state: typeof RsvpAnnotation.State) {
  const hc = state.headcountExtraction;
  const isExactAndConfident = hc?.kind === 'exact' && !hc.fuzzy;
  return isExactAndConfident ? 'decideAction' : 'interpretFull';
}

export function createRsvpGraph(ports: RsvpGraphPorts) {
  const graph = new StateGraph(RsvpAnnotation)
    .addNode('interpretFull', createInterpretFullNode(ports))
    .addNode('interpretHeadcount', createInterpretHeadcountNode(ports))
    .addNode('decideAction', createDecideActionNode(ports))
    .addNode('composeReply', createComposeReplyNode(ports))
    .addNode('buildEffects', createBuildEffectsNode(ports))
    .addConditionalEdges(START, routeByStateRouter, {
      DEFAULT: 'interpretFull',
      YES_AWAITING_HEADCOUNT: 'interpretHeadcount',
    })
    .addConditionalEdges('interpretHeadcount', headcountResultRouter, {
      decideAction: 'decideAction',
      interpretFull: 'interpretFull',
    })
    .addEdge('interpretFull', 'decideAction')
    .addEdge('decideAction', 'composeReply')
    .addEdge('composeReply', 'buildEffects')
    .addEdge('buildEffects', END);

  return graph.compile();
}
