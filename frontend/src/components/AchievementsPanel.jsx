import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { api } from '../lib/api';

export default function AchievementsPanel() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      const data = await api('/api/achievements');
      if (data) setAchievements(data);
      setLoading(false);
    };
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold text-lg">
            {unlocked.length}
            <span className="text-gray-400 font-normal text-sm"> / {achievements.length}</span>
          </span>
        </div>
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${achievements.length ? (unlocked.length / achievements.length) * 100 : 0}%` }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
          />
        </div>
      </div>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Unlocked</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlocked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all"
              >
                {/* Glow */}
                <div className="absolute inset-0 rounded-2xl bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative flex items-start gap-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{a.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{a.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-emerald-400 text-xs font-bold">+{a.xpReward} XP</span>
                      {a.unlockedAt && (
                        <span className="text-gray-500 text-[10px]">
                          {new Date(a.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Locked</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <span className="text-2xl grayscale">{a.icon}</span>
                    <Lock className="absolute -bottom-1 -right-1 w-3 h-3 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 font-semibold text-sm truncate">{a.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{a.description}</p>
                    <span className="text-gray-500 text-xs font-medium mt-1 inline-block">+{a.xpReward} XP</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
