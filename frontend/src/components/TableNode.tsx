import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { Table } from '../types/schema';
import { useSchemaStore } from '../store/useSchemaStore';

export default function TableNode({ data, selected }: NodeProps<Node<Table>>) {
  const { hoveredRelationshipId, relationships } = useSchemaStore();

  // Determine if this table is part of the currently hovered relationship
  const hoveredRel = hoveredRelationshipId
    ? relationships.find(r => r.relationship_id === hoveredRelationshipId)
    : null;
  const isSource = hoveredRel?.source_table_id === data.table_id;
  const isTarget = hoveredRel?.target_table_id === data.table_id;
  const isHighlighted = isSource || isTarget;
  const isDimmed = hoveredRelationshipId !== null && !isHighlighted;

  return (
    <div 
      className={`min-w-[260px] bg-[#18181b] rounded-md shadow-lg border transition-all duration-300 relative group ${
        isHighlighted
          ? isSource
            ? 'border-indigo-500 shadow-[0_0_0_2px_rgba(99,102,241,0.5),0_0_20px_rgba(99,102,241,0.25)] z-50'
            : 'border-violet-500 shadow-[0_0_0_2px_rgba(139,92,246,0.5),0_0_20px_rgba(139,92,246,0.25)] z-50'
          : selected
            ? 'border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,1),0_0_15px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20'
            : 'border-zinc-800'
      } ${isDimmed ? 'opacity-30 blur-[2px] scale-[0.98]' : 'opacity-100 scale-100'}`}
    >
      {/* Colored top accent bar — only visible on highlight */}
      {isHighlighted && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-md ${
            isSource ? 'bg-indigo-500' : 'bg-violet-500'
          }`}
        />
      )}

      {/* Table-level handles — full left/right edges */}
      <Handle type="source" position={Position.Right} id={`table-${data.table_id}-source-right`} className="!opacity-0 !w-4 !h-full !right-0 !top-0 !rounded-none !border-none !translate-y-0" style={{ top: 0, transform: 'none', height: '100%' }} />
      <Handle type="source" position={Position.Left} id={`table-${data.table_id}-source-left`} className="!opacity-0 !w-4 !h-full !left-0 !top-0 !rounded-none !border-none !translate-y-0" style={{ top: 0, transform: 'none', height: '100%' }} />
      <Handle type="target" position={Position.Left} id={`table-target-${data.table_id}-target-left`} className="!opacity-0 !w-4 !h-full !left-0 !top-0 !rounded-none !border-none !translate-y-0" style={{ top: 0, transform: 'none', height: '100%' }} />
      <Handle type="target" position={Position.Right} id={`table-target-${data.table_id}-target-right`} className="!opacity-0 !w-4 !h-full !right-0 !top-0 !rounded-none !border-none !translate-y-0" style={{ top: 0, transform: 'none', height: '100%' }} />

      {/* Header */}
      <div className="bg-[#18181b] px-4 py-2.5 border-b border-zinc-800 rounded-t-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
          <h3 className="font-mono text-xs font-bold text-white">{data.name}</h3>
          {/* Role badge shown only on hover-highlight */}
          {isHighlighted && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isSource
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              }`}
            >
              {isSource ? 'FROM' : 'TO'}
            </span>
          )}
        </div>
        <span className="text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 bg-[#121215] border border-zinc-800 rounded">{data.columns.length} cols</span>
      </div>

      {/* Columns */}
      <div className="flex flex-col py-1">
        {data.columns.map((col) => {
          const dt = col.datatype.toUpperCase();
          const isNumeric = ['INT', 'SERIAL', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE'].some(t => dt.includes(t));
          const isString = ['VARCHAR', 'TEXT', 'CHAR'].some(t => dt.includes(t));
          const isDate = ['TIME', 'DATE'].some(t => dt.includes(t));
          const dtColor = isNumeric ? 'text-blue-400/90' : isString ? 'text-emerald-400/90' : isDate ? 'text-pink-400/90' : 'text-zinc-500';

          return (
          <div key={col.column_id} className="relative flex items-center justify-between px-3 py-1.5 hover:bg-zinc-800/40 group/col">

            {/* Left side handles (Target + Source overlapping) */}
            <Handle type="target" position={Position.Left} id={`${col.column_id}-target-left`} className="!w-4 !h-7 !rounded-none !border-none !-left-2 !bg-transparent !opacity-100" style={{ top: '50%', transform: 'translateY(-50%)' }} />
            <Handle type="source" position={Position.Left} id={`${col.column_id}-source-left`} className="!w-4 !h-7 !rounded-none !border-none !-left-2 !bg-transparent !opacity-100" style={{ top: '50%', transform: 'translateY(-50%)' }} />

            <div className="flex items-center gap-3">
              {col.is_primary_key ? (
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-1 rounded uppercase">PK</span>
              ) : col.is_unique ? (
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-1 rounded uppercase">UQ</span>
              ) : (
                <span className="w-4 text-zinc-600 text-[10px] text-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block opacity-50"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg></span>
              )}
              <span className={`font-mono text-xs ${col.is_primary_key || col.is_unique ? 'text-white font-medium' : 'text-zinc-300'}`}>
                {col.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] font-medium tracking-wide ${dtColor}`}>
                {col.datatype}
              </span>

              {/* Right side handles with visual dot */}
              <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-zinc-700 group-hover/col:bg-blue-500 group-hover/col:scale-125 group-hover/col:shadow-[0_0_8px_2px_rgba(59,130,246,0.6)] transition-all duration-150 pointer-events-none" />
                
                <Handle type="source" position={Position.Right} id={`${col.column_id}-source-right`} className="!absolute !inset-0 !w-full !h-full !rounded-full !border-none !bg-transparent !opacity-100 !translate-y-0 !right-auto !top-auto" style={{ position: 'absolute', top: 0, left: 0, transform: 'none' }} />
                <Handle type="target" position={Position.Right} id={`${col.column_id}-target-right`} className="!absolute !inset-0 !w-full !h-full !rounded-full !border-none !bg-transparent !opacity-100 !translate-y-0 !right-auto !top-auto" style={{ position: 'absolute', top: 0, left: 0, transform: 'none' }} />
              </div>
            </div>
          </div>
          );
        })}
        {data.columns.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-3 italic font-mono">No columns</div>
        )}
      </div>

      {/* Right edge hover hint strip */}
      <div className="absolute right-0 top-0 h-full w-1 rounded-r-md opacity-0 group-hover:opacity-100 bg-gradient-to-b from-blue-500/0 via-blue-500/30 to-blue-500/0 pointer-events-none transition-opacity duration-200" />
    </div>
  );
}

