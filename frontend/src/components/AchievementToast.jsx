import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../lib/socket';

export default function AchievementToast({ currentUserId }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAchievement = (data) => {
      // Only show toast if it's for the current user
      if (data.userId !== currentUserId) return;

      const id = Date.now();
      setToasts(prev => [...prev, { id, ...data.achievement }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    const handleLevelUp = (data) => {
      if (data.userId !== currentUserId) return;

      const id = Date.now() + 1;
      setToasts(prev => [...prev, {
        id,
        title: `Level ${data.level}!`,
        description: 'You leveled up! Keep grinding.',
        icon: '⬆️',
        xpReward: 0,
        isLevelUp: true
      }]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    };

    socket.on('achievement:unlocked', handleAchievement);
    socket.on('level:up', handleLevelUp);

    return () => {
      socket.off('achievement:unlocked', handleAchievement);
      socket.off('level:up', handleLevelUp);
    };
  }, [currentUserId]);

  const dismiss = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto cursor-pointer"
          >
            <div className={`relative overflow-hidden rounded-2xl border p-4 pr-6 min-w-[320px] max-w-[400px] shadow-2xl backdrop-blur-xl ${
              toast.isLevelUp
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 shadow-yellow-500/20'
                : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 shadow-purple-500/20'
            }`}>
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />

              <div className="relative flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2, damping: 10 }}
                  className="text-3xl flex-shrink-0"
                >
                  {toast.icon}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${
                    toast.isLevelUp ? 'text-yellow-400' : 'text-purple-400'
                  }`}>
                    {toast.isLevelUp ? '🎉 Level Up!' : '🏆 Achievement Unlocked!'}
                  </p>
                  <p className="text-white font-semibold text-sm truncate">{toast.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{toast.description}</p>
                  {toast.xpReward > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-emerald-400 text-xs font-bold mt-1"
                    >
                      +{toast.xpReward} XP
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Progress bar countdown */}
              <motion.div
                className={`absolute bottom-0 left-0 h-0.5 ${toast.isLevelUp ? 'bg-yellow-500' : 'bg-purple-500'}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
