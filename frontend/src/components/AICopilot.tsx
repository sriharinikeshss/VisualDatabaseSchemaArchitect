import { useState } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import { getLayoutedElements } from '../utils/layout';
import { v4 as uuidv4 } from 'uuid';

export default function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSchema } = useSchemaStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert("AI Error: " + data.error);
        setLoading(false);
        return;
      }

      // Convert tables to React Flow nodes format temporarily for Dagre
      const tempNodes = data.tables.map((t: any) => ({
        id: t.table_id,
        position: { x: 0, y: 0 },
        data: { ...t }
      }));
      
      const tempEdges = data.relationships.map((r: any) => ({
        id: r.relationship_id || Math.random().toString(),
        source: r.source_table_id,
        target: r.target_table_id
      }));

      // Apply Dagre layout
      const { nodes: layoutedNodes } = getLayoutedElements(tempNodes, tempEdges);

      // Re-map back to our Zustand Table state
      const layoutedTables = data.tables.map((t: any) => {
        const layoutNode = layoutedNodes.find((n: any) => n.id === t.table_id);
        return {
          ...t,
          position: layoutNode ? layoutNode.position : { x: 0, y: 0 }
        };
      });

      // Ensure all relationships have a unique relationship_id so React Flow renders them all
      const processedRelationships = data.relationships.map((rel: any) => ({
        ...rel,
        relationship_id: rel.relationship_id || uuidv4()
      }));

      setSchema(layoutedTables, processedRelationships);
      
      // Auto-validate AI Output (FR-17)
      // We import validateSchema dynamically or at the top
      const { validateSchema } = await import('../utils/validationEngine');
      const reports = validateSchema(layoutedTables, processedRelationships);
      useSchemaStore.getState().setValidationReports(reports);

      setIsOpen(false);
      setPrompt('');
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server. Make sure it is running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-white shadow-sm shadow-indigo-900/20"
      >
        <span className="text-yellow-400 font-bold">✨</span>
        AI Copilot
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-80 bg-[#18181b] border border-zinc-800 shadow-2xl rounded-xl p-4 z-50">
          <h3 className="font-semibold text-zinc-100 mb-1 text-sm flex items-center gap-2">
            Generate with AI
          </h3>
          <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">Describe your system (e.g., 'An e-commerce platform with products, orders, and reviews').</p>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="w-full p-2.5 bg-[#121215] border border-zinc-800 rounded-md text-xs font-mono h-24 mb-3 resize-none focus:outline-none focus:border-indigo-500 text-zinc-300 placeholder-zinc-700"
            placeholder="A hospital management system..."
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium py-2 rounded-md text-xs transition-colors flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border-2 border-zinc-400 border-t-white rounded-full animate-spin"></span>
                Generating...
              </>
            ) : 'Generate Schema'}
          </button>
        </div>
      )}
    </div>
  );
}
