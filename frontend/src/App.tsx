import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Editor from './Editor';

export default function App() {
  const [view, setView] = useState<'auth' | 'dashboard' | 'editor'>('auth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setView(session ? 'dashboard' : 'auth');
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setView(session ? 'dashboard' : 'auth');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-indigo-500">
        <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (view === 'auth') {
    return <Auth onLogin={() => setView('dashboard')} />;
  }

  if (view === 'dashboard') {
    return (
      <Dashboard 
        onOpenProject={() => setView('editor')} 
        onLogout={() => {
          supabase.auth.signOut();
          setView('auth');
        }} 
      />
    );
  }

  return <Editor onBackToDashboard={() => setView('dashboard')} />;
}
