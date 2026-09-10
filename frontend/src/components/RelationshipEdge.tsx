import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useSchemaStore } from '../store/useSchemaStore';

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  markerEnd,
}: EdgeProps) {
  const { removeRelationship } = useSchemaStore();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center justify-center gap-1"
        >
          {label && (
            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm border border-slate-200">
              {label}
            </span>
          )}
          <button
            className="w-5 h-5 bg-red-100 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shadow-sm border border-red-200 hover:border-red-600"
            onClick={() => removeRelationship(id)}
            title="Delete Relationship"
          >
            ✕
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
