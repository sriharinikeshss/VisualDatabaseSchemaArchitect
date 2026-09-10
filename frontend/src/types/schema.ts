export interface Column {
  column_id: string;
  name: string;
  datatype: string;
  is_primary_key: boolean;
  is_unique: boolean;
  is_not_null: boolean;
  check_constraint?: string;
}

export interface Table {
  [key: string]: unknown;
  table_id: string;
  name: string;
  columns: Column[];
  position?: { x: number; y: number }; // For React Flow
}

export interface Relationship {
  relationship_id: string;
  source_table_id: string;
  target_table_id: string;
  cardinality: '1:1' | '1:N' | 'M:N';
  fk_column_id?: string;
}

export interface ValidationReport {
  rule_violated: string;
  severity: 'Error' | 'Warning';
  message: string;
}
