import React, { useState, useEffect } from 'react';
import { Star, Trophy } from 'lucide-react';
import socket from '../lib/socket';

export default function XpNotification({ currentUserId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleXp = (data) => {
      if (data.userId !== currentUserId) return;
      const id = Date.now();
      setNotifications(prev => [...prev, { id, type: 'xp', msg: `+${data.gained} XP`, sub: data.reason }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
    };

    const handleLevel = (data) => {
      if (data.userId !== currentUserId) return;
      const id = Date.now() + 1;
      setNotifications(prev => [...prev, { id, type: 'level', msg: `LEVEL UP!`, sub: `You reached Level ${data.level}` }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
    };

    socket.on('xp:updated', handleXp);
    socket.on('level:up', handleLevel);
    return () => {
      socket.off('xp:updated', handleXp);
      socket.off('level:up', handleLevel);
    };
  }, [currentUserId]);

  return (
    <div className="fixed bottom-24 right-6 flex flex-col space-y-3 z-[200]">
      {notifications.map(n => (
        <div key={n.id} className={`${n.type === 'xp' ? 'bg-green-600' : 'bg-purple-600'} text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/20 animate-in slide-in-from-right duration-300`}>
          <div className="bg-white/20 p-2 rounded-xl">
            {n.type === 'xp' ? <Star size={18} fill="currentColor" /> : <Trophy size={18} />}
          </div>
          <div>
            <div className="font-black text-sm">{n.msg}</div>
            <div className="text-[10px] opacity-80">{n.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
