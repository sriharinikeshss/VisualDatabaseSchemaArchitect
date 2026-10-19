import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sqlScript: string;
}

export default function ExportModal({ isOpen, onClose, sqlScript }: ExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlScript], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_export.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-zinc-800 shadow-2xl rounded-xl w-full max-w-3xl flex flex-col overflow-hidden ring-1 ring-white/5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#121212] border-b border-zinc-800/80 px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-100 leading-none">PostgreSQL Export</h2>
              <p className="text-[11px] text-zinc-500 mt-1">Topologically sorted and validated schema</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Code Editor Area */}
        <div className="relative bg-[#0d0d0f] p-5 overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
          <pre className="text-[13px] font-mono text-zinc-300 leading-relaxed">
            <code>{sqlScript}</code>
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#121212] border-t border-zinc-800/80 p-4 flex justify-end gap-3">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-600"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy to Clipboard
              </>
            )}
          </button>
          
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download .sql
          </button>
        </div>

      </div>
    </div>
  );
}
