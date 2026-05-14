import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { api } from '../lib/api';

export default function QuickAddTask({ teamId, userId, onAdded }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    let deadlineISO = null;
    if (deadline) {
      const [dPart, tPart] = deadline.split('T');
      const [y, m, day] = dPart.split('-').map(Number);
      const [hh, mm] = tPart.split(':').map(Number);
      deadlineISO = new Date(y, m - 1, day, hh, mm).toISOString();
    }
    await api('/api/tasks', 'POST', {
      title: title.trim(),
      teamId,
      assigneeId: userId,
      deadline: deadlineISO,
    });
    setTitle('');
    setDeadline('');
    setOpen(false);
    setLoading(false);
    if (onAdded) onAdded();
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl shadow-purple-500/30 flex items-center justify-center z-40 hover:shadow-purple-500/50 transition-shadow"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50 p-4 sm:items-center" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="glass-panel rounded-3xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <form onSubmit={submit} className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white">Quick Add Task</h4>
                  <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} required autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
                <div className="space-y-1">
                  <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]" />
                  {deadline && (
                    <p className="text-[9px] text-purple-400 px-1 font-medium">
                      ⏰ {new Date(deadline.replace('T', ' ')).getTime() < Date.now() ? 'Overdue' : 'Setting for'}: {
                        (() => {
                          const ms = new Date(deadline.replace('T', ' ')).getTime() - Date.now();
                          if (ms < 0) return 'Passed';
                          const h = Math.floor(ms / 3600000);
                          const m = Math.floor((ms % 3600000) / 60000);
                          return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()
                      } from now
                    </p>
                  )}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-all">
                  {loading ? 'Adding...' : 'Add Task'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
