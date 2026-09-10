import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, Relationship, ValidationReport } from '../types/schema';

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  validationReports: ValidationReport[];

  // Actions
  addTable: (name: string, position: { x: number; y: number }) => void;
  updateTable: (table_id: string, name: string) => void;
  updateTablePosition: (table_id: string, position: { x: number; y: number }) => void;
  removeTable: (table_id: string) => void;

  addColumn: (table_id: string, column: Omit<Column, 'column_id'>) => string;
  updateColumn: (table_id: string, column_id: string, column: Partial<Column>) => void;
  removeColumn: (table_id: string, column_id: string) => void;

  addRelationship: (rel: Omit<Relationship, 'relationship_id'>) => void;
  removeRelationship: (relationship_id: string) => void;

  setValidationReports: (reports: ValidationReport[]) => void;
  clearValidationReports: () => void;

  selectedTableId: string | null;
  setSelectedTable: (id: string | null) => void;
}

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set) => ({
      tables: [],
      relationships: [],
      validationReports: [],
      selectedTableId: null,

      setSelectedTable: (id) => set({ selectedTableId: id }),

      addTable: (name, position) => set((state) => {
        // Prevent duplicate table names (FR-5)
        if (state.tables.some(t => t.name === name)) {
          alert('Table name must be unique');
          return state;
        }
        return {
          tables: [...state.tables, { table_id: uuidv4(), name, columns: [], position }]
        };
      }),

      updateTable: (table_id, name) => set((state) => {
        if (state.tables.some(t => t.name === name && t.table_id !== table_id)) {
          alert('Table name must be unique');
          return state;
        }
        return {
          tables: state.tables.map(t => t.table_id === table_id ? { ...t, name } : t)
        };
      }),

      updateTablePosition: (table_id, position) => set((state) => ({
        tables: state.tables.map(t => t.table_id === table_id ? { ...t, position } : t)
      })),

      removeTable: (table_id) => set((state) => ({
        tables: state.tables.filter(t => t.table_id !== table_id),
        relationships: state.relationships.filter(r => r.source_table_id !== table_id && r.target_table_id !== table_id)
      })),

      addColumn: (table_id, column) => {
        const new_id = uuidv4();
        set((state) => ({
          tables: state.tables.map(t => {
            if (t.table_id === table_id) {
              return { ...t, columns: [...t.columns, { ...column, column_id: new_id }] };
            }
            return t;
          })
        }));
        return new_id;
      },

      updateColumn: (table_id, column_id, columnUpdate) => set((state) => ({
        tables: state.tables.map(t => {
          if (t.table_id === table_id) {
            return {
              ...t,
              columns: t.columns.map(c => c.column_id === column_id ? { ...c, ...columnUpdate } : c)
            };
          }
          return t;
        })
      })),

      removeColumn: (table_id, column_id) => set((state) => ({
        tables: state.tables.map(t => {
          if (t.table_id === table_id) {
            return { ...t, columns: t.columns.filter(c => c.column_id !== column_id) };
          }
          return t;
        })
      })),

      addRelationship: (rel) => set((state) => ({
        relationships: [...state.relationships, { ...rel, relationship_id: uuidv4() }]
      })),

      removeRelationship: (relationship_id) => set((state) => {
        const rel = state.relationships.find(r => r.relationship_id === relationship_id);
        let newTables = state.tables;
        
        // Automatically remove the foreign key column (FR-9)
        if (rel && rel.fk_column_id) {
          newTables = newTables.map(t => {
            if (t.table_id === rel.source_table_id) {
              return { ...t, columns: t.columns.filter(c => c.column_id !== rel.fk_column_id) };
            }
            return t;
          });
        }

        return {
          relationships: state.relationships.filter(r => r.relationship_id !== relationship_id),
          tables: newTables
        };
      }),

      setValidationReports: (reports) => set({ validationReports: reports }),
      clearValidationReports: () => set({ validationReports: [] })
    }),
    {
      name: 'schema-architect-storage', // key in local storage
      partialize: (state) => ({ 
        tables: state.tables, 
        relationships: state.relationships 
      }), // only save these parts of the state
    }
  )
);
