import { useState } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';

export default function TraceabilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [newReq, setNewReq] = useState('');
  const [loading, setLoading] = useState(false);

  const { 
    requirements, 
    unreferencedTables,
    addRequirement, 
    deleteRequirement, 
    setTraceabilityReport,
    tables,
    relationships
  } = useSchemaStore();

  const handleAdd = () => {
    if (newReq.trim()) {
      addRequirement(newReq.trim());
      setNewReq('');
    }
  };

  const handleRunTraceability = async () => {
    if (requirements.length === 0) return;
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/traceability/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requirements,
          currentSchema: { tables, relationships }
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        alert("Traceability Error: " + data.error);
        return;
      }

      setTraceabilityReport(data.evaluated_requirements, data.unreferenced_tables);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ml-2 ${
          isOpen 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
            : 'bg-transparent border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900 text-zinc-300'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
        Traceability
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 w-[480px] bg-[#0a0a0a] border border-zinc-800 shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden ring-1 ring-white/5" style={{ maxHeight: '85vh' }}>
          
          {/* Header */}
          <div className="bg-[#121212] border-b border-zinc-800/80 text-zinc-100 px-5 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-zinc-100 leading-none">Architecture Traceability</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Verify logic against foreign-key graph</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
            {/* Input Section */}
            <div className="flex gap-2">
              <input 
                value={newReq}
                onChange={(e) => setNewReq(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Ex: Show all orders placed by a specific user..."
                className="flex-1 px-3 py-2 bg-[#121212] border border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-zinc-200 placeholder-zinc-600 shadow-inner transition-all"
              />
              <button 
                onClick={handleAdd}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] border border-indigo-500/50"
              >
                Add
              </button>
            </div>

            {/* List Section */}
            <div className="flex flex-col gap-2.5 mt-2">
              {requirements.length === 0 && (
                <div className="text-[11px] text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-lg">
                  No requirements specified.<br/>Add a business rule above to validate the schema.
                </div>
              )}
              {requirements.map(req => (
                <div key={req.id} className="group relative p-3.5 rounded-lg border border-zinc-800/80 bg-[#121212] transition-colors hover:border-zinc-700">
                  <button onClick={() => deleteRequirement(req.id)} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                  
                  <p className="text-[12px] text-zinc-300 leading-relaxed pr-6">{req.text}</p>
                  
                  {req.is_supported !== undefined && (
                    <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        {req.is_supported ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Supported
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded text-red-400 bg-red-400/10 border border-red-400/20 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Unsupported
                          </span>
                        )}
                        {req.involved_tables && req.involved_tables.length > 0 && (
                          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            {req.involved_tables.join(' → ')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400/80 leading-relaxed">{req.reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dead Design Section */}
            {unreferencedTables.length > 0 && (
              <div className="mt-2 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-lg flex flex-col gap-2">
                <span className="text-[10px] font-bold text-amber-500/90 uppercase tracking-wider flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  Dead Design Detected
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  The following tables are not mapped to any supported business requirement: 
                  <span className="font-mono text-amber-500/80 ml-1.5">{unreferencedTables.join(', ')}</span>
                </p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-zinc-800/80 bg-[#121212]">
            <button 
              onClick={handleRunTraceability}
              disabled={loading || requirements.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800 text-white font-semibold py-2.5 rounded-lg text-[12px] transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)] border border-indigo-500/50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing Graph...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Run Traceability Engine
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
