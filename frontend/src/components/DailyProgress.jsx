import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, CheckCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';

export default function DailyProgress() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/api/daily-progress').then(d => { if (d) setData(d); });
  }, []);

  if (!data) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4">
      {/* Streak */}
      {data.streak > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full">
          <Flame className="w-3.5 h-3.5" />
          <span>{data.streak}d streak</span>
        </div>
      )}

      {/* Today's progress */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        <span>{data.completedToday} done today</span>
      </div>

      {/* Work time */}
      {data.totalWorkMinutes > 0 && (
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{Math.floor(data.totalWorkMinutes / 60)}h {data.totalWorkMinutes % 60}m total</span>
        </div>
      )}
    </motion.div>
  );
}
