import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Link, X, CloudUpload, FileEdit, Upload, AlertCircle } from 'lucide-react';
import { api, apiUpload } from '../lib/api';
import socket from '../lib/socket';
import { Skeleton } from './Skeleton';

const FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
  zip: '📦', rar: '📦', '7z': '📦', mp4: '🎬', mp3: '🎵', txt: '📃', csv: '📊',
  js: '💛', jsx: '💛', ts: '💙', tsx: '💙', py: '🐍', java: '☕', html: '🌐', css: '🎨',
};
function getFileIcon(name) { const ext = name?.split('.').pop()?.toLowerCase(); return FILE_ICONS[ext] || '📎'; }

function splitFileName(name) {
  if (!name) return { base: '', ext: '' };
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) return { base: name, ext: '' };
  return { base: name.substring(0, lastDot), ext: name.substring(lastDot) };
}

export default function FilesPanel({ teamId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [pendingUrl, setPendingUrl] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [fileExt, setFileExt] = useState('');

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importUrlName, setImportUrlName] = useState('');

  const fetchFiles = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/files?teamId=${teamId}`);
    if (data && Array.isArray(data)) setFiles(data);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { 
    setLoading(true);
    fetchFiles(); 
  }, [fetchFiles]);

  useEffect(() => {
    const handleUploaded = (file) => {
      if (file.teamId === teamId) {
        setFiles(prev => {
          if (prev.find(f => f.id === file.id)) return prev;
          return [...prev, file];
        });
      }
    };
    const handleDeleted = (id) => setFiles(prev => prev.filter(f => f.id !== id));
    socket.on('file:uploaded', handleUploaded);
    socket.on('file:deleted', handleDeleted);
    return () => { socket.off('file:uploaded', handleUploaded); socket.off('file:deleted', handleDeleted); };
  }, [teamId]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base, ext } = splitFileName(file.name);
    setPendingFile(file);
    setPendingUrl('');
    setCustomName(base);
    setFileExt(ext);
    setShowRenameModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const { base, ext } = splitFileName(file.name);
    setPendingFile(file);
    setPendingUrl('');
    setCustomName(base);
    setFileExt(ext);
    setShowRenameModal(true);
  };

  const confirmUpload = async () => {
    if (!customName.trim()) return;
    setUploading(true);
    setError('');
    setShowRenameModal(false);
    const finalName = customName.trim().substring(0, 80);
    try {
      if (pendingFile) {
        const formData = new FormData();
        formData.append('teamId', teamId);
        formData.append('customName', finalName);
        formData.append('file', pendingFile);
        const result = await apiUpload('/api/files/upload', formData);
        if (result?.error) setError(result.error);
        else await fetchFiles();
      } else if (pendingUrl) {
        const result = await api('/api/files/import-url', 'POST', {
          url: pendingUrl,
          teamId,
          customName: finalName,
        });
        if (result?.error) setError(result.error);
        else await fetchFiles();
      }
    } catch (e) { setError('Upload failed'); }
    setPendingFile(null);
    setPendingUrl('');
    setCustomName('');
    setFileExt('');
    setUploading(false);
  };

  const cancelUpload = () => {
    setShowRenameModal(false);
    setPendingFile(null);
    setPendingUrl('');
    setCustomName('');
    setFileExt('');
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    const urlPath = importUrl.split('/').pop()?.split('?')[0] || 'imported-file';
    const decoded = decodeURIComponent(urlPath);
    const { base, ext } = splitFileName(decoded);
    setPendingFile(null);
    setPendingUrl(importUrl);
    setCustomName(importUrlName.trim() || base);
    setFileExt(ext);
    setShowUrlModal(false);
    setImportUrl('');
    setImportUrlName('');
    setShowRenameModal(true);
  };

  const downloadFile = async (id) => {
    const data = await api(`/api/files/${id}/download`);
    if (data?.url) window.open(data.url, '_blank');
  };

  const deleteFile = async (id) => {
    await api(`/api/files/${id}`, 'DELETE');
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-10 w-40 rounded-xl" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-2 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span></div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <CloudUpload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-purple-400' : 'text-gray-500'}`} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-400 text-sm font-medium">Uploading...</p>
          </div>
        ) : (
          <>
            <p className="text-gray-300 text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-gray-500 text-xs mt-1">Max 50MB per file • You can rename before upload</p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowUrlModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all cursor-pointer">
          <Link className="w-4 h-4" /> Import from URL
        </button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <AnimatePresence>
          {files.map((file, i) => (
            <motion.div key={file.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: i * 0.02 }}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all">
              <span className="text-2xl">{getFileIcon(file.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{file.name}</p>
                <p className="text-[10px] text-gray-500">{file.size} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ''}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); downloadFile(file.id); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-all cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {files.length === 0 && <p className="text-center text-gray-600 text-sm py-8">No files uploaded yet</p>}
      </div>

      <AnimatePresence>
        {showRenameModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={cancelUpload}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-purple-400" />
                  </div>
                  <div><h3 className="text-lg font-bold text-white">Name Your File</h3><p className="text-xs text-gray-500">Rename before uploading</p></div>
                </div>
                <button onClick={cancelUpload} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-white/5 rounded-xl p-4 mb-4 flex items-center gap-3">
                <span className="text-3xl">{getFileIcon(customName + fileExt)}</span>
                <div className="min-w-0 flex-1"><p className="text-sm text-white font-medium truncate">{customName || 'untitled'}{fileExt}</p>
                <p className="text-[10px] text-gray-500">{pendingFile ? `${(pendingFile.size / 1024).toFixed(1)} KB • from device` : 'from URL'}</p></div>
              </div>
              <div className="mb-5">
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">File Name</label>
                <div className="flex items-center gap-0">
                  <input type="text" value={customName} onChange={e => setCustomName(e.target.value.substring(0, 80))} onKeyDown={e => e.key === 'Enter' && confirmUpload()}
                    placeholder="Enter file name" autoFocus maxLength={80}
                    className="flex-1 bg-white/5 border border-white/10 rounded-l-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                  <div className="bg-white/10 border border-white/10 border-l-0 rounded-r-xl py-3 px-3 text-gray-400 text-sm font-mono select-none">{fileExt || '.*'}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={cancelUpload} className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition-all cursor-pointer">Cancel</button>
                <button onClick={confirmUpload} disabled={!customName.trim() || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer">
                  <Upload className="w-4 h-4" />{uploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUrlModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUrlModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Import from URL</h3>
                <button onClick={() => setShowUrlModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <input type="url" placeholder="https://example.com/file.pdf" value={importUrl} onChange={e => setImportUrl(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-3 font-semibold transition-all cursor-pointer hover:from-purple-500 hover:to-blue-500">Next: Name File →</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
