import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import * as Icons from 'lucide-react';
const { 
  FileCode2, Save, Users, Play, Terminal: TerminalIcon, 
  Sparkles, Download, X, ChevronRight, Globe 
} = Icons;
const GitHub = Icons.GitHub || Icons.Github || Icons.Code;

import Terminal from './Terminal';
import AiSidebar from './AiSidebar';
import XpNotification from './XpNotification';
import socket from '../lib/socket';
import api from '../lib/api';

export default function IdeWorkspace({ projectId, user, fileId, fileName }) {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  const [editorInstance, setEditorInstance] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState('Welcome to TeamSync Terminal v1.0\r\n\r\n');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Phase 5 States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  // Initialize Yjs document and WebSocket connection
  useEffect(() => {
    if (!projectId || !user || !fileId) return;

    const doc = new Y.Doc();
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const wsEndpoint = wsUrl.startsWith('http') ? wsUrl.replace('http', 'ws') : wsUrl;
    
    // Use fileId in the room name for isolation
    const roomName = `project-${projectId}-${fileId}`;
    console.log(`[IDE] Connecting to Yjs room: ${roomName} for file: ${fileName}`);
    
    const provider = new WebsocketProvider(
      `${wsEndpoint}/yjs`,
      roomName,
      doc
    );

    providerRef.current = provider;

    provider.on('status', event => {
      console.log(`[IDE] Connection status: ${event.status}`);
      setConnected(event.status === 'connected');
    });

    const awareness = provider.awareness;
    const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    
    // Set local state
    awareness.setLocalStateField('user', {
      name: user.name,
      color: color,
      initial: user.name.charAt(0).toUpperCase()
    });

    // Track active users
    const updateUsers = () => {
      const states = awareness.getStates();
      const users = [];
      states.forEach((state) => {
        if (state.user) {
          users.push(state.user);
        }
      });
      setActiveUsers(users);
    };

    awareness.on('change', updateUsers);
    updateUsers();

    // Fetch User Profile for XP/Level display
    api('/api/profile').then(data => {
      if (data && !data.error) setUserProfile(data);
    });

    return () => {
      console.log(`[IDE] Cleaning up Yjs provider for ${fileName}`);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      provider.disconnect();
      doc.destroy();
      providerRef.current = null;
    };
  }, [projectId, user, fileId, fileName]); // Re-initialize if file changes

  // Bind Editor to Yjs once both are ready
  useEffect(() => {
    if (editorInstance && providerRef.current && !bindingRef.current) {
      console.log(`[IDE] Binding Monaco to Yjs for ${fileName}`);
      const doc = providerRef.current.doc;
      const type = doc.getText('monaco');

      bindingRef.current = new MonacoBinding(
        type,
        editorInstance.getModel(),
        new Set([editorInstance]),
        providerRef.current.awareness
      );
    }
  }, [editorInstance, connected, fileName]);

  // Sync DOM attributes for remote cursors
  useEffect(() => {
    if (!connected || !providerRef.current) return;

    const awareness = providerRef.current.awareness;
    
    const syncCursorAttributes = () => {
      setTimeout(() => {
        const remoteHeads = document.querySelectorAll('.yRemoteSelectionHead');
        remoteHeads.forEach(el => {
          if (!el.getAttribute('data-initial')) {
             const remoteUser = activeUsers.find(u => u.name !== user.name);
             if (remoteUser) {
               el.setAttribute('data-initial', remoteUser.initial);
               el.setAttribute('data-name', remoteUser.name);
               el.style.setProperty('--cursor-color', remoteUser.color);
               
               const r = parseInt(remoteUser.color.slice(1, 3), 16);
               const g = parseInt(remoteUser.color.slice(3, 5), 16);
               const b = parseInt(remoteUser.color.slice(5, 7), 16);
               el.style.setProperty('--cursor-color-alpha', `rgba(${r}, ${g}, ${b}, 0.2)`);
             }
          }
        });
      }, 100);
    };

    awareness.on('change', syncCursorAttributes);
    return () => awareness.off('change', syncCursorAttributes);
  }, [connected, activeUsers, user.name]);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    setEditorInstance(editor);
  }

  // Determine language from file extension
  const getLanguage = (fname) => {
    const ext = fname.split('.').pop().toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'cpp': return 'cpp';
      case 'hpp': return 'cpp';
      case 'cc': return 'cpp';
      case 'java': return 'java';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  const handleRunCode = () => {
    if (!editorInstance || isExecuting) return;
    
    const code = editorInstance.getValue();
    const language = getLanguage(fileName);
    
    const allowed = ['python', 'javascript', 'cpp', 'java'];
    if (!allowed.includes(language)) {
      alert('Currently supported: Python, JavaScript, C++, and Java.');
      return;
    }
    
    setIsTerminalOpen(true);
    setIsExecuting(true);
    setTerminalOutput(`Starting ${language} execution...\n`);
    
    socket.emit('run-code', { 
      projectId, 
      fileId, 
      language, 
      code 
    });
  };

  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) return;
    try {
      const res = await api(`/api/projects/${projectId}/import-github`, 'POST', { url: githubUrl });
      if (res.error) throw new Error(res.error);
      setGithubUrl('');
      setIsImportModalOpen(false);
      alert(`Successfully imported ${res.count} files from GitHub!`);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    const handleOutput = (data) => {
      console.log(`[IDE] 📥 Received code-output:`, data);
      setIsTerminalOpen(true); // Force open
      setTerminalOutput(prev => prev + data);
    };

    const handleExit = (code) => {
      console.log(`[IDE] 🏁 Process exited:`, code);
      setIsExecuting(false);
      setTerminalOutput(prev => prev + `\n[Process exited with code ${code}]\n`);
    };

    socket.on('code-output', handleOutput);
    socket.on('code-exit', handleExit);

    return () => {
      socket.off('code-output', handleOutput);
      socket.off('code-exit', handleExit);
    };
  }, []);


  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] border-l border-zinc-800">
      {/* Editor Header / Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-zinc-800 text-zinc-300">
        <div className="flex items-center space-x-2">
          <FileCode2 size={16} className="text-yellow-400" />
          <span className="text-sm font-medium">{fileName}</span>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ml-2`} title={connected ? 'Connected' : 'Disconnected'} />
          
          <div className="flex items-center ml-6 space-x-2">
            <Users size={14} className="text-zinc-500" />
            <div className="flex -space-x-2 overflow-hidden">
              {activeUsers.map((u, i) => (
                <div 
                  key={i} 
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-[#252526] flex items-center justify-center text-[10px] font-bold text-white uppercase"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {u.initial}
                </div>
              ))}
            </div>
            <span className="text-[10px] text-zinc-500 font-medium ml-1">
              {activeUsers.length} active
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 text-xs hover:text-white transition-colors">
            <Save size={14} />
            <span>Auto-saving</span>
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleRunCode}
              disabled={isExecuting}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all font-bold text-[10px] uppercase tracking-wider shadow-lg ${
                isExecuting ? 'bg-zinc-700 text-zinc-500' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
              }`}
            >
              <Play size={12} fill="currentColor" />
              <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
            </button>
            <button 
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all font-bold text-[10px] uppercase tracking-wider shadow-lg ${
                isAiOpen ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <Sparkles size={12} className={isAiOpen ? 'text-white' : 'text-purple-400'} />
              <span>Ask AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full relative">
        <Editor
          height="100%"
          language={getLanguage(fileName)}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 }
          }}
        />
        
        {!connected && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="text-white text-lg flex items-center space-x-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              <span>Connecting to collaboration server...</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal */}
      <Terminal 
        isOpen={isTerminalOpen}
        output={terminalOutput}
        isExecuting={isExecuting}
        onClose={() => setIsTerminalOpen(false)}
        onClear={() => setTerminalOutput('')}
      />

      {/* AI Sidebar */}
      <AiSidebar 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
        currentCode={editorInstance?.getValue() || ''}
      />

      {/* XP System */}
      <XpNotification currentUserId={user.id} />

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Import Resources</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* GitHub Section */}
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">From GitHub</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="https://github.com/owner/repo"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="flex-1 bg-[#252526] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                    />
                    <button 
                      onClick={handleGitHubImport}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 italic opacity-50">Dashboard sync coming soon</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

