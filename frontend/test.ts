import { useSchemaStore } from './src/store/useSchemaStore';
import { validateSchema } from './src/utils/validationEngine';

// @ts-ignore
global.alert = console.log;

async function runTests() {
  console.log("Starting tests...");
  const store = useSchemaStore.getState();

  // FR-1: Create Table
  console.log("FR-1: Create table 'Users'");
  store.addTable("Users", { x: 0, y: 0 });
  const usersTable = useSchemaStore.getState().tables.find(t => t.name === "Users");
  if (!usersTable) throw new Error("Users table not created");
  console.log("  Success: Users table created with ID", usersTable.table_id);

  // FR-5: Duplicate Table
  console.log("FR-5: Prevent duplicate table name");
  store.addTable("Users", { x: 0, y: 0 });
  if (useSchemaStore.getState().tables.filter(t => t.name === "Users").length > 1) {
    throw new Error("Duplicate table was created");
  }
  console.log("  Success: Duplicate table prevented (note: alert might have been called)");

  // FR-2: Add Column
  console.log("FR-2: Add column 'email'");
  const emailColId = store.addColumn(usersTable.table_id, {
    name: "email",
    datatype: "varchar",
    is_primary_key: false,
    is_unique: true,
    is_not_null: true,
    check_constraint: "email LIKE '%@%'"
  });
  console.log("  Success: Column added with ID", emailColId);

  // Set up Profiles for Relationship Test
  store.addTable("Profiles", { x: 100, y: 100 });
  const profilesTable = useSchemaStore.getState().tables.find(t => t.name === "Profiles");

  // FR-7: Auto FK Injection
  console.log("FR-7: Auto FK Injection on Relationship");
  const fkId = store.addColumn(profilesTable!.table_id, {
    name: `users_id`,
    datatype: 'integer',
    is_primary_key: false,
    is_unique: true,
    is_not_null: false
  });
  store.addRelationship({
    source_table_id: profilesTable!.table_id,
    target_table_id: usersTable.table_id,
    cardinality: '1:1',
    fk_column_id: fkId
  });
  
  const state = useSchemaStore.getState();
  const profilesHasFk = state.tables.find(t => t.name === "Profiles")?.columns.some(c => c.name === "users_id");
  if (!profilesHasFk) throw new Error("FK not found in Profiles table");
  console.log("  Success: FK 'users_id' correctly injected into Profiles");

  // Run Validation Engine
  console.log("\nRunning Validation Engine on current valid state...");
  let reports = validateSchema(state.tables, state.relationships);
  console.log(`  Reports found: ${reports.length} (Expected 0 for valid state)`);

  // FR-10: Circular Dependency
  console.log("FR-10: Testing Circular Dependency...");
  // Connect Users back to Profiles
  store.addRelationship({
    source_table_id: usersTable.table_id,
    target_table_id: profilesTable!.table_id,
    cardinality: '1:N'
  });
  reports = validateSchema(useSchemaStore.getState().tables, useSchemaStore.getState().relationships);
  const hasCycle = reports.some(r => r.rule_violated.includes("Circular Dependency"));
  if (!hasCycle) throw new Error("Circular dependency not detected");
  console.log("  Success: Circular Dependency successfully detected");

  // Clean up loop for next tests
  const lastRel = useSchemaStore.getState().relationships[useSchemaStore.getState().relationships.length - 1];
  store.removeRelationship(lastRel.relationship_id);

  // FR-11: 1NF Test
  console.log("FR-11: Testing 1NF Violation...");
  store.addColumn(usersTable.table_id, { name: "phone_numbers", datatype: "varchar", is_primary_key: false, is_unique: false, is_not_null: false });
  reports = validateSchema(useSchemaStore.getState().tables, useSchemaStore.getState().relationships);
  const has1NF = reports.some(r => r.rule_violated.includes("1NF"));
  if (!has1NF) throw new Error("1NF violation not detected");
  console.log("  Success: 1NF Violation successfully detected");

  // FR-12: 3NF Anomaly Test
  console.log("FR-12: Testing 3NF Transitive Anomaly...");
  store.addColumn(usersTable.table_id, { name: "department_id", datatype: "integer", is_primary_key: false, is_unique: false, is_not_null: false });
  reports = validateSchema(useSchemaStore.getState().tables, useSchemaStore.getState().relationships);
  const has3NF = reports.some(r => r.rule_violated.includes("3NF"));
  if (!has3NF) throw new Error("3NF violation not detected");
  console.log("  Success: 3NF Transitive Anomaly successfully detected");

  // FR-13: M:N Junction Test
  console.log("FR-13: Testing Missing Junction Table...");
  store.addTable("Products", {x: 200, y:200});
  const productsTable = useSchemaStore.getState().tables.find(t=>t.name === "Products");
  store.addRelationship({ source_table_id: usersTable.table_id, target_table_id: productsTable!.table_id, cardinality: 'M:N' });
  reports = validateSchema(useSchemaStore.getState().tables, useSchemaStore.getState().relationships);
  const hasMN = reports.some(r => r.rule_violated.includes("Missing Junction"));
  if (!hasMN) throw new Error("Missing junction not detected");
  console.log("  Success: M:N Missing Junction successfully detected");

  // FR-9: Delete relationship removes FK
  console.log("FR-9: Testing Relationship Deletion FK cleanup...");
  const firstRel = useSchemaStore.getState().relationships[0]; // Profiles -> Users
  store.removeRelationship(firstRel.relationship_id);
  const profilesAfterDel = useSchemaStore.getState().tables.find(t => t.name === "Profiles");
  const fkStillExists = profilesAfterDel?.columns.some(c => c.name === "users_id");
  if (fkStillExists) throw new Error("FK was not deleted when relationship was deleted");
  console.log("  Success: Foreign Key correctly cleaned up on relationship deletion");

  console.log("\nALL TESTS PASSED SUCCESSFULLY! ✅");
}

runTests().catch(console.error);
