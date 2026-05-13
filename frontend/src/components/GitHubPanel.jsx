import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Folder, FileCode, ArrowLeft, Link, Unlink, X, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

export default function GitHubPanel({ teamId, currentTeam, isLeader, onTeamUpdate }) {
  const [contents, setContents] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');

  const githubRepo = currentTeam?.githubRepo;
  const [owner, repo] = (githubRepo || '').split('/');

  const fetchContents = async (path = '') => {
    if (!owner || !repo) return;
    setLoading(true);
    setFileContent(null);
    setError('');
    try {
      const data = await api(`/api/github/contents/${owner}/${repo}?path=${encodeURIComponent(path)}`);
      if (data && Array.isArray(data)) {
        const sorted = data.sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setContents(sorted);
        setCurrentPath(path);
      } else {
        setError(data?.error || 'Failed to load repo contents');
      }
    } catch (e) {
      setError('Failed to load repo');
    }
    setLoading(false);
  };

  const fetchFile = async (path) => {
    if (!owner || !repo) return;
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/github/file/${owner}/${repo}/${path}`);
      if (data && data.content !== undefined) {
        let decoded;
        try { decoded = atob(data.content.replace(/\n/g, '')); } catch { decoded = data.content; }
        setFileContent({ name: data.name || path.split('/').pop(), path, content: decoded });
      } else {
        setError(data?.error || 'Failed to load file');
      }
    } catch (e) {
      setError('Failed to load file');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (githubRepo) fetchContents('');
  }, [githubRepo]);

  const linkRepo = async (e) => {
    e.preventDefault();
    setError('');
    const data = await api(`/api/teams/${teamId}/github`, 'POST', { repoUrl });
    if (data?.success) {
      setShowLink(false);
      setRepoUrl('');
      if (onTeamUpdate) onTeamUpdate();
    } else {
      setError(data?.error || 'Failed to link repo');
    }
  };

  const unlinkRepo = async () => {
    setError('');
    const data = await api(`/api/teams/${teamId}/github`, 'DELETE');
    if (data?.success || !data?.error) {
      setContents([]);
      setFileContent(null);
      setCurrentPath('');
      if (onTeamUpdate) onTeamUpdate();
    } else {
      setError(data?.error || 'Failed to unlink repo');
    }
  };

  const navigateBack = () => {
    if (fileContent) { setFileContent(null); return; }
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    fetchContents(parts.join('/'));
  };

  if (!githubRepo) {
    return (
      <div className="text-center py-16">
        <Code2 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No Repository Linked</h3>
        <p className="text-gray-500 text-sm mb-6">Connect a GitHub repository to browse code from here.</p>
        {isLeader ? (
          <>
            {!showLink ? (
              <button onClick={() => setShowLink(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold transition-all hover:from-purple-500 hover:to-blue-500 cursor-pointer">
                <Link className="w-4 h-4 inline mr-2" />Link Repository
              </button>
            ) : (
              <form onSubmit={linkRepo} className="max-w-md mx-auto space-y-3">
                <input type="url" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 font-semibold cursor-pointer">Link</button>
                  <button type="button" onClick={() => setShowLink(false)} className="px-4 bg-white/10 text-gray-300 rounded-xl py-2.5 cursor-pointer">Cancel</button>
                </div>
              </form>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">Ask the team leader to link a repository.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(currentPath || fileContent) && (
            <button onClick={navigateBack} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 transition-all cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Code2 className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">{githubRepo}</span>
          {currentPath && <span className="text-gray-500 text-sm">/ {currentPath}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isLeader && (
            <button onClick={unlinkRepo}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer">
              <Unlink className="w-3.5 h-3.5" /> Unlink
            </button>
          )}
          <a href={`https://github.com/${githubRepo}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-all">
            Open on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : fileContent ? (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-white/5 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-white font-medium">{fileContent.name}</span>
          </div>
          <pre className="p-4 overflow-x-auto text-xs text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto">
            <code>{fileContent.content}</code>
          </pre>
        </div>
      ) : (
        <div className="space-y-1 max-h-[65vh] overflow-y-auto">
          {contents.map((item, i) => (
            <motion.button key={item.name} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              onClick={() => item.type === 'dir' ? fetchContents(item.path) : fetchFile(item.path)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-all group cursor-pointer">
              {item.type === 'dir'
                ? <Folder className="w-4 h-4 text-blue-400" />
                : <FileCode className="w-4 h-4 text-gray-500" />}
              <span className="text-sm text-gray-300 group-hover:text-white">{item.name}</span>
              {item.size > 0 && <span className="text-[10px] text-gray-600 ml-auto">{(item.size / 1024).toFixed(1)} KB</span>}
            </motion.button>
          ))}
          {contents.length === 0 && <p className="text-center text-gray-600 text-sm py-8">Empty directory</p>}
        </div>
      )}
    </div>
  );
}
