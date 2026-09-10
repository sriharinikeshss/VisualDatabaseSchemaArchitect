import { Handle, Position } from '@xyflow/react';
import type { Table } from '../types/schema';

interface TableNodeProps {
  data: Table;
}

export default function TableNode({ data }: TableNodeProps) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-md shadow-md min-w-[200px] text-left">
      {/* Target Handle for incoming relationships */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      
      <div className="bg-slate-100 px-4 py-2 border-b-2 border-slate-200 rounded-t-sm font-bold text-slate-800 flex justify-between items-center">
        <span>{data.name}</span>
      </div>

      <div className="flex flex-col py-2">
        {data.columns.map((col) => (
          <div key={col.column_id} className="flex justify-between items-center px-4 py-1 text-sm hover:bg-slate-50">
            <div className="flex items-center gap-2">
              {col.is_primary_key && <span className="text-amber-500 font-bold text-xs" title="Primary Key">PK</span>}
              <span className="font-medium text-slate-700">{col.name}</span>
            </div>
            <span className="text-slate-400 text-xs font-mono ml-4">{col.datatype}</span>
          </div>
        ))}
        {data.columns.length === 0 && (
          <div className="px-4 py-2 text-sm text-slate-400 italic text-center">No columns</div>
        )}
      </div>

      {/* Source Handle for outgoing relationships */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-emerald-500" />
    </div>
  );
}
