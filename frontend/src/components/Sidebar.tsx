import { useSchemaStore } from '../store/useSchemaStore';

export default function Sidebar() {
  const { 
    selectedTableId, 
    tables, 
    updateTable, 
    addColumn, 
    updateColumn, 
    removeColumn,
    removeTable,
    setSelectedTable
  } = useSchemaStore();

  const table = tables.find(t => t.table_id === selectedTableId);

  if (!table) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col shadow-xl z-10 h-full overflow-y-auto text-slate-500 justify-center items-center">
        <p className="text-center">Select a table on the canvas to edit its properties.</p>
      </div>
    );
  }

  const handleAddColumn = () => {
    addColumn(table.table_id, {
      name: 'new_column',
      datatype: 'varchar',
      is_primary_key: false,
      is_not_null: false,
      is_unique: false,
    });
  };

  const handleDeleteTable = () => {
    if (confirm(`Are you sure you want to delete the table '${table.name}'?`)) {
      removeTable(table.table_id);
      setSelectedTable(null);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10 h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 text-lg">Table Properties</h2>
        <button onClick={() => setSelectedTable(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Table Name</label>
          <input 
            type="text" 
            value={table.name}
            onChange={(e) => updateTable(table.table_id, e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Columns</label>
            <button onClick={handleAddColumn} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-semibold">+ Add</button>
          </div>
          
          <div className="flex flex-col gap-4">
            {table.columns.map((col) => (
              <div key={col.column_id} className="bg-slate-50 p-3 rounded border border-slate-200 relative">
                <button 
                  onClick={() => removeColumn(table.table_id, col.column_id)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold text-sm"
                  title="Remove column"
                >✕</button>
                
                <div className="mb-2 pr-6">
                  <input 
                    type="text" 
                    value={col.name}
                    onChange={(e) => updateColumn(table.table_id, col.column_id, { name: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Column name"
                  />
                </div>
                
                <div className="mb-2">
                  <select 
                    value={col.datatype}
                    onChange={(e) => updateColumn(table.table_id, col.column_id, { datatype: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="integer">integer</option>
                    <option value="varchar">varchar</option>
                    <option value="text">text</option>
                    <option value="boolean">boolean</option>
                    <option value="timestamp">timestamp</option>
                    <option value="date">date</option>
                    <option value="numeric">numeric</option>
                  </select>
                </div>
                
                <div className="flex gap-3 text-xs font-medium text-slate-600">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={col.is_primary_key}
                      onChange={(e) => updateColumn(table.table_id, col.column_id, { is_primary_key: e.target.checked })}
                    /> PK
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={col.is_unique}
                      onChange={(e) => updateColumn(table.table_id, col.column_id, { is_unique: e.target.checked })}
                    /> UQ
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={col.is_not_null}
                      onChange={(e) => updateColumn(table.table_id, col.column_id, { is_not_null: e.target.checked })}
                    /> NN
                  </label>
                </div>
                
                <div className="mt-2">
                  <input 
                    type="text" 
                    value={col.check_constraint || ''}
                    onChange={(e) => updateColumn(table.table_id, col.column_id, { check_constraint: e.target.value })}
                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:border-blue-500 placeholder-slate-300"
                    placeholder="CHECK (e.g., age > 18)"
                  />
                </div>
              </div>
            ))}
            {table.columns.length === 0 && (
              <p className="text-sm text-slate-400 italic">No columns defined.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <button 
          onClick={handleDeleteTable}
          className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded font-semibold transition-colors"
        >
          Delete Table
        </button>
      </div>
    </div>
  );
}
