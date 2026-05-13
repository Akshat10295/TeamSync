import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, CheckSquare } from 'lucide-react';
import { api } from '../lib/api';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (!q.trim() || q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    setOpen(true);
    const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
    if (data) setResults(data);
    setLoading(false);
  };

  const close = () => { setOpen(false); setQuery(''); setResults(null); };

  const total = results ? (results.tasks?.length || 0) + (results.notes?.length || 0) : 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all">
        <Search className="w-4 h-4 text-gray-500" />
        <input type="text" value={query} onChange={e => search(e.target.value)} placeholder="Search tasks & notes..."
          className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none w-32 lg:w-48" />
        {query && (
          <button onClick={close} className="text-gray-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="absolute right-0 top-12 w-96 max-h-80 glass-panel rounded-2xl overflow-hidden z-50 shadow-2xl">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : total === 0 ? (
                <p className="text-center text-gray-500 text-xs py-8">No results for "{query}"</p>
              ) : (
                <div className="overflow-y-auto max-h-72">
                  {results.tasks?.length > 0 && (
                    <div>
                      <div className="px-4 py-2 border-b border-white/5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasks ({results.tasks.length})</span>
                      </div>
                      {results.tasks.map(t => (
                        <div key={t.id} className="px-4 py-3 hover:bg-white/5 flex items-center gap-3">
                          <CheckSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{t.title}</p>
                            <p className="text-[10px] text-gray-500">{t.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.notes?.length > 0 && (
                    <div>
                      <div className="px-4 py-2 border-b border-white/5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notes ({results.notes.length})</span>
                      </div>
                      {results.notes.map(n => (
                        <div key={n.id} className="px-4 py-3 hover:bg-white/5 flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{n.title}</p>
                            <p className="text-[10px] text-gray-500 truncate">{n.content?.substring(0, 60)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
