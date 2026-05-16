import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import IdeWorkspace from '../components/IdeWorkspace';
import FileExplorer from '../components/FileExplorer';
import * as Icons from 'lucide-react';
const { ChevronLeft, Loader2, File, Download, ChevronRight, X, Sparkles } = Icons;
const GitHub = Icons.GitHub || Icons.Github || Icons.Code;
import { api } from '../lib/api';
import socket from '../lib/socket';
import { useTheme } from '../lib/ThemeContext';

export default function IdePage({ session }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);

  // Phase 5 States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [dashboardFiles, setDashboardFiles] = useState([]);
  const [githubAssets, setGithubAssets] = useState([]);
  const fileInputRef = React.useRef(null);
  const [importTab, setImportTab] = useState('github'); // 'github' or 'dashboard'
  const [toast, setToast] = useState(null);
  const [isPushing, setIsPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Update from TeamSync IDE');
  const [branchName, setBranchName] = useState('main');
  const [showGitPanel, setShowGitPanel] = useState(false);


  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };


  // 1. Get user profile
  useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setUser(data);
        });
    }
  }, [session]);

  // 2. Fetch file tree
  const fetchFiles = async () => {
    try {
      const data = await api(`/api/projects/${projectId}/files`);
      if (data && Array.isArray(data)) {
        setFiles(data);
        
        // Auto-open main.py if it exists and no file is active
        if (data.length > 0 && !activeFile) {
          const mainPy = data.find(f => f.name === 'main.py' && f.type === 'file');
          if (mainPy) setActiveFile(mainPy);
          else {
            const firstFile = data.find(f => f.type === 'file');
            if (firstFile) setActiveFile(firstFile);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      localStorage.setItem('teamsync_last_team_id', projectId);
      fetchFiles();

      // Join project room for real-time file updates
      socket.emit('join:project', { projectId });

      const handleCreated = ({ projectId: pid, file }) => {
        if (pid === projectId) {
          setFiles(prev => {
            if (prev.find(f => f.id === file.id)) return prev;
            return [...prev, file];
          });
        }
      };

      const handleUpdated = ({ projectId: pid, file }) => {
        if (pid === projectId) {
          setFiles(prev => prev.map(f => f.id === file.id ? file : f));
          setActiveFile(current => current?.id === file.id ? file : current);
        }
      };

      const handleDeleted = ({ projectId: pid, fileId }) => {
        if (pid === projectId) {
          setFiles(prev => prev.filter(f => f.id !== fileId));
          setActiveFile(current => current?.id === fileId ? null : current);
        }
      };

      const handleSynced = () => {
        console.log('[IDE] 🔄 Files synced, refreshing list...');
        fetchFiles();
      };

      socket.on('ide:file-created', handleCreated);
      socket.on('ide:file-updated', handleUpdated);
      socket.on('ide:file-deleted', handleDeleted);
      socket.on('ide:files-synced', handleSynced);

      // Fetch Dashboard Files for import
      api(`/api/projects/${projectId}/dashboard-files`).then(data => {
        if (data && Array.isArray(data)) setDashboardFiles(data);
      });

      // Fetch Project Metadata and GitHub assets
      api(`/api/projects/${projectId}`).then(data => {
        if (data && !data.error) {
          setProjectData(data);
          if (data.github_repo) {
            const [owner, repo] = data.github_repo.split('/');
            api(`/api/github/contents/${owner}/${repo}`).then(assets => {
              if (assets && Array.isArray(assets)) setGithubAssets(assets);
            });
          }
        }
      });

      return () => {
        socket.off('ide:file-created', handleCreated);
        socket.off('ide:file-updated', handleUpdated);
        socket.off('ide:file-deleted', handleDeleted);
        socket.off('ide:files-synced', handleSynced);
      };
    }
  }, [projectId]);

  // 3. Welcome Notification
  useEffect(() => {
    if (!loading && projectData) {
      const timer = setTimeout(() => {
        showToast(
          "🚀 Environment Ready! Supported: Python 3.10, Node.js 18, C++ (GCC 12), Java 17", 
          "info", 
          10000
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, !!projectData]);

  // 3. File CRUD operations
  const handleAddFile = async (parentId, type) => {
    const name = window.prompt(`Enter ${type} name:`);
    if (!name) return;

    try {
      const newFile = await api(`/api/projects/${projectId}/files`, 'POST', { name, type, parentId });
      if (newFile && !newFile.error) {
        setFiles(prev => {
          if (prev.find(f => f.id === newFile.id)) return prev;
          return [...prev, newFile];
        });
        if (type === 'file') setActiveFile(newFile);
      } else {
        throw new Error(newFile?.error || 'Failed to create');
      }
    } catch (err) {
      alert('Failed to create: ' + err.message);
    }
  };

  const handleRename = async (item) => {
    const newName = window.prompt(`Rename ${item.type} to:`, item.name);
    if (!newName || newName === item.name) return;

    try {
      const updatedFile = await api(`/api/projects/${projectId}/files/${item.id}`, 'PUT', { name: newName });
      if (updatedFile && !updatedFile.error) {
        setFiles(prev => prev.map(f => f.id === item.id ? updatedFile : f));
        if (activeFile?.id === item.id) {
          setActiveFile(current => current?.id === item.id ? updatedFile : current);
        }
      } else {
        throw new Error(updatedFile?.error || 'Failed to rename');
      }
    } catch (err) {
      alert('Failed to rename: ' + err.message);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;

    try {
      const res = await api(`/api/projects/${projectId}/files/${fileId}`, 'DELETE');
      if (res && res.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (activeFile?.id === fileId) setActiveFile(null);
      } else {
        throw new Error(res?.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleSingleGithubImport = async (item) => {
    if (!projectData?.github_repo) return;
    const [owner, repo] = projectData.github_repo.split('/');
    try {
      const data = await api(`/api/github/file/${owner}/${repo}/${item.path}`);
      if (!data || data.error) throw new Error(data.error || 'Failed to fetch content');
      let decoded;
      try { decoded = atob(data.content.replace(/\n/g, '')); } catch { decoded = data.content; }

      const res = await api(`/api/projects/${projectId}/files`, 'POST', {
        name: item.name,
        type: 'file',
        content: decoded
      });
      if (res.error) throw new Error(res.error);
      setActiveFile(res);
    } catch (err) {
      showToast('GitHub Sync Error: ' + err.message, 'error');
    }
  };


  const handleDashboardImport = async (fileId) => {
    showToast('Importing asset...', 'info');
    try {
      const res = await api(`/api/projects/${projectId}/import-dashboard`, 'POST', { fileId });
      if (res.error) throw new Error(res.error);
      setActiveFile(res);
      showToast('Asset imported successfully!');
      console.log('[IDE] 🔄 Dashboard file synced and opened:', res.name);
    } catch (err) {
      showToast('Import Error: ' + err.message, 'error');
    }
  };


  const handlePushToGithub = async () => {
    if (!projectData?.github_repo) {
      showToast('No GitHub repository linked to this project', 'error');
      return;
    }
    
    const token = window.prompt('Enter your GitHub Personal Access Token (PAT):', '');
    if (!token) return;

    setIsPushing(true);
    showToast('Pushing changes to GitHub...', 'info');
    
    try {
      const res = await api(`/api/projects/${projectId}/github/push`, 'POST', {
        branch: branchName,
        message: commitMessage,
        token
      });

      if (res && res.success) {
        showToast('Successfully pushed to GitHub!');
        setShowGitPanel(false);
      } else {
        throw new Error(res?.error || 'Push failed');
      }
    } catch (err) {
      showToast('GitHub Push Error: ' + err.message, 'error');
    } finally {
      setIsPushing(false);
    }
  };
  const handleLocalFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
        const res = await api(`/api/projects/${projectId}/files`, 'POST', {
          name: file.name,
          type: 'file',
          content: content
        });
        if (res.error) throw new Error(res.error);
        setActiveFile(res);
      } catch (err) {
        alert('Upload Error: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (!user || loading) {
    return (
      <div className="h-screen w-screen bg-[var(--ide-editor)] flex flex-col items-center justify-center text-[var(--text-primary)] space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-sm font-medium animate-pulse text-zinc-400">Loading IDE Environment...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[var(--ide-bg)] flex flex-col text-[var(--text-primary)] overflow-hidden font-sans relative">
      {/* Top Navbar */}
      <div className="h-12 border-b border-[var(--ide-border)] bg-[var(--ide-header)] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/dashboard?teamId=${projectId}`)}
            className="text-zinc-400 hover:text-white transition-colors flex items-center space-x-1"
          >
            <ChevronLeft size={16} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <div className="h-4 w-px bg-zinc-700"></div>
          <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            NexusIDE <span className="text-zinc-500 font-normal ml-2">Project: {projectId}</span>
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all mr-2"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
            </button>
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="Avatar" className="w-6 h-6 rounded-full border border-white/10" />
            <span className="text-xs text-zinc-300">{user.name}</span>
          </div>
        </div>
      </div>

      {/* Main IDE Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div className="w-64 bg-[var(--ide-sidebar)] border-r border-[var(--ide-border)] flex flex-col hidden md:flex shrink-0">
          <FileExplorer 
            files={files} 
            activeFileId={activeFile?.id}
            onSelect={(file) => setActiveFile(file)}
            onAdd={handleAddFile}
            onDelete={handleDeleteFile}
            onRename={handleRename}
            dashboardFiles={dashboardFiles}
            onImportDashboard={handleDashboardImport}
            githubAssets={githubAssets}
            onImportGithub={handleSingleGithubImport}
            githubRepoInfo={projectData?.github_repo ? { 
              owner: projectData.github_repo.split('/')[0], 
              repo: projectData.github_repo.split('/')[1] 
            } : null}
          />

          {/* XP Progress Section */}
          <div className="p-4 border-t border-[var(--ide-border)] bg-[var(--ide-bg)] opacity-90">
            <div className="flex items-center justify-between mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span className="text-purple-400">Level {user.level || 1}</span>
              <span>{user.xp || 0} XP</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 shadow-[0_0_8px_rgba(168,85,247,0.4)]" 
                style={{ width: `${Math.min(100, ((user.xp || 0) % 200) / 2)}%` }}
              />
            </div>
            
            {/* GitHub Sync Section */}
            {projectData?.github_repo && (
              <div className="mb-4">
                <button 
                  onClick={() => setShowGitPanel(!showGitPanel)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider border ${
                    showGitPanel ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <GitHub size={14} />
                    <span>GitHub Sync</span>
                  </div>
                  <ChevronRight size={14} className={`transition-transform ${showGitPanel ? 'rotate-90' : ''}`} />
                </button>

                {showGitPanel && (
                  <div className="mt-2 p-3 bg-zinc-900/50 rounded-xl border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-black mb-1 block">Target Branch</label>
                      <input 
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500/50"
                        placeholder="main"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-500 uppercase font-black mb-1 block">Commit Message</label>
                      <textarea 
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-purple-500/50 resize-none h-16"
                        placeholder="What changed?"
                      />
                    </div>
                    <button 
                      onClick={handlePushToGithub}
                      disabled={isPushing}
                      className="w-full flex items-center justify-center space-x-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider"
                    >
                      {isPushing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Pushing...</span>
                        </>
                      ) : (
                        <>
                          <Icons.UploadCloud size={14} />
                          <span>Push to GitHub</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleLocalFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider border border-white/5 shadow-lg mb-2"
            >
              <Download size={14} />
              <span>Upload from PC</span>
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeFile ? (
            <IdeWorkspace 
              key={activeFile.id}
              projectId={projectId} 
              user={user} 
              fileId={activeFile.id}
              fileName={activeFile.name}
              isAiOpen={isAiOpen}
              setIsAiOpen={setIsAiOpen}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4 bg-[var(--ide-editor)]">
              <div className="w-24 h-24 rounded-full bg-[var(--bg-primary)] opacity-50 flex items-center justify-center">
                <Icons.File size={40} className="text-[var(--text-muted)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">No file open</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Select or create a file to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border flex items-center space-x-3 ${
            toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
            toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
            'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          }`}>
            {toast.type === 'error' ? <Icons.AlertCircle size={18} /> : 
             toast.type === 'info' ? <Icons.Info size={18} /> : 
             <Icons.CheckCircle2 size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


