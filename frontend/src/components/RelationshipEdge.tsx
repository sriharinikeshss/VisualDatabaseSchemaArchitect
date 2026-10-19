import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useSchemaStore } from '../store/useSchemaStore';

export default function RelationshipEdge({
  id,
  source, 
  target, 
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
}: EdgeProps) {
  const { removeRelationship, setHoveredRelationship, hoveredRelationshipId } = useSchemaStore();
  const isHovered = hoveredRelationshipId === id;
  const isDimmed = hoveredRelationshipId !== null && !isHovered;

  // 100% reliable way to detect self-loops: the edge starts and ends on the same node ID
  const isSelfLoop = source === target;

  // Standard orthogonal lines with rounded corners (this natively handles same-side loops perfectly!)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16, // Smoother corners look nicer on loops
  });

  return (
    <>
      <g
        onMouseEnter={() => setHoveredRelationship(id)}
        onMouseLeave={() => setHoveredRelationship(null)}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      >
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          interactionWidth={24}
          style={{
            strokeWidth: isHovered ? 3 : 2,
            stroke: isHovered ? '#818cf8' : '#3b82f6',
            opacity: isDimmed ? 0.2 : 1,
            strokeLinejoin: 'round',
            strokeLinecap: 'round',
            filter: isHovered
              ? 'drop-shadow(0 0 8px rgba(129,140,248,0.9))'
              : isDimmed ? 'none' : 'drop-shadow(0 0 4px rgba(59,130,246,0.6))',
            transition: 'stroke 0.2s ease, filter 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease',
          }}
        />
      </g>

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center justify-center gap-1"
          onMouseEnter={() => setHoveredRelationship(id)}
          onMouseLeave={() => setHoveredRelationship(null)}
        >
          {label && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold shadow-sm border transition-colors duration-150"
              style={
                isHovered
                  ? { background: '#312e81', color: '#c7d2fe', borderColor: '#6366f1' }
                  : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }
              }
            >
              {label}
            </span>
          )}
          <button
            className="w-5 h-5 bg-[#18181b] border border-zinc-700 hover:border-red-500 hover:text-red-400 text-zinc-500 rounded-full flex items-center justify-center shadow-md cursor-pointer transition-colors"
            onClick={() => removeRelationship(id)}
            title="Delete Relationship"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
