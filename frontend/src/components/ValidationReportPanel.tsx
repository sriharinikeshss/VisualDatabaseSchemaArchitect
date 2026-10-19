import { useState } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';

const renderMarkdown = (text: string) => {
  if (!text) return null;
  // Regex matches **bold**, *italics*, and `code`
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="text-indigo-200 font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i} className="text-indigo-300 italic opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return <code key={i} className="bg-indigo-900/40 border border-indigo-500/30 px-1 py-0.5 rounded text-indigo-300 font-mono text-[10px]">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
};

export default function ValidationReportPanel() {
  const { validationReports, clearValidationReports } = useSchemaStore();
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  if (validationReports.length === 0) return null;

  const errors = validationReports.filter(r => r.severity === 'Error');
  const warnings = validationReports.filter(r => r.severity === 'Warning');

  const handleExplain = async (report: any, idx: number) => {
    // Toggle off if already explained
    if (explanations[idx]) {
      const newExps = { ...explanations };
      delete newExps[idx];
      setExplanations(newExps);
      return;
    }

    setLoadingIndex(idx);
    try {
      const response = await fetch('http://localhost:3000/api/explain-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: report, 
          context: useSchemaStore.getState().tables 
        })
      });
      const data = await response.json();
      setExplanations(prev => ({
        ...prev,
        [idx]: data.explanation || "Could not explain this error."
      }));
    } catch (e) {
      setExplanations(prev => ({
        ...prev,
        [idx]: "Failed to connect to backend."
      }));
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="absolute bottom-6 left-6 w-[450px] max-h-[500px] bg-[#0a0a0a] border border-zinc-800 shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden ring-1 ring-white/5">
      <div className="bg-[#121212] border-b border-zinc-800/80 text-zinc-100 px-5 py-3.5 flex justify-between items-center">
        <h3 className="text-[13px] font-semibold flex items-center gap-2">
          Validation Engine
          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full">{errors.length}</span>
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full">{warnings.length}</span>
        </h3>
        <button onClick={clearValidationReports} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      
      <div className="overflow-y-auto p-4 flex flex-col gap-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
        
        {validationReports.map((report, idx) => (
          <div 
            key={idx} 
            className={`p-3.5 rounded-lg border flex flex-col gap-2.5 transition-colors ${
              report.severity === 'Error' 
                ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30' 
                : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  report.severity === 'Error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {report.severity}
                </span>
                <span className="text-[12px] font-mono font-semibold text-zinc-200">{report.rule_violated}</span>
              </div>
              <button 
                onClick={() => handleExplain(report, idx)}
                disabled={loadingIndex === idx}
                className={`text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  explanations[idx] 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30' 
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                }`}
              >
                {loadingIndex === idx ? (
                  <>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Thinking...
                  </>
                ) : explanations[idx] ? (
                  'Hide'
                ) : (
                  'Explain'
                )}
              </button>
            </div>
            
            <p className="text-[12px] leading-relaxed text-zinc-300 pr-2">{report.message}</p>

            {/* Inline AI Explanation Accordion */}
            {explanations[idx] && (
              <div className="mt-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-md animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                    AI Analysis
                  </span>
                </div>
                <p className="text-[12px] text-indigo-100/90 leading-relaxed">
                  {renderMarkdown(explanations[idx])}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
