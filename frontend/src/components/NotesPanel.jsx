import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save, Trash2, FileText } from 'lucide-react';
import { api } from '../lib/api';
import socket from '../lib/socket';

export default function NotesPanel({ teamId }) {
  const [notes, setNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  const fetchNotes = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/notes?teamId=${teamId}`);
    if (data && Array.isArray(data)) {
      const filtered = data.filter(n => !n.title?.startsWith('📊 Diagram:'));
      setNotes(filtered);
      if (!activeNote && filtered.length > 0) setActiveNote(filtered[0]);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    const handleCreated = (note) => { if (note.teamId === teamId) setNotes(prev => [...prev, note]); };
    const handleUpdated = (note) => {
      if (note.teamId === teamId) {
        setNotes(prev => prev.map(n => n.id === note.id ? note : n));
        if (activeNote?.id === note.id) setActiveNote(note);
      }
    };
    const handleDeleted = (id) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNote?.id === id) setActiveNote(null);
    };
    socket.on('note:created', handleCreated);
    socket.on('note:updated', handleUpdated);
    socket.on('note:deleted', handleDeleted);
    return () => { socket.off('note:created', handleCreated); socket.off('note:updated', handleUpdated); socket.off('note:deleted', handleDeleted); };
  }, [teamId, activeNote]);

  const createNote = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const data = await api('/api/notes', 'POST', { title: newTitle, content: '', teamId });
    if (data && data.id) { setActiveNote(data); setShowCreate(false); setNewTitle(''); }
  };

  const updateNote = (field, value) => {
    const updated = { ...activeNote, [field]: value };
    setActiveNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));

    // Auto-save after 500ms of no typing
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api(`/api/notes/${updated.id}`, 'PUT', { [field]: value });
    }, 500);
  };

  const deleteNote = async (id) => {
    await api(`/api/notes/${id}`, 'DELETE');
    setActiveNote(null);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
      {/* Notes sidebar */}
      <div className="w-64 flex-shrink-0 space-y-2 overflow-y-auto pr-2">
        <button onClick={() => setShowCreate(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> New Note
        </button>
        <AnimatePresence>
          {notes.map(note => (
            <motion.button key={note.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              onClick={() => setActiveNote(note)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                activeNote?.id === note.id
                  ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                  : 'bg-white/[0.03] border border-white/5 text-gray-300 hover:bg-white/[0.06]'
              }`}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 flex-shrink-0 text-gray-500" />
                <p className="text-sm font-medium truncate">{note.title}</p>
              </div>
              {note.updatedAt && <p className="text-[10px] text-gray-500 mt-1 ml-6">{new Date(note.updatedAt).toLocaleDateString()}</p>}
            </motion.button>
          ))}
        </AnimatePresence>
        {notes.length === 0 && <p className="text-center text-gray-600 text-xs py-4">No notes yet</p>}
      </div>

      {/* Note editor */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
        {activeNote ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <input type="text" value={activeNote.title} onChange={e => updateNote('title', e.target.value)}
                className="bg-transparent text-white font-semibold text-lg focus:outline-none flex-1 mr-4" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Auto-saved</span>
                <button onClick={() => deleteNote(activeNote.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <textarea
              value={activeNote.content || ''}
              onChange={e => updateNote('content', e.target.value)}
              placeholder="Start typing your note..."
              className="flex-1 p-4 bg-transparent text-gray-300 focus:outline-none resize-none text-sm leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
            Select a note or create a new one
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">New Note</h3>
              <form onSubmit={createNote} className="space-y-4">
                <input type="text" placeholder="Note title" value={newTitle} onChange={e => setNewTitle(e.target.value)} required autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-3 font-semibold transition-all">
                  Create Note
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
