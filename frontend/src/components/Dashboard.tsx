import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSchemaStore } from '../store/useSchemaStore';
import { LogOut, Plus, Folder, Clock, Trash2, Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  updated_at: string;
  schema_data: any;
}

export default function Dashboard({ onOpenProject, onLogout }: { onOpenProject: () => void, onLogout: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { setStoreState, clearStore } = useSchemaStore();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      // We won't alert here to avoid spamming on load, but we will log
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newProject = {
        name: 'Untitled Schema',
        user_id: user.id,
        schema_data: { tables: [], relationships: [], requirements: [] }
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([newProject])
        .select()
        .single();

      if (error) throw error;
      
      clearStore();
      useSchemaStore.setState({ activeProjectId: data.id, projectName: data.name });
      onOpenProject();
    } catch (error: any) {
      console.error('Error creating project:', error);
      alert("Failed to create project: " + (error.message || JSON.stringify(error)));
    }
  };

  const openProject = (project: Project) => {
    setStoreState(project.schema_data || { tables: [], relationships: [], requirements: [] });
    useSchemaStore.setState({ activeProjectId: project.id, projectName: project.name });
    onOpenProject();
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <header className="border-b border-zinc-900 bg-[#0a0a0a] px-6 py-3 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <h1 className="text-base font-semibold tracking-tight text-white">SchemaForge</h1>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
            v1.0
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50 hover:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-800"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">My Projects</h2>
          <button 
            onClick={createNewProject}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] border border-indigo-500/50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Schema
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-[#121215]/80 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-12 text-center flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 mb-6 shadow-inner">
              <Folder className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 mb-2">No projects yet</h3>
            <p className="text-sm text-zinc-500 mb-8 max-w-xs">Create your first database schema to start visually designing your architecture.</p>
            <button 
              onClick={createNewProject}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.25)] border border-indigo-500/50"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div 
                key={project.id}
                onClick={() => openProject(project)}
                className="bg-[#121215]/80 backdrop-blur-sm border border-zinc-800/80 rounded-xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-[#18181b] hover:shadow-[0_8px_30px_rgba(79,70,229,0.12)] hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Subtle top gradient line on hover */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-500/50 transition-all duration-500"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors shadow-inner">
                    <Folder className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <button 
                    onClick={(e) => deleteProject(project.id, e)}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-500/10 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-zinc-200 mb-1 truncate text-lg group-hover:text-indigo-100 transition-colors">{project.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mt-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {/* Inline Create Project Card */}
            <div 
              onClick={createNewProject}
              className="bg-transparent border-2 border-dashed border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 group flex flex-col items-center justify-center min-h-[160px]"
            >
              <div className="w-10 h-10 bg-zinc-900/50 rounded-lg flex items-center justify-center border border-zinc-800 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-colors mb-3">
                <Plus className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="font-medium text-zinc-400 group-hover:text-indigo-300 transition-colors">Create New Schema</h3>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
