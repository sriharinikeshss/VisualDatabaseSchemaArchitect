import type { Table, Relationship, ValidationReport } from '../types/schema';

export function validateSchema(tables: Table[], relationships: Relationship[]): ValidationReport[] {
  const reports: ValidationReport[] = [];

  // 1. Cycle Detection (FR-10) using DFS
  const adjList = new Map<string, string[]>();
  tables.forEach(t => adjList.set(t.table_id, []));
  
  relationships.forEach(r => {
    if (adjList.has(r.source_table_id)) {
      adjList.get(r.source_table_id)!.push(r.target_table_id);
    }
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let cycleFound = false;

  function dfs(nodeId: string) {
    if (recursionStack.has(nodeId)) {
      cycleFound = true;
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    recursionStack.delete(nodeId);
  }

  for (const table of tables) {
    if (!visited.has(table.table_id)) {
      dfs(table.table_id);
    }
  }

  if (cycleFound) {
    reports.push({
      rule_violated: 'Circular Dependency (FR-10)',
      severity: 'Error',
      message: 'A circular foreign key dependency was detected. Tables cannot mutually reference each other in a loop.'
    });
  }

  // 2. Normalization Checks (FR-11, FR-12)
  tables.forEach(table => {
    // Check 1NF: plural names or numbered arrays
    table.columns.forEach(col => {
      const name = col.name.toLowerCase();
      // Heuristics for 1NF violation
      if (
        (name.endsWith('s') && !name.endsWith('ss') && !name.endsWith('status') && !name.endsWith('details')) || 
        /\d+$/.test(name)
      ) {
        reports.push({
          rule_violated: '1NF Violation (FR-11)',
          severity: 'Warning',
          message: `Column '${col.name}' in '${table.name}' might contain multiple values. Consider breaking this into a separate 1:N table.`
        });
      }

      // Check 2NF/3NF transitive dependencies
      if (name.endsWith('_id') && !col.is_primary_key) {
        const isFk = relationships.some(r => r.source_table_id === table.table_id && r.fk_column_id === col.column_id);
        if (!isFk) {
          reports.push({
            rule_violated: '3NF Violation (FR-12)',
            severity: 'Warning',
            message: `Column '${col.name}' in '${table.name}' looks like a foreign key, but no visual relationship line exists. This could be an anomaly.`
          });
        }
      }
    });

    // Check for overly wide tables
    if (table.columns.length > 15) {
      reports.push({
        rule_violated: '2NF/3NF Violation (FR-12)',
        severity: 'Warning',
        message: `Table '${table.name}' has over 15 columns. Ensure all columns depend strictly on the primary key, or normalize into smaller tables.`
      });
    }
  });

  // 3. M:N Junction Tables (FR-13)
  relationships.forEach(r => {
    if (r.cardinality === 'M:N') {
      const source = tables.find(t => t.table_id === r.source_table_id);
      const target = tables.find(t => t.table_id === r.target_table_id);
      reports.push({
        rule_violated: 'Missing Junction Table (FR-13)',
        severity: 'Error',
        message: `An M:N relationship exists between '${source?.name}' and '${target?.name}'. You must use a junction table to resolve this.`
      });
    }
  });

  return reports;
}
