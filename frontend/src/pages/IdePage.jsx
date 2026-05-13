import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import IdeWorkspace from '../components/IdeWorkspace';
import FileExplorer from '../components/FileExplorer';
import { ChevronLeft, Loader2, File } from 'lucide-react';
import { api } from '../lib/api';
import socket from '../lib/socket';

export default function IdePage({ session }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(true);

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

      socket.on('ide:file-created', handleCreated);
      socket.on('ide:file-updated', handleUpdated);
      socket.on('ide:file-deleted', handleDeleted);

      return () => {
        socket.off('ide:file-created', handleCreated);
        socket.off('ide:file-updated', handleUpdated);
        socket.off('ide:file-deleted', handleDeleted);
      };
    }
  }, [projectId]);

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

  if (!user || loading) {
    return (
      <div className="h-screen w-screen bg-[#1e1e1e] flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-sm font-medium animate-pulse text-zinc-400">Loading IDE Environment...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0d0c13] flex flex-col text-white overflow-hidden font-sans">
      {/* Top Navbar */}
      <div className="h-12 border-b border-zinc-800 bg-[#181818] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/dashboard')}
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
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} alt="Avatar" className="w-6 h-6 rounded-full" />
            <span className="text-xs text-zinc-300">{user.name}</span>
          </div>
        </div>
      </div>

      {/* Main IDE Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div className="w-64 bg-[#181818] border-r border-zinc-800 flex flex-col hidden md:flex shrink-0">
          <FileExplorer 
            files={files} 
            activeFileId={activeFile?.id}
            onSelect={(file) => setActiveFile(file)}
            onAdd={handleAddFile}
            onDelete={handleDeleteFile}
            onRename={handleRename}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeFile ? (
            <IdeWorkspace 
              key={activeFile.id}
              projectId={projectId} 
              user={user} 
              fileId={activeFile.id}
              fileName={activeFile.name}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
                <File size={40} className="text-zinc-800" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No file open</p>
                <p className="text-xs text-zinc-700 mt-1">Select or create a file to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

