import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { api } from '../lib/api';

export default function UserProfile({ userId, currentUserId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    api(`/api/user-profile/${userId}`).then(data => {
      if (data && data.id) {
        setProfile(data);
        setEditName(data.name || '');
        setEditAvatar(data.avatar || '');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!editName.trim()) {
      setEditError("Name cannot be empty");
      return;
    }
    if (editAvatar.length > 2) {
      setEditError("Avatar must be maximum 2 characters");
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const updated = await api('/api/user-profile', 'PUT', {
        name: editName,
        avatar: editAvatar
      });

      if (updated && !updated.error) {
        setProfile(prev => ({
          ...prev,
          name: updated.name,
          avatar: updated.avatar
        }));
        setIsEditing(false);
        // Reload page to reflect user profile changes globally across the UI
        window.location.reload();
      } else {
        setEditError(updated?.error || 'Failed to update profile');
      }
    } catch (err) {
      setEditError('Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="glass-panel rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-white">Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Avatar + Info */}
            {isEditing ? (
              <div className="space-y-4 w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div className="flex gap-4 items-center">
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Avatar (Initials)</label>
                    <input 
                      type="text" 
                      maxLength="2" 
                      value={editAvatar} 
                      onChange={(e) => setEditAvatar(e.target.value.toUpperCase())}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Full Name</label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm font-sans"
                    />
                  </div>
                </div>
                
                {editError && <p className="text-red-400 text-xs font-sans">{editError}</p>}
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(profile.name || '');
                      setEditAvatar(profile.avatar || '');
                      setEditError(null);
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-xl py-2 cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={editLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-500 text-white text-xs rounded-xl py-2 disabled:opacity-50 cursor-pointer font-sans font-bold"
                  >
                    {editLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 w-full justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-500/20">
                    {profile.avatar || profile.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">{profile.name}</h4>
                    <p className="text-sm text-gray-400">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Level {profile.level}</span>
                      <span className="text-xs text-gray-500">{profile.xp} XP</span>
                    </div>
                  </div>
                </div>
                {userId === currentUserId && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="bg-white/5 hover:bg-white/10 text-xs text-purple-400 hover:text-purple-300 border border-white/10 rounded-xl px-3 py-1.5 cursor-pointer font-sans transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 font-sans">
              <div className="glass-panel rounded-xl p-3">
                <Calendar className="w-4 h-4 text-purple-400 mb-1" />
                <p className="text-xl font-black text-white">{profile.stats.total}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Tasks</p>
              </div>
              <div className="glass-panel rounded-xl p-3">
                <CheckCircle className="w-4 h-4 text-green-400 mb-1" />
                <p className="text-xl font-black text-white">{profile.stats.completed}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Completed</p>
              </div>
              <div className="glass-panel rounded-xl p-3">
                <Clock className="w-4 h-4 text-blue-400 mb-1" />
                <p className="text-xl font-black text-white">{profile.stats.active}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active</p>
              </div>
              <div className="glass-panel rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 mb-1" />
                <p className="text-xl font-black text-white">{profile.stats.missed}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Missed</p>
              </div>
            </div>

            {/* Completion Rate */}
            {profile.stats.total > 0 && (
              <div className="font-sans">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Completion Rate</span>
                  <span>{Math.round((profile.stats.completed / profile.stats.total) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(profile.stats.completed / profile.stats.total) * 100}%` }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {profile.recentActivity?.length > 0 && (
              <div className="font-sans">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Activity</h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {profile.recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 truncate flex-1">{a.title}</span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(a.completedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Joined */}
            <p className="text-[10px] text-gray-600 text-center font-sans">Joined {new Date(profile.joinedAt).toLocaleDateString()}</p>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8 font-sans">User not found</p>
        )}
      </motion.div>
    </motion.div>
  );
}
