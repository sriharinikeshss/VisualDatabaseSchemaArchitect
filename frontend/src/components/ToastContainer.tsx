import React from 'react';
import { useToastStore } from '../store/useToastStore';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-start justify-between min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              isError 
                ? 'bg-red-500/10 border-red-500/20 text-red-200' 
                : isSuccess 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                  : 'bg-[#18181b]/90 border-zinc-700/50 text-zinc-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {isError && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                {isSuccess && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                )}
                {!isError && !isSuccess && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                )}
              </div>
              <p className="text-[13px] font-medium leading-relaxed drop-shadow-sm">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className={`ml-4 opacity-70 hover:opacity-100 transition-opacity p-1 rounded-md ${isError ? 'hover:bg-red-500/20' : isSuccess ? 'hover:bg-emerald-500/20' : 'hover:bg-zinc-700'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
