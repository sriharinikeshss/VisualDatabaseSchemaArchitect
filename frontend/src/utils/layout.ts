import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

// Estimated node dimensions — must match what TableNode renders on screen.
// We over-estimate height so dagre leaves enough vertical breathing room.
const NODE_WIDTH = 280;
const BASE_NODE_HEIGHT = 160; // header + a few rows
const ROW_HEIGHT = 28;        // px per column row in the table card
const MAX_COLUMNS_ESTIMATE = 12;

function estimateNodeHeight(node: Node): number {
  const columnCount = (node.data as any)?.columns?.length ?? 6;
  return BASE_NODE_HEIGHT + Math.min(columnCount, MAX_COLUMNS_ESTIMATE) * ROW_HEIGHT;
}

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' | 'RL' | 'BT' = 'LR',
) {
  const dagreGraph = new dagre.graphlib.Graph({ multigraph: false });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    // Horizontal gap between rank columns (LR = space between table columns)
    ranksep: 180,
    // Vertical gap between sibling nodes in the same rank
    nodesep: 80,
    // Edge routing algorithm — 'network-simplex' gives the neatest edges
    ranker: 'network-simplex',
    marginx: 60,
    marginy: 60,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateNodeHeight(node),
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    const h = estimateNodeHeight(node);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - h / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
}
