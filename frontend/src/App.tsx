import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  Node,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSchemaStore } from './store/useSchemaStore';
import TableNode from './components/TableNode';
import RelationshipEdge from './components/RelationshipEdge';
import Sidebar from './components/Sidebar';
import ValidationReportPanel from './components/ValidationReportPanel';
import { validateSchema } from './utils/validationEngine';
import type { Table } from './types/schema';

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

function App() {
  const { 
    tables, 
    relationships, 
    addTable, 
    updateTablePosition, 
    addRelationship,
    addColumn,
    setSelectedTable,
    removeTable,
    removeRelationship,
    setValidationReports
  } = useSchemaStore();

  const nodes: Node<Table>[] = useMemo(() => tables.map((t) => ({
    id: t.table_id,
    type: 'tableNode',
    position: t.position || { x: 0, y: 0 },
    data: { ...t },
  })), [tables]);

  const edges: Edge[] = useMemo(() => relationships.map((r) => ({
    id: r.relationship_id,
    source: r.source_table_id,
    target: r.target_table_id,
    type: 'relationshipEdge',
    animated: true,
    label: r.cardinality,
    style: { stroke: '#94a3b8', strokeWidth: 2 }
  })), [relationships]);

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
        alert("Invalid relationship type. Connection cancelled.");
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
            
            // Re-fetch to get the new table ID
            const newTable = useSchemaStore.getState().tables.find(t => t.name === junctionName);
            if (newTable) {
              // Add FK columns
              const fk1 = addColumn(newTable.table_id, { name: `${sourceTable.name.toLowerCase()}_id`, datatype: 'integer', is_primary_key: true, is_unique: false, is_not_null: true });
              const fk2 = addColumn(newTable.table_id, { name: `${targetTable.name.toLowerCase()}_id`, datatype: 'integer', is_primary_key: true, is_unique: false, is_not_null: true });
              
              // Add relationships to junction
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

      // Auto-FK injection for 1:N or 1:1
      let newFkId: string | undefined = undefined;
      const targetTable = tables.find(t => t.table_id === params.target);
      if (targetTable) {
        newFkId = addColumn(params.source, {
          name: `${targetTable.name.toLowerCase()}_id`,
          datatype: 'integer',
          is_primary_key: false,
          is_unique: cardinality === '1:1', // 1:1 requires unique FK
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
      addTable(name, { x: 200, y: 200 });
      const newTable = useSchemaStore.getState().tables.find(t => t.name === name);
      if (newTable) {
        addColumn(newTable.table_id, {
          name: 'id',
          datatype: 'integer',
          is_primary_key: true,
          is_unique: true,
          is_not_null: true
        });
      }
    }
  };

  const handleValidate = () => {
    const reports = validateSchema(tables, relationships);
    setValidationReports(reports);
    if (reports.length === 0) {
      alert("Schema is valid! No issues found.");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col font-sans">
      <header className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md z-10">
        <h1 className="text-xl font-bold tracking-tight">Schema Architect</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleValidate}
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer"
          >
            ✓ Validate
          </button>
          <button 
            onClick={handleAddTable}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer"
          >
            + Add Table
          </button>
        </div>
      </header>
      <main className="flex-1 bg-slate-50 relative flex overflow-hidden">
        <div className="flex-1 relative">
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
          >
            <Background color="#cbd5e1" gap={16} />
            <Controls />
          </ReactFlow>
          <ValidationReportPanel />
        </div>
        <Sidebar />
      </main>
    </div>
  );
}

export default App;
