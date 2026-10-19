import { useState, useRef, useEffect } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';
import { getLayoutedElements } from '../utils/layout';
import { v4 as uuidv4 } from 'uuid';

export default function ChatSidebar() {
  const { 
    isChatOpen, 
    toggleChat, 
    chatMessages, 
    addChatMessage, 
    tables, 
    relationships, 
    setSchema 
  } = useSchemaStore();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  if (!isChatOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userPrompt = input.trim();
    addChatMessage({ role: 'user', content: userPrompt });
    setInput('');
    setLoading(true);

    try {
      // Send the prompt AND the current schema to the backend
      const response = await fetch('http://localhost:3000/api/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userPrompt,
          currentSchema: { tables, relationships }
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to reach backend or generation timed out');
      }

      const data = await response.json();
      
      // Layout the newly generated/modified tables
      const { nodes: layoutNodeData } = await getLayoutedElements(
        data.tables.map((t: any) => ({ id: t.table_id, data: t, position: { x: 0, y: 0 } })),
        data.relationships.map((r: any) => ({ id: r.relationship_id || uuidv4(), source: r.source_table_id, target: r.target_table_id }))
      );

      // Preserve existing user-moved positions where possible
      const layoutedTables = data.tables.map((t: any) => {
        const existingTable = tables.find(et => et.table_id === t.table_id);
        if (existingTable && existingTable.position) {
            return { ...t, position: existingTable.position };
        }
        const layoutNode = layoutNodeData.find(n => n.id === t.table_id);
        return {
          ...t,
          position: layoutNode ? layoutNode.position : { x: 0, y: 0 }
        };
      });

      const processedRelationships = data.relationships.map((rel: any) => {
        let fkColId = rel.fk_column_id;
        const sourceTable = layoutedTables.find((t: any) => t.table_id === rel.source_table_id);
        const targetTable = layoutedTables.find((t: any) => t.table_id === rel.target_table_id);
        
        if (sourceTable) {
          const fkExists = sourceTable.columns.some((c: any) => c.column_id === fkColId);
          if (!fkExists) {
            // AI might have failed to assign fk_column_id accurately. Let's guess it.
            let guessedFk;
            if (targetTable) {
              guessedFk = sourceTable.columns.find((c: any) => c.name.toLowerCase() === `${targetTable.name.toLowerCase()}_id`);
            }
            if (!guessedFk) {
              guessedFk = sourceTable.columns.find((c: any) => c.name.endsWith('_id') && !c.is_primary_key);
            }
            if (guessedFk) {
              fkColId = guessedFk.column_id;
            }
          }
        }

        return {
          ...rel,
          fk_column_id: fkColId,
          relationship_id: rel.relationship_id || uuidv4()
        };
      });

      // Update canvas state
      setSchema(layoutedTables, processedRelationships);
      
      // Auto-validate AI Output
      const { validateSchema } = await import('../utils/validationEngine');
      const reports = validateSchema(layoutedTables, processedRelationships);
      useSchemaStore.getState().setValidationReports(reports);

      // Add success response to chat
      addChatMessage({ role: 'assistant', content: 'Schema updated successfully!' });
      
    } catch (err: any) {
      console.error(err);
      addChatMessage({ role: 'assistant', content: `Error: ${err.message || 'Failed to connect to backend server.'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[340px] bg-[#09090b] border-r border-zinc-800 flex flex-col h-full text-zinc-100 shadow-2xl z-30 transition-transform">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181b]/50">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-bold">✨</span>
          <h2 className="text-sm font-semibold tracking-wide">AI Copilot</h2>
        </div>
        <button onClick={toggleChat} className="text-zinc-500 hover:text-zinc-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[9px] text-zinc-600 font-medium mt-1 uppercase tracking-wider px-1">
              {msg.role === 'user' ? 'You' : 'Copilot'}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="bg-[#18181b] border border-zinc-800 px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-[9px] text-zinc-600 font-medium mt-1 uppercase tracking-wider px-1">Copilot is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-zinc-800 bg-[#09090b]">
        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="E.g. 'Add a Stripe customer_id column to the users table'"
            className="w-full bg-[#121215] border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none min-h-[64px]"
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute bottom-2.5 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div className="text-center mt-2 text-[10px] text-zinc-600">
          Press <span className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">Enter</span> to send
        </div>
      </div>
    </div>
  );
}
