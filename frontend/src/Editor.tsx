import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Position,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  Node,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSchemaStore } from './store/useSchemaStore';
import { useToastStore } from './store/useToastStore';
import ToastContainer from './components/ToastContainer';
import TableNode from './components/TableNode';
import RelationshipEdge from './components/RelationshipEdge';
import Sidebar from './components/Sidebar';
import ValidationReportPanel from './components/ValidationReportPanel';
import ChatSidebar from './components/ChatSidebar';
import TraceabilityPanel from './components/TraceabilityPanel';
import ExportModal from './components/ExportModal';
import { validateSchema } from './utils/validationEngine';
import { supabase } from './lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import type { Table } from './types/schema';

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

export default function Editor({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const { 
    tables,  
    relationships, 
    addTable, 
    updateTablePosition, 
    addRelationship,
    addColumn,
    setSelectedTable,
    selectedTableId,
    removeTable,
    removeRelationship,
    setValidationReports,
    toggleChat,
    isChatOpen,
    projectName,
    setProjectName
  } = useSchemaStore();

  const nodes: Node<Table>[] = useMemo(() => tables.map((t) => ({
    id: t.table_id,
    type: 'tableNode',
    position: t.position || { x: 0, y: 0 },
    data: { ...t },
  })), [tables]);

  const edges: Edge[] = useMemo(() => relationships.map((rel) => {
    const sourceTable = tables.find(t => t.table_id === rel.source_table_id);
    const targetTable = tables.find(t => t.table_id === rel.target_table_id);
    
    // Robustly find the FK column in the source table
    let fkColId = rel.fk_column_id;
    const fkExists = sourceTable?.columns.some(c => c.column_id === fkColId);
    if (!fkExists) {
      // Fallback: Try to find a column that looks like a foreign key
      const guessedFk = sourceTable?.columns.find(c => c.name.endsWith('_id') && !c.is_primary_key);
      fkColId = guessedFk?.column_id;
    }
    
    // The target table provides the Primary Key for the relationship.
    const pkColumn = targetTable?.columns.find(c => c.is_primary_key) || targetTable?.columns[0];

    // Determine relative positioning to snap to closest sides
    const isSelfLoop = rel.source_table_id === rel.target_table_id;
    let sourcePos, targetPos, sourceHandleId, targetHandleId;

    const baseSourceId = fkColId ?? `table-${rel.source_table_id}`;
    const baseTargetId = pkColumn?.column_id ?? `table-target-${rel.target_table_id}`;

    if (isSelfLoop) {
      // For self-referential relationships, route both ends to the Right side
      // React Flow's getSmoothStepPath will automatically draw a nice C-curve loop
      sourcePos = Position.Right;
      targetPos = Position.Right;
      sourceHandleId = `${baseSourceId}-source-right`;
      targetHandleId = `${baseTargetId}-target-right`;
    } else {
      const sourceX = sourceTable?.position?.x || 0;
      const targetX = targetTable?.position?.x || 0;
      const isSourceLeft = sourceX <= targetX;

      sourcePos = isSourceLeft ? Position.Right : Position.Left;
      targetPos = isSourceLeft ? Position.Left : Position.Right;
      
      sourceHandleId = `${baseSourceId}-source-${isSourceLeft ? 'right' : 'left'}`;
      targetHandleId = `${baseTargetId}-target-${isSourceLeft ? 'left' : 'right'}`;
    }

    return {
      id: rel.relationship_id,
      source: rel.source_table_id,
      target: rel.target_table_id,
      sourceHandle: sourceHandleId,
      targetHandle: targetHandleId,
      type: 'relationshipEdge',
      animated: true,
      label: rel.cardinality,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    };
  }), [relationships, tables]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateTablePosition(change.id, change.position);
        }
      });
    },
    [updateTablePosition]
  );

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(node => removeTable(node.id));
    setSelectedTable(null);
  }, [removeTable, setSelectedTable]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach(edge => removeRelationship(edge.id));
  }, [removeRelationship]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedTable(node.id);
  }, [setSelectedTable]);

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
  }, [setSelectedTable]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      
      const relType = window.prompt("Enter relationship type (1:1, 1:N, M:N):", "1:N");
      if (!relType || !['1:1', '1:N', 'M:N'].includes(relType.toUpperCase())) {
        useToastStore.getState().addToast("Invalid relationship type. Connection cancelled.", "error");
        return;
      }
      
      const cardinality = relType.toUpperCase() as '1:1' | '1:N' | 'M:N';

      if (cardinality === 'M:N') {
        const createJunction = window.confirm("M:N relationship detected. Would you like to automatically create a junction table? (FR-8)");
        if (createJunction) {
          const sourceTable = tables.find(t => t.table_id === params.source);
          const targetTable = tables.find(t => t.table_id === params.target);
          if (sourceTable && targetTable) {
            const junctionName = `${sourceTable.name}_${targetTable.name}`;
            useSchemaStore.getState().addTable(junctionName, { x: 300, y: 300 });
            
            const newTable = useSchemaStore.getState().tables.find(t => t.name === junctionName);
            if (newTable) {
              const fk1 = addColumn(newTable.table_id, { name: `${sourceTable.name.toLowerCase()}_id`, datatype: 'integer', is_primary_key: true, is_unique: false, is_not_null: true });
              const fk2 = addColumn(newTable.table_id, { name: `${targetTable.name.toLowerCase()}_id`, datatype: 'integer', is_primary_key: true, is_unique: false, is_not_null: true });
              
              addRelationship({ source_table_id: newTable.table_id, target_table_id: params.source, cardinality: '1:N', fk_column_id: fk1 });
              addRelationship({ source_table_id: newTable.table_id, target_table_id: params.target, cardinality: '1:N', fk_column_id: fk2 });
            }
          }
        } else {
           addRelationship({
            source_table_id: params.source,
            target_table_id: params.target,
            cardinality: 'M:N'
          });
        }
        return;
      }

      let newFkId: string | undefined = undefined;
      const targetTable = tables.find(t => t.table_id === params.target);
      if (targetTable) {
        newFkId = addColumn(params.source, {
          name: `${targetTable.name.toLowerCase()}_id`,
          datatype: 'integer',
          is_primary_key: false,
          is_unique: cardinality === '1:1',
          is_not_null: false
        });
      }

      addRelationship({
        source_table_id: params.source,
        target_table_id: params.target,
        cardinality: cardinality,
        fk_column_id: newFkId
      });
    },
    [addRelationship, addColumn, tables]
  );

  const handleAddTable = () => {
    const name = prompt('Enter table name:');
    if (name) {
      if (tables.some(t => t.name === name)) {
        useToastStore.getState().addToast('Table name must be unique', 'error');
        return;
      }

      // Calculate position so new tables don't stack on top of each other
      let x = 200;
      let y = 200;
      if (tables.length > 0) {
        const lastTable = tables[tables.length - 1];
        x = (lastTable.position?.x || 200) + 320; // Offset horizontally by 320px
        y = lastTable.position?.y || 200;
      }

      addTable(name, { x, y });
      
      const newTable = useSchemaStore.getState().tables.find(t => t.name === name);
      if (newTable) {
        addColumn(newTable.table_id, {
          name: 'id',
          datatype: 'INTEGER',
          is_primary_key: true,
          is_unique: true,
          is_not_null: true
        });
      }
    }
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');

  const handleValidate = () => {
    const reports = validateSchema(tables, relationships);
    setValidationReports(reports);
    if (reports.length === 0) {
      useToastStore.getState().addToast("Schema is valid! No issues found.", "success");
    }
  };

  const handleExportSQL = async () => {
    // 1. Hard Export Gate (FR-31)
    const reports = validateSchema(tables, relationships);
    setValidationReports(reports);
    
    const fatalErrors = reports.filter(r => r.severity === 'Error');
    if (fatalErrors.length > 0) {
      useToastStore.getState().addToast("Hard Export Gate: Cannot export SQL. Please fix FATAL errors first.", "error");
      return;
    }

    try {
      // 2. Fetch Topological Sort & SQL
      const response = await fetch('http://localhost:3000/api/export/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables, relationships }),
      });

      const data = await response.json();
      
      if (data.error) {
        useToastStore.getState().addToast("Export Error: " + data.error, "error");
        return;
      }

      setGeneratedSql(data.sql);
      setIsExportModalOpen(true);
      useToastStore.getState().addToast("Schema successfully generated and topologically sorted!", "success");
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast("Failed to connect to backend server.", "error");
    }
  };

  const handleSaveToCloud = async () => {
    const { activeProjectId } = useSchemaStore.getState();
    if (!activeProjectId) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectName,
          schema_data: { tables, relationships, requirements: useSchemaStore.getState().requirements },
          updated_at: new Date().toISOString()
        })
        .eq('id', activeProjectId);
        
      if (error) throw error;
      useToastStore.getState().addToast("Project saved to cloud successfully!", "success");
    } catch (err: any) {
      console.error(err);
      useToastStore.getState().addToast("Failed to save to cloud: " + err.message, "error");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col font-sans bg-[#0a0a0a] text-zinc-50 overflow-hidden">
      <header className="bg-[#0a0a0a] border-b border-zinc-900 px-6 py-3 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToDashboard}
            className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center ml-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <div className="flex items-center border-l border-zinc-800 ml-1 pl-4">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-base font-semibold tracking-tight text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 min-w-[150px]"
              placeholder="Untitled Schema"
            />
          </div>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
            v1.0
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSaveToCloud}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 bg-[#121215] border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-zinc-300"
          >
            <Save className="w-3.5 h-3.5" />
            Save Cloud
          </button>
          <button 
            onClick={toggleChat}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${
              isChatOpen 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
            }`}
          >
            <span className={isChatOpen ? "text-indigo-400" : "text-yellow-400 font-bold"}>✨</span>
            {isChatOpen ? 'Close Copilot' : 'AI Copilot'}
          </button>
          <TraceabilityPanel />
          <button 
            onClick={handleValidate}
            className="bg-transparent border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900 px-3 py-1.5 rounded text-xs font-medium transition-colors text-zinc-400 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Validate
          </button>
          <button 
            onClick={handleExportSQL}
            className="bg-transparent border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900 px-3 py-1.5 rounded text-xs font-medium transition-colors text-zinc-300 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export SQL
          </button>
          <button 
            onClick={handleAddTable}
            className="bg-white hover:bg-zinc-200 px-4 py-1.5 rounded text-xs font-bold transition-colors text-black"
          >
            + Add Table
          </button>
        </div>
      </header>
      
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        sqlScript={generatedSql} 
      />

      <main className="flex-1 bg-[#0a0a0a] relative flex overflow-hidden">
        <ChatSidebar />
        <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#27272a" gap={24} size={1} />
            <Controls />
          </ReactFlow>
          <ValidationReportPanel />
        </div>
        {selectedTableId && <Sidebar />}
        <ToastContainer />
      </main>
    </div>
  );
}
