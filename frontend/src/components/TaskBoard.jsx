import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Play, Square, CheckCircle, Trash2, Calendar, Timer, MoreVertical, AlertTriangle, Zap, ChevronDown, Star } from 'lucide-react';
import { api } from '../lib/api';
import socket from '../lib/socket';

// Urgency helpers
function getUrgency(deadline) {
  if (!deadline) return { level: 'none', label: '', color: '' };
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms < 0) return { level: 'missed', label: 'MISSED', color: 'red' };
  if (ms < 4 * 3600000) return { level: 'critical', label: 'Critical', color: 'red' };
  if (ms < 24 * 3600000) return { level: 'warning', label: 'Warning', color: 'yellow' };
  return { level: 'safe', label: 'Safe', color: 'green' };
}

function formatCountdown(deadline) {
  if (!deadline) return '';
  // Only replace T with space for local input strings (no Z or + indicator)
  // This prevents breaking perfect ISO strings from the API
  let dateStr = deadline;
  if (typeof deadline === 'string' && deadline.includes('T') && !deadline.includes('Z') && !deadline.includes('+')) {
    dateStr = deadline.replace('T', ' ');
  }
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms < 0) return 'Overdue';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const URGENCY_BORDER = {
  missed: 'border-red-500/50 shadow-red-500/10 shadow-lg',
  critical: 'border-red-400/40 shadow-red-400/5 shadow-md',
  warning: 'border-yellow-400/30',
  safe: 'border-emerald-400/20',
  none: 'border-white/5',
};

const URGENCY_BADGE = {
  missed: 'bg-red-500/20 text-red-400',
  critical: 'bg-red-500/15 text-red-400',
  warning: 'bg-yellow-500/15 text-yellow-400',
  safe: 'bg-emerald-500/15 text-emerald-400',
  none: 'bg-white/5 text-gray-500',
};

const STATUS_COLS = [
  { key: 'planned', label: 'Planned', icon: '📋', accent: 'blue' },
  { key: 'in progress', label: 'In Progress', icon: '⚡', accent: 'yellow' },
  { key: 'done', label: 'Done', icon: '✅', accent: 'green' },
  { key: 'missed', label: 'Missed', icon: '⏰', accent: 'red' },
];

// Custom assignee dropdown — currentUserId filters out the logged-in user from the list
function AssigneeSelect({ members, value, onChange, currentUserId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const currentUser = members.find(m => m.id === currentUserId);
  const otherMembers = members.filter(m => m.id !== currentUserId);
  const selected = members.find(m => m.id === value);
  const isSelf = !value || value === currentUserId;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-left hover:bg-white/8 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer">
        <div className="flex items-center gap-2">
          {isSelf ? (
            <>
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{currentUser?.avatar || currentUser?.name?.charAt(0) || '?'}</span>
              <span className="text-white">Myself</span>
            </>
          ) : selected ? (
            <>
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{selected.avatar || selected.name?.charAt(0)}</span>
              <span className="text-white">{selected.name}</span>
            </>
          ) : (
            <span className="text-gray-400">Select assignee</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto"
            style={{ background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Assign to Myself — always first */}
            <button type="button" onClick={() => { onChange(currentUserId || ''); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-all cursor-pointer ${isSelf ? 'bg-purple-500/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{currentUser?.avatar || currentUser?.name?.charAt(0) || '?'}</span>
              Assign to Myself
            </button>
            {/* Other team members */}
            {otherMembers.map(m => (
              <button type="button" key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-all cursor-pointer ${value === m.id ? 'bg-purple-500/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{m.avatar || m.name?.charAt(0)}</span>
                {m.name}
                {m.role === 'leader' && <span className="ml-auto text-[9px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">Owner</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, members, onUpdate, onDelete, onTimer, onFocus, isNextBest }) {
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState('');
  const assignee = members.find(m => m.id === task.assigneeId);
  const urgency = getUrgency(task.deadline);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!task.deadline || task.status === 'done') return;
    const tick = () => setCountdown(formatCountdown(task.deadline));
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [task.deadline, task.status]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const workTime = () => {
    if (!task.timerRunning) return task.actualTime ? `${task.actualTime}m` : null;
    const elapsed = task.timerStart ? Math.floor((Date.now() - new Date(task.timerStart).getTime()) / 60000) : 0;
    return `${(task.actualTime || 0) + elapsed}m`;
  };

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onFocus && onFocus(task)}
      className={`group relative p-4 rounded-2xl bg-white/[0.03] border transition-all hover:bg-white/[0.06] cursor-pointer active:scale-[0.98] ${URGENCY_BORDER[urgency.level]} ${isNextBest ? 'ring-2 ring-purple-500/40' : ''}`}
    >
      {isNextBest && (
        <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3" /> NEXT
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-white pr-6 leading-tight">{task.title}</h4>
        <div ref={menuRef} className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all p-0.5 cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-6 rounded-xl p-1.5 z-20 min-w-[150px] shadow-xl"
                style={{ background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)' }}>
                {task.status !== 'done' && (
                  <>
                    {(task.status === 'planned' || task.status === 'missed') && (
                      <button onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'in progress' }); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-all cursor-pointer">▶ Start</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'done' }); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-green-400 hover:bg-green-500/10 transition-all cursor-pointer">✅ Mark Done</button>
                  </>
                )}
                <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">🗑 Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{task.description}</p>}
      <div className="flex items-center gap-1.5 flex-wrap">
        {assignee && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[8px] text-white font-bold">{assignee.avatar || assignee.name?.charAt(0)}</span>
            {assignee.name?.split(' ')[0]}
          </span>
        )}
        {countdown && task.status !== 'done' && (
          <span className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 font-medium ${URGENCY_BADGE[urgency.level]}`}>
            {urgency.level === 'critical' || urgency.level === 'missed' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {countdown}
          </span>
        )}
        {task.deadline && task.status === 'done' && (
          <span className="text-[10px] px-2 py-1 rounded-full text-gray-500 bg-white/5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />{new Date(task.deadline).toLocaleDateString()}
          </span>
        )}
        {workTime() && (
          <span className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${task.timerRunning ? 'text-green-400 bg-green-500/10 animate-pulse font-bold' : 'text-gray-500 bg-white/5'}`}>
            <Timer className="w-3 h-3" /> Worked: {workTime()}
          </span>
        )}
      </div>
      {task.status !== 'done' && (
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
          {!task.timerRunning ? (
            <button onClick={() => onTimer(task.id, 'start')}
              className="flex items-center gap-1 text-[10px] text-green-400 hover:bg-green-500/10 px-2 py-1 rounded-lg transition-all cursor-pointer">
              <Play className="w-3 h-3" /> Start
            </button>
          ) : (
            <>
              <button onClick={() => onTimer(task.id, 'stop')}
                className="flex items-center gap-1 text-[10px] text-yellow-400 hover:bg-yellow-500/10 px-2 py-1 rounded-lg transition-all cursor-pointer">
                <Square className="w-3 h-3" /> Pause
              </button>
              <button onClick={() => onTimer(task.id, 'complete')}
                className="flex items-center gap-1 text-[10px] text-green-400 hover:bg-green-500/10 px-2 py-1 rounded-lg transition-all cursor-pointer">
                <CheckCircle className="w-3 h-3" /> Done
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function TaskBoard({ teamId, session, onFocus }) {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigneeId: '', deadline: '' });
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/tasks?teamId=${teamId}`);
    if (data && Array.isArray(data)) setTasks(data);
    setLoading(false);
  }, [teamId]);

  const fetchMembers = useCallback(async () => {
    if (!teamId) return;
    const data = await api(`/api/teams/${teamId}/members`);
    if (data && Array.isArray(data)) {
      const seen = new Set();
      setMembers(data.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }));
    }
  }, [teamId]);

  useEffect(() => { fetchTasks(); fetchMembers(); }, [fetchTasks, fetchMembers]);

  useEffect(() => {
    const handleCreated = (task) => { if (task.teamId === teamId) setTasks(prev => [task, ...prev]); };
    const handleUpdated = (task) => { if (task.teamId === teamId) setTasks(prev => prev.map(t => t.id === task.id ? task : t)); };
    const handleDeleted = (id) => setTasks(prev => prev.filter(t => t.id !== id));
    socket.on('task:created', handleCreated);
    socket.on('task:updated', handleUpdated);
    socket.on('task:deleted', handleDeleted);
    return () => { socket.off('task:created', handleCreated); socket.off('task:updated', handleUpdated); socket.off('task:deleted', handleDeleted); };
  }, [teamId]);

  const createTask = async (e) => {
    e.preventDefault();
    // Convert datetime-local to proper ISO string with timezone
    let deadlineISO = null;
    if (newTask.deadline) {
      const [dPart, tPart] = newTask.deadline.split('T');
      const [y, m, day] = dPart.split('-').map(Number);
      const [hh, mm] = tPart.split(':').map(Number);
      deadlineISO = new Date(y, m - 1, day, hh, mm).toISOString();
    }
    await api('/api/tasks', 'POST', {
      title: newTask.title,
      description: newTask.description,
      teamId,
      assigneeId: newTask.assigneeId || session?.user?.id,
      deadline: deadlineISO,
    });
    setNewTask({ title: '', description: '', assigneeId: '', deadline: '' });
    setShowCreate(false);
  };

  const updateTask = async (id, updates) => { await api(`/api/tasks/${id}`, 'PUT', updates); };
  const deleteTask = async (id) => { await api(`/api/tasks/${id}`, 'DELETE'); setTasks(prev => prev.filter(t => t.id !== id)); };
  const timerAction = async (id, action) => { await api(`/api/tasks/${id}/timer`, 'POST', { action }); };

  // Sort by newest first
  const sorted = [...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Auto-categorize missed tasks — only if deadline is truly past
  const getEffectiveStatus = (t) => {
    if (t.status === 'done') return 'done';
    if (t.deadline) {
      const deadlineMs = new Date(t.deadline).getTime();
      const nowMs = Date.now();
      if (!isNaN(deadlineMs) && deadlineMs < nowMs) return 'missed';
    }
    return t.status;
  };

  // Find next best task
  const activeTasks = sorted.filter(t => getEffectiveStatus(t) !== 'done' && getEffectiveStatus(t) !== 'missed');
  const tasksWithDl = activeTasks.filter(t => t.deadline);
  const nextBestId = tasksWithDl.length > 0
    ? [...tasksWithDl].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0].id
    : activeTasks[0]?.id;

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Task Board</h3>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all shadow-lg shadow-purple-500/20 cursor-pointer">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUS_COLS.map(col => {
          const colTasks = sorted.filter(t => getEffectiveStatus(t) === col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{col.icon}</span>
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{col.label}</h4>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <div className="space-y-3 min-h-[100px] max-h-[60vh] overflow-y-auto pr-1">
                <AnimatePresence>
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} members={members} onUpdate={updateTask} onDelete={deleteTask} onTimer={timerAction} onFocus={onFocus} isNextBest={task.id === nextBestId} />
                  ))}
                </AnimatePresence>
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-white/5 rounded-2xl">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">New Task</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={createTask} className="space-y-4">
                <input type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                <AssigneeSelect members={members} value={newTask.assigneeId} onChange={v => setNewTask({ ...newTask, assigneeId: v })} currentUserId={session?.user?.id} />
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Deadline</label>
                  <input type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]" />
                  {newTask.deadline && (
                    <p className={`text-[10px] mt-1.5 px-1 font-medium ${
                      new Date(newTask.deadline.replace('T', ' ')).getTime() < Date.now() ? 'text-red-400' : 'text-purple-400'
                    }`}>
                      {new Date(newTask.deadline.replace('T', ' ')).getTime() < Date.now() ? '⚠️ Overdue' : '⏰ Timer will be set for'}: {
                        formatCountdown(newTask.deadline.replace('T', ' '))
                      } from now
                    </p>
                  )}
                </div>
                <button type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl py-3 font-semibold shadow-lg shadow-purple-500/25 transition-all cursor-pointer">
                  Create Task
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
