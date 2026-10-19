import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, Relationship, ValidationReport, Requirement } from '../types/schema';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  validationReports: ValidationReport[];

  // Traceability State
  requirements: Requirement[];
  unreferencedTables: string[];
  addRequirement: (text: string) => void;
  updateRequirement: (id: string, updates: Partial<Requirement>) => void;
  deleteRequirement: (id: string) => void;
  setTraceabilityReport: (evaluatedReqs: Requirement[], unreferenced: string[]) => void;

  // Chat State
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  toggleChat: () => void;
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  clearChatMessages: () => void;

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

  /** Ephemeral UI state — which relationship edge is currently hovered */
  hoveredRelationshipId: string | null;
  setHoveredRelationship: (id: string | null) => void;

  setSchema: (tables: Table[], relationships: Relationship[]) => void;
  activeProjectId: string | null;
  projectName: string;
  setProjectName: (name: string) => void;
  setStoreState: (state: Partial<SchemaState>) => void;
  clearStore: () => void;
}

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      projectName: 'Untitled Schema',
      setProjectName: (name) => set({ projectName: name }),
      setStoreState: (state) => set((prev) => ({ ...prev, ...state })),
      clearStore: () => set({ tables: [], relationships: [], requirements: [], validationReports: [], chatMessages: [] }),
      
      tables: [],
      relationships: [],
      validationReports: [],
      
      requirements: [],
      unreferencedTables: [],
      addRequirement: (text) => set((state) => ({
        requirements: [...state.requirements, { id: uuidv4(), text }]
      })),
      updateRequirement: (id, updates) => set((state) => ({
        requirements: state.requirements.map(r => r.id === id ? { ...r, ...updates } : r)
      })),
      deleteRequirement: (id) => set((state) => ({
        requirements: state.requirements.filter(r => r.id !== id)
      })),
      setTraceabilityReport: (evaluatedReqs, unreferenced) => set({
        requirements: evaluatedReqs,
        unreferencedTables: unreferenced
      }),
      
      isChatOpen: false,
      chatMessages: [
        { id: uuidv4(), role: 'assistant', content: 'Hi! Describe your database or ask me to modify the existing tables.' }
      ],
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      addChatMessage: (msg) => set((state) => ({ 
        chatMessages: [...state.chatMessages, { ...msg, id: uuidv4() }] 
      })),
      clearChatMessages: () => set({ 
        chatMessages: [{ id: uuidv4(), role: 'assistant', content: 'Hi! Describe your database or ask me to modify the existing tables.' }] 
      }),

      selectedTableId: null,
      hoveredRelationshipId: null,

      setSelectedTable: (id) => set({ selectedTableId: id }),
      setHoveredRelationship: (id) => set({ hoveredRelationshipId: id }),

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
      clearValidationReports: () => set({ validationReports: [] }),
      
      setSchema: (tables, relationships) => set({ tables, relationships, validationReports: [], selectedTableId: null })
    }),
    {
      name: 'schema-architect-storage', // key in local storage
      partialize: (state) => ({ 
        tables: state.tables, 
        relationships: state.relationships,
        requirements: state.requirements
      }), // only save these parts of the state
    }
  )
);
