import type { Table, Relationship, ValidationReport } from '../types/schema';

export function validateSchema(tables: Table[], relationships: Relationship[]): ValidationReport[] {
  const reports: ValidationReport[] = [];

  // 1. Cycle Detection (FR-10) using DFS
  const adjList = new Map<string, string[]>();
  tables.forEach(t => adjList.set(t.table_id, []));
  
  relationships.forEach(r => {
    // Skip self-referential FKs (e.g. categories.parent_category_id → categories)
    // — those are valid hierarchical patterns, not circular dependencies.
    if (r.source_table_id === r.target_table_id) return;
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

  // Known single-value suffixes that are NOT 1NF violations despite ending in 's'
  const FALSE_POSITIVE_SUFFIXES = [
    'status', 'notes', 'address', 'progress', 'access', 'class', 'process',
    'diagnosis', 'analysis', 'basis', 'census', 'focus', 'bonus', 'campus',
    'apparatus', 'nexus', 'alias', 'canvas', 'chorus', 'corpus', 'callus',
    'details', 'ss', 'ness', 'ess', 'oss', 'uss', 'iss',
  ];
  // Known single-value whole names safe to skip
  const FALSE_POSITIVE_NAMES = new Set([
    'notes', 'address', 'status', 'progress', 'description', 'diagnosis',
    'symptoms', 'allergies', 'remarks', 'comments', 'details', 'instructions',
    'dosage_instructions', 'medical_history', 'test_results', 'lab_results',
  ]);
  // Column name patterns that genuinely suggest multi-value storage
  const MULTI_VALUE_PATTERN = /^(tags|phones|emails|urls|images|attachments|categories|flags|roles|permissions|skills|hobbies|languages|aliases)\w*$/;

  tables.forEach(table => {
    // Check 1NF: only flag columns that strongly suggest multi-value storage
    table.columns.forEach(col => {
      const name = col.name.toLowerCase();

      // Skip known safe names
      if (FALSE_POSITIVE_NAMES.has(name)) return;

      // Skip columns ending in known safe suffixes
      if (FALSE_POSITIVE_SUFFIXES.some(sfx => name.endsWith(sfx))) return;

      const isSuspiciousPlural = MULTI_VALUE_PATTERN.test(name);
      const hasNumericSuffix = /\d+$/.test(name);

      if (isSuspiciousPlural || hasNumericSuffix) {
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

    // Check 2NF: Composite Primary Keys
    const pkCount = table.columns.filter(col => col.is_primary_key).length;
    const nonPkCount = table.columns.length - pkCount;
    if (pkCount >= 2 && nonPkCount > 0) {
      reports.push({
        rule_violated: '2NF Violation (FR-12)',
        severity: 'Warning',
        message: `Table '${table.name}' uses a composite primary key. Ensure all columns depend on BOTH keys, or consider using a single 'id' primary key.`
      });
    }

    // Check 3NF: Repeated Column Prefixes
    const prefixGroups: Record<string, string[]> = {};
    const tableNameLower = table.name.toLowerCase();

    table.columns.forEach(col => {
      if (col.is_primary_key) return; // Ignore PKs

      const parts = col.name.toLowerCase().split('_');
      if (parts.length > 1) {
        const prefix = parts[0];
        // Skip if prefix matches or is singular form of table name
        if (!tableNameLower.startsWith(prefix) && prefix.length > 2) {
          if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
          prefixGroups[prefix].push(col.name);
        }
      }
    });

    for (const [prefix, cols] of Object.entries(prefixGroups)) {
      if (cols.length >= 2) {
        reports.push({
          rule_violated: '3NF Violation (FR-12)',
          severity: 'Warning',
          message: `Table '${table.name}' contains grouped columns ('${prefix}_...'). These may be transitive dependencies. Consider extracting these into a separate '${prefix.charAt(0).toUpperCase() + prefix.slice(1)}s' table.`
        });
      }
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
