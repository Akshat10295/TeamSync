import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { api } from '../lib/api';
import socket from '../lib/socket';

export default function NotificationsDropdown({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    const data = await api('/api/notifications');
    if (data && Array.isArray(data)) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    const handleNew = () => fetchNotifications();
    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    await api(`/api/notifications/${id}/read`, 'PUT');
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await api('/api/notifications/read-all', 'PUT');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute right-0 top-12 w-80 max-h-96 glass-panel rounded-2xl overflow-hidden z-50 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h4 className="text-sm font-bold text-white">Notifications</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300">
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto max-h-72">
                {notifications.length === 0 ? (
                  <p className="text-center text-gray-600 text-xs py-8">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <button key={n.id} onClick={() => !n.read && markRead(n.id)}
                      className={`w-full text-left p-4 border-b border-white/[0.03] hover:bg-white/5 transition-all ${!n.read ? 'bg-purple-500/5' : ''}`}>
                      <div className="flex gap-3">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${!n.read ? 'text-gray-200' : 'text-gray-400'}`}>{n.message}</p>
                          <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
