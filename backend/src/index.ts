import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const apiKey = process.env.MISTRAL_API_KEY || '';

const client = new Mistral({ apiKey: apiKey });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mistral_configured: !!apiKey });
});

app.post('/api/generate-schema', async (req, res) => {
  try {
    const { prompt, currentSchema } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!apiKey) {
      // Mock mode for local testing if no key provided
      return res.json({
        tables: [
          {
            table_id: "mock_t1",
            name: "mock_users",
            columns: [
              { column_id: "mock_c1", name: "id", datatype: "integer", is_primary_key: true, is_unique: true, is_not_null: true }
            ]
          }
        ],
        relationships: []
      });
    }

    let systemPrompt = `You are an expert database architect.
  You MUST output ONLY a valid JSON object with the following exact structure, no markdown formatting or backticks:
  {
    "tables": [
      {
        "table_id": "unique-string-id",
        "name": "table_name",
        "columns": [
          {
            "column_id": "unique-col-string-id",
            "name": "col_name",
            "datatype": "VARCHAR(255)",
            "is_primary_key": true,
            "is_unique": false,
            "is_not_null": true
          }
        ]
      }
    ],
    "relationships": [
      {
        "source_table_id": "table_id_of_source (the table containing the foreign key)",
        "target_table_id": "table_id_of_target (the table being referenced)",
        "cardinality": "1:N",
        "fk_column_id": "column_id_of_the_foreign_key_in_the_source_table"
      }
    ]
  }
  CRITICAL: You MUST create 'relationships' for every foreign key you create in the tables.
  Make sure relationship source and target IDs perfectly match the generated table_ids and column_ids.`;

    let userContent = prompt;

    if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0) {
      systemPrompt += `\n\nIMPORTANT: The user already has an existing schema. 
      You MUST return the FULL schema including their existing tables, relationships, and exactly preserving their existing table_ids and column_ids. 
      Only modify or add to the schema based on the user's request. DO NOT delete existing tables unless explicitly asked.`;
      
      userContent = `Existing Schema:\n${JSON.stringify(currentSchema, null, 2)}\n\nUser Request: ${prompt}`;
    } else {
      systemPrompt += `\n\nThe user will describe a system. Generate a starting relational database schema for it.`;
    }

    const chatResponse = await client.chat.complete({
      model: 'open-mistral-nemo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      responseFormat: { type: "json_object" }
    }) as any;

    const content = chatResponse.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      const parsed = JSON.parse(content);
      return res.json(parsed);
    } else {
        return res.status(500).json({ error: 'Invalid response from Mistral' });
    }
  } catch (error: any) {
    console.error("Mistral generation error:", error.message || error);
    res.status(500).json({ error: 'Failed to generate schema' });
  }
});

app.post('/api/explain-error', async (req, res) => {
  try {
    const { error, context } = req.body;
    
    if (!apiKey) {
       return res.json({ explanation: "This is a mocked explanation. You violated a database design rule." });
    }

    const systemPrompt = `You are a helpful database teacher. 
Explain the following schema validation error to a beginner. 
Keep it under 3 sentences and provide a quick fix.`;

    const chatResponse = await client.chat.complete({
      model: 'open-mistral-nemo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Error: ${JSON.stringify(error)}\nContext: ${JSON.stringify(context)}` }
      ]
    });

    res.json({ explanation: chatResponse.choices?.[0]?.message?.content || "No explanation provided." });
  } catch (error) {
    console.error("Mistral explain error:", error);
    res.status(500).json({ error: 'Failed to explain error' });
  }
});

app.post('/api/traceability/evaluate', async (req, res) => {
  try {
    const { requirements, currentSchema } = req.body;
    
    if (!requirements || !currentSchema) {
      return res.status(400).json({ error: 'Requirements and currentSchema are required.' });
    }

    const { tables, relationships } = currentSchema;
    
    // Phase A: LLM Entity Extraction
    const systemPrompt = `You are a database business analyst. 
You will be given a list of user requirements and the current database schema.
For EACH requirement, extract the EXACT table names and column names that are implied or needed to fulfill it, based ONLY on the provided schema.
You MUST output ONLY a valid JSON array of objects, with NO markdown formatting or backticks, matching this exact structure:
[
  {
    "id": "requirement_id",
    "tables": ["exact_table_name_1", "exact_table_name_2"],
    "columns": ["exact_column_name_1"]
  }
]
IMPORTANT: Return the exact table and column names as they appear in the schema. Do not invent tables.`;

    const userContent = `Schema:\n${JSON.stringify({
      tables: tables.map((t: any) => ({ name: t.name, columns: t.columns.map((c: any) => c.name) }))
    }, null, 2)}\n\nRequirements:\n${JSON.stringify(requirements, null, 2)}`;

    let extractedEntities: any[] = [];
    
    if (apiKey) {
      const chatResponse = await client.chat.complete({
        model: 'open-mistral-nemo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        responseFormat: { type: "json_object" }
      }) as any;

      const content = chatResponse.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        // Handle case where Mistral wraps in an object instead of array
        extractedEntities = Array.isArray(parsed) ? parsed : (parsed.requirements || parsed.data || []);
      }
    } else {
      // Mock mode
      extractedEntities = requirements.map((r: any) => ({
        id: r.id,
        tables: tables.length > 0 ? [tables[0].name] : [],
        columns: []
      }));
    }

    // Phase B: Graph Pathfinding (Deterministic BFS)
    // 1. Build Adjacency List (Undirected graph of relationships)
    const adjList = new Map<string, Set<string>>();
    tables.forEach((t: any) => adjList.set(t.name, new Set()));
    
    relationships.forEach((r: any) => {
      const source = tables.find((t: any) => t.table_id === r.source_table_id)?.name;
      const target = tables.find((t: any) => t.table_id === r.target_table_id)?.name;
      if (source && target) {
        adjList.get(source)?.add(target);
        adjList.get(target)?.add(source); // Undirected for JOIN paths
      }
    });

    const evaluatedRequirements = requirements.map((req: any) => {
      const extracted = extractedEntities.find((e: any) => e.id === req.id);
      
      if (!extracted || extracted.tables.length === 0) {
        return { ...req, is_supported: false, reason: "No relevant tables found in the schema to support this requirement." };
      }

      const reqTables: string[] = extracted.tables;
      const reqColumns: string[] = extracted.columns || [];

      // Check Column Existence (FR-25 Strict Check)
      let missingColumn = null;
      for (const colName of reqColumns) {
        const exists = tables.some((t: any) => reqTables.includes(t.name) && t.columns.some((c: any) => c.name === colName));
        if (!exists) {
          missingColumn = colName;
          break;
        }
      }

      if (missingColumn) {
        return { 
          ...req, 
          is_supported: false, 
          involved_tables: reqTables,
          reason: `Missing Column: The requirement needs '${missingColumn}', but it does not exist in the referenced tables.` 
        };
      }

      // If only 1 table is needed, no JOIN path is required
      if (reqTables.length === 1) {
        const exists = tables.some((t: any) => t.name === reqTables[0]);
        if (!exists) {
           return { ...req, is_supported: false, involved_tables: reqTables, reason: `Table '${reqTables[0]}' does not exist.` };
        }
        return { ...req, is_supported: true, involved_tables: reqTables, reason: "Requirement supported directly by a single table." };
      }

      // BFS to check if all tables are connected
      const startNode = reqTables[0];
      const visited = new Set<string>();
      const queue = [startNode];
      visited.add(startNode);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjList.get(current) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // Check if all requested tables were visited
      const missingTables = reqTables.filter(t => !visited.has(t));
      
      if (missingTables.length > 0) {
        return {
          ...req,
          is_supported: false,
          involved_tables: reqTables,
          reason: `Missing Relationship: No valid Foreign Key JOIN path connects [${reqTables.join(', ')}]. Graph disconnected at: ${missingTables.join(', ')}.`
        };
      }

      return {
        ...req,
        is_supported: true,
        involved_tables: reqTables,
        reason: "Valid Foreign Key JOIN path exists between all required tables."
      };
    });

    // Phase C: Dead Design Detection (FR-27)
    const usedTables = new Set<string>();
    evaluatedRequirements.forEach((req: any) => {
      if (req.is_supported && req.involved_tables) {
        req.involved_tables.forEach((t: string) => usedTables.add(t));
      }
    });

    const unreferencedTables = tables
      .map((t: any) => t.name)
      .filter((name: string) => !usedTables.has(name) && evaluatedRequirements.length > 0);

    res.json({
      evaluated_requirements: evaluatedRequirements,
      unreferenced_tables: unreferencedTables
    });

  } catch (error) {
    console.error("Traceability evaluation error:", error);
    res.status(500).json({ error: 'Failed to evaluate traceability' });
  }
});

app.post('/api/export/sql', (req, res) => {
  try {
    const { tables, relationships } = req.body;

    if (!tables || !Array.isArray(tables)) {
      return res.status(400).json({ error: 'Invalid tables payload' });
    }

    // Phase A: Kahn's Topological Sort
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize maps
    tables.forEach((t: any) => {
      inDegree.set(t.table_id, 0);
      adjList.set(t.table_id, []);
    });

    // Build DAG: target_table (parent) -> source_table (child with FK)
    (relationships || []).forEach((rel: any) => {
      const parentId = rel.target_table_id;
      const childId = rel.source_table_id;
      
      if (inDegree.has(childId) && adjList.has(parentId)) {
        adjList.get(parentId)!.push(childId);
        inDegree.set(childId, inDegree.get(childId)! + 1);
      }
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const sortedTableIds: string[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sortedTableIds.push(currentId);

      adjList.get(currentId)?.forEach(childId => {
        inDegree.set(childId, inDegree.get(childId)! - 1);
        if (inDegree.get(childId) === 0) {
          queue.push(childId);
        }
      });
    }

    if (sortedTableIds.length !== tables.length) {
      return res.status(400).json({ 
        error: 'Circular dependency detected. Topological sort failed. Please resolve cycles in your schema before exporting.' 
      });
    }

    // Sort the actual tables array based on Kahn's output
    const sortedTables = sortedTableIds
      .map(id => tables.find((t: any) => t.table_id === id))
      .filter(t => t !== undefined);

    // Phase B: PostgreSQL Code Generation
    let sqlScript = `-- SchemaForge: Auto-Generated PostgreSQL Schema\n`;
    sqlScript += `-- Generated at: ${new Date().toISOString()}\n\n`;

    // 1. Generate CREATE TABLE statements
    sortedTables.forEach((table: any) => {
      sqlScript += `CREATE TABLE "${table.name}" (\n`;
      
      const columnDefs = table.columns.map((col: any) => {
        let colStr = `  "${col.name}" ${col.datatype}`;
        if (col.is_primary_key) colStr += ' PRIMARY KEY';
        if (col.is_unique && !col.is_primary_key) colStr += ' UNIQUE';
        if (col.is_not_null && !col.is_primary_key) colStr += ' NOT NULL';
        return colStr;
      });

      sqlScript += columnDefs.join(',\n');
      sqlScript += `\n);\n\n`;
    });

    // 2. Generate ALTER TABLE statements for Foreign Keys
    if (relationships && relationships.length > 0) {
      sqlScript += `-- Foreign Key Constraints\n`;
      relationships.forEach((rel: any) => {
        const sourceTable = tables.find((t: any) => t.table_id === rel.source_table_id);
        const targetTable = tables.find((t: any) => t.table_id === rel.target_table_id);
        
        if (sourceTable && targetTable && rel.fk_column_id) {
          const fkColumn = sourceTable.columns.find((c: any) => c.column_id === rel.fk_column_id);
          // Standardize primary key matching (assumes target PK is 'id' or first PK found)
          const targetPkColumn = targetTable.columns.find((c: any) => c.is_primary_key) || targetTable.columns[0];
          
          if (fkColumn && targetPkColumn) {
            const constraintName = `fk_${sourceTable.name}_${fkColumn.name}`;
            sqlScript += `ALTER TABLE "${sourceTable.name}"\n`;
            sqlScript += `  ADD CONSTRAINT "${constraintName}"\n`;
            sqlScript += `  FOREIGN KEY ("${fkColumn.name}")\n`;
            sqlScript += `  REFERENCES "${targetTable.name}" ("${targetPkColumn.name}");\n\n`;
          }
        }
      });
    }

    res.json({ sql: sqlScript });

  } catch (error) {
    console.error("SQL Export error:", error);
    res.status(500).json({ error: 'Failed to generate SQL script' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
