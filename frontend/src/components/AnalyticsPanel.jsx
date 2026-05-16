import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, CheckCircle, Clock, AlertTriangle, Users, TrendingUp, Zap } from 'lucide-react';
import { api } from '../lib/api';

import { Skeleton } from './Skeleton';

export default function AnalyticsPanel({ teamId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId) return;
      setLoading(true);
      const data = await api(`/api/analytics?teamId=${teamId}`);
      if (data) setStats(data);
      setLoading(false);
    };
    fetchData();
  }, [teamId]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
  if (!stats) return <p className="text-center text-gray-500 py-8">No analytics data</p>;

  const missedRate = stats.total > 0 ? Math.round(((stats.total - stats.done - stats.inProgress - stats.planned) / stats.total) * 100) : 0;
  const efficiencyScore = stats.total > 0 ? Math.min(100, Math.round((stats.done / Math.max(1, stats.total)) * 100 + (stats.completionRate > 50 ? 10 : 0))) : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BarChart3, gradient: 'from-purple-500/20 to-blue-500/20', text: 'text-purple-400' },
          { label: 'Completed', value: stats.done, icon: CheckCircle, gradient: 'from-green-500/20 to-emerald-500/20', text: 'text-green-400' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, gradient: 'from-yellow-500/20 to-amber-500/20', text: 'text-yellow-400' },
          { label: 'Planned', value: stats.planned, icon: TrendingUp, gradient: 'from-blue-500/20 to-cyan-500/20', text: 'text-blue-400' },
          { label: 'Efficiency', value: `${efficiencyScore}%`, icon: Zap, gradient: 'from-orange-500/20 to-red-500/20', text: 'text-orange-400' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 bg-gradient-to-br ${card.gradient} border border-white/5 relative overflow-hidden`}>
            <card.icon className={`w-5 h-5 ${card.text} mb-2`} />
            <p className="text-2xl font-black text-white">{card.value}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Completion & Missed Rate Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-300 font-medium">Completion Rate</span>
            <span className="text-green-400 font-bold">{stats.completionRate}%</span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.completionRate}%` }}
              transition={{ type: 'spring', damping: 15, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
          </div>
          <p className="text-[10px] text-gray-500 mt-2">{stats.done} of {stats.total} tasks completed</p>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-300 font-medium">Missed vs Completed</span>
            <span className="text-red-400 font-bold">{missedRate}% missed</span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.completionRate}%` }}
              transition={{ delay: 0.3 }} className="h-full bg-green-500" />
            <motion.div initial={{ width: 0 }} animate={{ width: `${missedRate}%` }}
              transition={{ delay: 0.4 }} className="h-full bg-red-500" />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Missed</span>
          </div>
        </div>
      </div>

      {/* Member Workload */}
      {stats.memberWorkload && stats.memberWorkload.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" /> Member Workload
          </h4>
          <div className="space-y-4">
            {stats.memberWorkload.map((member, i) => {
              const completionPct = member.tasks > 0 ? Math.round((member.done / member.tasks) * 100) : 0;
              const isOverloaded = member.tasks > 5 && completionPct < 30;
              const isUnderutilized = member.tasks < 2;
              return (
                <motion.div key={member.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {member.avatar || member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white font-medium truncate">{member.name}</span>
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{member.done}/{member.tasks}</span>
                          {isOverloaded && <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Overloaded</span>}
                          {isUnderutilized && member.tasks < 2 && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">Available</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-11 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ type: 'spring', damping: 15, delay: 0.3 + i * 0.05 }}
                      className={`h-full rounded-full ${
                        completionPct >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                        completionPct >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                        'bg-gradient-to-r from-red-500 to-orange-400'
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
