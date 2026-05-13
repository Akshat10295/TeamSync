import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Copy, Check, LogIn, ChevronDown, Crown, User, X } from 'lucide-react';
import { api } from '../lib/api';

export default function TeamManager({ currentTeam, onTeamChange, session }) {
  const [teams, setTeams] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTeams = async () => {
    const data = await api('/api/teams');
    if (data && Array.isArray(data)) {
      setTeams(data);
      if (!currentTeam && data.length > 0) {
        onTeamChange(data[0]);
      }
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    setError('');
    const data = await api('/api/teams', 'POST', { name: teamName, description: teamDesc });
    if (data && data.id) {
      setTeams(prev => [...prev, data]);
      onTeamChange(data);
      setShowCreateModal(false);
      setTeamName('');
      setTeamDesc('');
    } else {
      setError(data?.error || 'Failed to create team');
    }
    setLoading(false);
  };

  const joinTeam = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    const data = await api('/api/teams/join', 'POST', { code: joinCode.toUpperCase() });
    if (data && data.id) {
      await fetchTeams();
      onTeamChange(data);
      setShowJoinModal(false);
      setJoinCode('');
    } else {
      setError(data?.error || 'Invalid invite code');
    }
    setLoading(false);
  };

  const copyInvite = () => {
    if (currentTeam?.inviteCode) {
      navigator.clipboard.writeText(currentTeam.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Team Selector */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {currentTeam?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{currentTeam?.name || 'Select Team'}</p>
              {currentTeam && (
                <p className="text-gray-500 text-[10px] font-mono">{currentTeam.inviteCode}</p>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-2xl overflow-hidden z-50 shadow-xl"
            >
              <div className="max-h-48 overflow-y-auto p-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { onTeamChange(team); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                      currentTeam?.id === team.id ? 'bg-purple-500/20 text-white' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 flex items-center justify-center text-white text-xs font-bold">
                      {team.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium truncate">{team.name}</span>
                    {team.ownerId === session?.user?.id && <Crown className="w-3 h-3 text-yellow-400 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="border-t border-white/5 p-2 flex gap-2">
                <button onClick={() => { setShowCreateModal(true); setShowDropdown(false); }}
                  className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-purple-400 hover:bg-purple-500/10 text-xs font-medium transition-all">
                  <Plus className="w-3.5 h-3.5" /> Create
                </button>
                <button onClick={() => { setShowJoinModal(true); setShowDropdown(false); }}
                  className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-blue-400 hover:bg-blue-500/10 text-xs font-medium transition-all">
                  <LogIn className="w-3.5 h-3.5" /> Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite Code Copy (when team selected) */}
      {currentTeam && (
        <button onClick={copyInvite}
          className="mt-2 w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : `Invite: ${currentTeam.inviteCode}`}
        </button>
      )}

      {/* No teams prompt */}
      {teams.length === 0 && (
        <div className="mt-4 text-center">
          <p className="text-gray-500 text-xs mb-3">No teams yet</p>
          <div className="flex gap-2">
            <button onClick={() => setShowCreateModal(true)}
              className="flex-1 p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all">
              Create Team
            </button>
            <button onClick={() => setShowJoinModal(true)}
              className="flex-1 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
              Join Team
            </button>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Create Team</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={createTeam} className="space-y-4">
                <input type="text" placeholder="Team name" value={teamName} onChange={e => setTeamName(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <textarea placeholder="Description (optional)" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl py-3 font-semibold shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all">
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Team Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowJoinModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Join Team</h3>
                <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={joinTeam} className="space-y-4">
                <input type="text" placeholder="Enter invite code" value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())} required maxLength={10}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center text-lg tracking-widest uppercase" />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3 font-semibold shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all">
                  {loading ? 'Joining...' : 'Join Team'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
