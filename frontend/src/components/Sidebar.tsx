import { useState, useEffect } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import type { Column } from '../types/schema';

// Per-column editor with local state — only commits to store on Save
function ColumnEditor({ tableId, col }: { tableId: string; col: Column }) {
  const { updateColumn, removeColumn } = useSchemaStore();

  const [local, setLocal] = useState<Column>(col);
  const [dirty, setDirty] = useState(false);

  // Reset local state when the store column changes (table switch or external update)
  useEffect(() => {
    setLocal(col);
    setDirty(false);
  }, [col.column_id]);

  const set = (patch: Partial<Column>) => {
    setLocal(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateColumn(tableId, col.column_id, {
      name: local.name,
      datatype: local.datatype,
      is_primary_key: local.is_primary_key,
      is_not_null: local.is_not_null,
      is_unique: local.is_unique,
      check_constraint: local.check_constraint,
    });
    setDirty(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-[#121215] border border-zinc-800/80 rounded-xl relative group transition-colors hover:border-zinc-700">
      
      {/* Column Name Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Column Name</label>
          <button
            onClick={() => removeColumn(tableId, col.column_id)}
            className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Column"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={local.name}
            onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            className="flex-1 bg-[#09090b] border border-zinc-800 px-3 py-1.5 rounded-md text-xs font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-zinc-200 transition-all"
          />
        </div>
      </div>

      {/* Datatype Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Datatype</label>
        <select
          value={local.datatype}
          onChange={(e) => set({ datatype: e.target.value })}
          className="w-full bg-[#09090b] border border-zinc-800 px-3 py-1.5 rounded-md text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          {![
            'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
            'VARCHAR(255)', 'VARCHAR(100)', 'TEXT', 'CHAR(1)', 'BOOLEAN',
            'UUID', 'TIMESTAMP', 'TIMESTAMPTZ', 'DATE', 'TIME',
            'DECIMAL(10, 2)', 'NUMERIC(10, 2)', 'FLOAT', 'DOUBLE PRECISION',
            'JSONB', 'JSON'
          ].includes(local.datatype?.toUpperCase()) && (
            <option value={local.datatype}>{local.datatype} (Custom)</option>
          )}
          <optgroup label="Numeric">
            <option value="INTEGER">INTEGER</option>
            <option value="BIGINT">BIGINT</option>
            <option value="SMALLINT">SMALLINT</option>
            <option value="SERIAL">SERIAL</option>
            <option value="DECIMAL(10, 2)">DECIMAL(10, 2)</option>
            <option value="FLOAT">FLOAT</option>
          </optgroup>
          <optgroup label="String">
            <option value="VARCHAR(255)">VARCHAR(255)</option>
            <option value="TEXT">TEXT</option>
          </optgroup>
          <optgroup label="Date & Time">
            <option value="TIMESTAMP">TIMESTAMP</option>
            <option value="DATE">DATE</option>
          </optgroup>
          <optgroup label="Other">
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="UUID">UUID</option>
            <option value="JSONB">JSONB</option>
          </optgroup>
        </select>
      </div>

      {/* Sleek Pill Toggles for Flags */}
      <div className="flex flex-col gap-1.5 mt-1">
        <label className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Constraints</label>
        <div className="flex gap-2 items-center">
          {(['is_primary_key', 'is_not_null', 'is_unique'] as const).map((flag, i) => {
            const label = ['PK', 'NN', 'UQ'][i];
            const isSelected = local[flag];
            return (
              <button 
                key={flag} 
                onClick={() => set({ [flag]: !local[flag] })}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  isSelected 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[inset_0_0_10px_rgba(99,102,241,0.15)]' 
                    : 'bg-[#09090b] text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-400'
                }`}
              >
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Check Constraint */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">CHECK</label>
        </div>
        <input
          type="text"
          value={local.check_constraint || ''}
          onChange={(e) => set({ check_constraint: e.target.value })}
          className="w-full bg-[#09090b] px-3 py-1.5 border border-zinc-800 rounded-md text-xs font-mono focus:outline-none focus:border-indigo-500/50 text-zinc-300 placeholder-zinc-700"
          placeholder="e.g., age > 18"
        />
      </div>

      {/* Save Button */}
      {dirty && (
        <button
          onClick={handleSave}
          className="w-full font-bold text-xs py-1.5 mt-2 rounded-md transition-all shadow-sm bg-zinc-100 hover:bg-white text-zinc-900 border border-transparent hover:border-zinc-300 animate-in fade-in slide-in-from-top-1"
        >
          Save Changes
        </button>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { tables, selectedTableId, updateTable, addColumn, removeTable } = useSchemaStore();

  const table = tables.find(t => t.table_id === selectedTableId);
  if (!table) return null;

  const handleAddColumn = () => {
    addColumn(table.table_id, {
      name: 'new_column',
      datatype: 'VARCHAR(255)',
      is_primary_key: false,
      is_unique: false,
      is_not_null: false,
    });
  };

  const handleDeleteTable = () => {
    if (window.confirm(`Delete table '${table.name}'?`)) {
      removeTable(table.table_id);
    }
  };

  return (
    <div className="w-[340px] bg-[#09090b] border-l border-zinc-800 flex flex-col h-full text-zinc-100 shadow-xl z-20 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-[#09090b]">
        <div className="flex items-center gap-2 mb-2 text-zinc-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          <span className="text-[10px] font-bold tracking-widest uppercase">Table Inspector</span>
        </div>
        <input
          type="text"
          value={table.name}
          onChange={(e) => updateTable(table.table_id, e.target.value)}
          className="w-full bg-transparent font-mono text-base font-bold focus:outline-none focus:text-indigo-400 transition-colors text-zinc-100"
        />
      </div>

      <div className="flex border-b border-zinc-800 px-4 pt-3 gap-4 text-xs font-medium">
        <div className="pb-2 border-b-2 border-indigo-500 text-zinc-100">Columns ({table.columns.length})</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {table.columns.map((col) => (
          <ColumnEditor key={col.column_id} tableId={table.table_id} col={col} />
        ))}
        <button
          onClick={handleAddColumn}
          className="w-full py-2 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 rounded text-xs font-medium transition-colors"
        >
          + Add New Column
        </button>
      </div>

      <div className="p-4 bg-[#09090b] border-t border-zinc-800">
        <button
          onClick={handleDeleteTable}
          className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded font-semibold transition-colors text-xs"
        >
          Delete Table
        </button>
      </div>
    </div>
  );
}


