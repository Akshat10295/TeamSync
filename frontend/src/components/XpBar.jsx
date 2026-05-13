import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import socket from '../lib/socket';

export default function XpBar({ currentUserId }) {
  const [xpData, setXpData] = useState(null);
  const [flash, setFlash] = useState(false);

  const fetchXP = async () => {
    const data = await api('/api/xp');
    if (data) setXpData(data);
  };

  useEffect(() => {
    fetchXP();

    const handleXpUpdate = (data) => {
      if (data.userId !== currentUserId) return;
      setXpData(prev => ({
        ...prev,
        xp: data.xp,
        level: data.level,
        xpInCurrentLevel: data.xp - ((data.level - 1) * 200),
        progress: Math.min(Math.round(((data.xp - ((data.level - 1) * 200)) / 200) * 100), 100)
      }));
      // Flash effect on XP gain
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    };

    socket.on('xp:updated', handleXpUpdate);
    return () => socket.off('xp:updated', handleXpUpdate);
  }, [currentUserId]);

  if (!xpData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3"
    >
      {/* Level Badge */}
      <motion.div
        animate={flash ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative flex items-center justify-center"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-400/20">
          <span className="text-white text-xs font-black">{xpData.level}</span>
        </div>
        <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-400" />
      </motion.div>

      {/* XP Bar */}
      <div className="hidden md:flex flex-col gap-1 min-w-[120px]">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Level {xpData.level}
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            {xpData.xpInCurrentLevel}/{xpData.xpForNextLevel} XP
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpData.progress}%` }}
            transition={{ type: 'spring', damping: 15 }}
          />
        </div>
      </div>

      {/* Total XP Badge */}
      <motion.div
        animate={flash ? { scale: [1, 1.15, 1] } : {}}
        className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
      >
        <span className="text-emerald-400 text-xs font-bold">{xpData.xp} XP</span>
      </motion.div>
    </motion.div>
  );
}
