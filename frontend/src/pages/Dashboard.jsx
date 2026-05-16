import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutDashboard, FileText, FolderOpen, Code2, BarChart3, Trophy, Sun, Moon, Focus, PenTool } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeContext';
import socket from '../lib/socket';

// Components
import TeamManager from '../components/TeamManager';
import XpBar from '../components/XpBar';
import AchievementToast from '../components/AchievementToast';
import AchievementsPanel from '../components/AchievementsPanel';
import TaskBoard from '../components/TaskBoard';
import FilesPanel from '../components/FilesPanel';
import NotesPanel from '../components/NotesPanel';
import GitHubPanel from '../components/GitHubPanel';
import NotificationsDropdown from '../components/NotificationsDropdown';
import SearchBar from '../components/SearchBar';
import AnalyticsPanel from '../components/AnalyticsPanel';
import UserProfile from '../components/UserProfile';
import DailyProgress from '../components/DailyProgress';
import QuickAddTask from '../components/QuickAddTask';
import FocusMode from '../components/FocusMode';
import WhiteboardPanel from '../components/WhiteboardPanel';
import { api } from '../lib/api';

export default function DashboardPage({ session }) {
  const [activeTab, setActiveTab] = useState('board');
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [profileUserId, setProfileUserId] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const currentUserId = session?.user?.id;
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    if (!currentTeam) return;
    const fetchMembers = async () => {
      const data = await api(`/api/teams/${currentTeam.id}/members`);
      if (data && Array.isArray(data)) {
        const seen = new Set();
        setMembers(data.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }));
      }
    };
    fetchMembers();
    socket.emit('join:team', { teamId: currentTeam.id, userId: currentUserId });

    const handleOnline = ({ userId }) => setOnlineUsers(prev => [...new Set([...prev, userId])]);
    const handleOffline = ({ userId }) => setOnlineUsers(prev => prev.filter(id => id !== userId));
    const handleOnlineList = (list) => setOnlineUsers(list);

    socket.on('team:member_online', handleOnline);
    socket.on('team:member_offline', handleOffline);
    socket.on('team:online_list', handleOnlineList);

    return () => {
      socket.off('team:member_online', handleOnline);
      socket.off('team:member_offline', handleOffline);
      socket.off('team:online_list', handleOnlineList);
    };
  }, [currentTeam, currentUserId]);

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const isLeader = currentTeam && String(currentTeam.ownerId) === String(currentUserId);
  console.log('[Dashboard] Role Check:', { isLeader, teamOwner: currentTeam?.ownerId, currentUser: currentUserId });

  // Focus Mode — find the best task and open overlay
  const openFocusMode = useCallback(async () => {
    if (!currentTeam) return;
    try {
      const tasks = await api(`/api/tasks?teamId=${currentTeam.id}`);
      if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        alert('No tasks available. Create a task first!');
        return;
      }
      
      // 1. Prioritize task that is ALREADY running (last working task)
      const running = tasks.find(t => t.timerRunning);
      if (running) {
        setFocusTask(running);
        setFocusOpen(true);
        return;
      }

      // 2. Prioritize my active tasks with deadlines
      const myActive = tasks.filter(t => t.status !== 'done' && t.assigneeId === currentUserId);
      if (myActive.length > 0) {
        const withDl = myActive.filter(t => t.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        setFocusTask(withDl[0] || myActive[0]);
      } else {
        // 3. Fallback: any active task with deadline
        const anyActive = tasks.filter(t => t.status !== 'done');
        if (anyActive.length === 0) { alert('All tasks are done!'); return; }
        const withDl = anyActive.filter(t => t.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        setFocusTask(withDl[0] || anyActive[0]);
      }
      setFocusOpen(true);
    } catch (e) {
      console.error('Focus mode error:', e);
    }
  }, [currentTeam, currentUserId]);

  const handleOpenFocus = (task) => {
    setFocusTask(task);
    setFocusOpen(true);
  };

  // Auto-open if a task is already running on load
  useEffect(() => {
    if (currentTeam && !focusOpen) {
      api(`/api/tasks?teamId=${currentTeam.id}`).then(tasks => {
        if (tasks && Array.isArray(tasks)) {
          const running = tasks.find(t => t.timerRunning);
          if (running) {
            setFocusTask(running);
            setFocusOpen(true);
          }
        }
      });
    }
  }, [currentTeam]);

  const handleFocusTimer = useCallback(async (id, action) => {
    // Optimistic Update for Focus Mode
    setFocusTask(prev => {
      if (!prev || prev.id !== id) return prev;
      if (action === 'start') return { ...prev, timerRunning: true, timerStart: Date.now(), status: 'in progress' };
      if (action === 'stop' || action === 'complete') return { ...prev, timerRunning: false, timerStart: null, status: action === 'complete' ? 'done' : prev.status };
      return prev;
    });

    try {
      const updated = await api(`/api/tasks/${id}/timer`, 'POST', { action });
      if (updated && !updated.error) {
        setFocusTask(updated);
      } else {
        console.error('Timer action failed:', updated?.error);
      }
    } catch (err) {
      console.error('Timer action error:', err);
    }
  }, []);

  // Team Persistence Logic
  const handleTeamChange = useCallback((team) => {
    setCurrentTeam(team);
    if (team?.id) {
      localStorage.setItem('teamsync_last_team_id', team.id);
    }
  }, []);

  // Team Initialization: Restore from storage/URL or fallback to first team
  useEffect(() => {
    const initTeam = async () => {
      const teams = await api('/api/teams');
      if (!teams || !Array.isArray(teams) || teams.length === 0) return;

      const savedTeamId = localStorage.getItem('teamsync_last_team_id');
      const urlParams = new URLSearchParams(window.location.search);
      const queryTeamId = urlParams.get('teamId');
      const targetId = queryTeamId || savedTeamId;

      const matched = targetId ? teams.find(t => t.id === targetId) : null;
      const finalTeam = matched || teams[0];
      
      setCurrentTeam(finalTeam);
      if (finalTeam?.id) {
        localStorage.setItem('teamsync_last_team_id', finalTeam.id);
      }
    };

    initTeam();
  }, []);

  const closeFocusMode = () => { setFocusOpen(false); setFocusTask(null); };

  const navItems = [
    { icon: LayoutDashboard, label: 'Board', key: 'board' },
    { icon: FileText, label: 'Notes', key: 'notes' },
    { icon: FolderOpen, label: 'Files', key: 'files' },
    { icon: PenTool, label: 'Whiteboard', key: 'whiteboard' },
    { icon: Code2, label: 'GitHub', key: 'github' },
    { icon: BarChart3, label: 'Analytics', key: 'analytics' },
    { icon: Trophy, label: 'Achievements', key: 'achievements' },
  ];

  const tabTitles = {
    board: 'Task Board', notes: 'Notes', files: 'Files', whiteboard: 'Whiteboard',
    github: 'GitHub', analytics: 'Analytics', achievements: 'Achievements',
  };

  // TRUE ZEN MODE: Unmount everything else and render purely Focus Mode
  // This absolutely guarantees no z-index overlap, no pointer-event blocks, and full immersion!
  if (focusOpen && focusTask) {
    return (
      <React.Fragment>
        <AchievementToast currentUserId={currentUserId} />
        <FocusMode task={focusTask} onClose={closeFocusMode} onTimer={handleFocusTimer} />
      </React.Fragment>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AchievementToast currentUserId={currentUserId} />

      {/* Sidebar */}
      <motion.nav initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="glass-panel w-20 lg:w-64 flex flex-col justify-between py-5 px-3 lg:px-4 m-3 rounded-3xl z-10 flex-shrink-0">
        <div className="space-y-1 overflow-y-auto">
          {/* Logo — click to go to Board */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-5 px-1">
            <button
              onClick={() => setActiveTab('board')}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20 cursor-pointer hover:scale-105 transition-transform"
              title="Go to Board"
            >T</button>
            <button onClick={() => setActiveTab('board')} className="hidden lg:block">
              <h2 className="font-bold text-xl tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 hover:from-purple-300 hover:to-blue-300 transition-all">TeamSync</h2>
            </button>
          </div>

          {/* Team Selector */}
          <div className="mb-4 hidden lg:block">
            <TeamManager currentTeam={currentTeam} onTeamChange={handleTeamChange} session={session} />
          </div>

          {/* Online members — click to view profile */}
          {currentTeam && members.length > 0 && (
            <div className="mb-4 hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                Team ({onlineUsers.length} online)
              </p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {members.map(m => (
                  <button key={m.id} className="relative group" title={`${m.name}${m.role === 'leader' ? ' (Owner)' : ''}`}
                    onClick={() => setProfileUserId(m.id)}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all cursor-pointer hover:scale-110 ${
                      onlineUsers.includes(m.id)
                        ? 'bg-gradient-to-br from-purple-500 to-blue-500 border-green-400 text-white'
                        : 'border-white/10 text-gray-500'
                    }`} style={{ backgroundColor: onlineUsers.includes(m.id) ? undefined : 'var(--input-bg)' }}>
                      {m.avatar || m.name?.charAt(0)}
                    </div>
                    {onlineUsers.includes(m.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2" style={{ borderColor: 'var(--bg-primary)' }} />
                    )}
                    {m.role === 'leader' && (
                      <div className="absolute -top-1 -right-1 text-[8px]">👑</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nav Items */}
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <button onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl transition-all ${
                    activeTab === item.key
                      ? 'bg-purple-500/15 text-purple-400 shadow-md shadow-purple-500/5'
                      : 'hover:bg-white/5'
                  }`} style={{ color: activeTab === item.key ? undefined : 'var(--text-secondary)' }}>
                  <item.icon className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Focus Mode Button */}
          {currentTeam && (
            <button onClick={openFocusMode}
              className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all mt-3 cursor-pointer">
              <Focus className="w-5 h-5" />
              <span className="hidden lg:block text-sm font-medium">Focus Mode</span>
            </button>
          )}

          {/* IDE Button */}
          {currentTeam && (
            <button onClick={() => window.location.href = `/ide/${currentTeam.id}`}
              className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all mt-2 cursor-pointer border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Code2 className="w-5 h-5" />
              <span className="hidden lg:block text-sm font-bold tracking-wide">Nexus IDE</span>
            </button>
          )}
        </div>

        {/* Bottom */}
        <div className="space-y-2">
          <button onClick={toggleTheme}
            className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl transition-all hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="hidden lg:block text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block text-sm font-medium">Logout</span>
          </button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
        {/* Header */}
        <header className="mb-5 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{tabTitles[activeTab]}</h1>
              {currentTeam && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentTeam.name}</p>}
            </div>
            {currentTeam && <DailyProgress />}
          </div>
          <div className="flex items-center gap-3">
            <SearchBar />
            <NotificationsDropdown userId={currentUserId} />
            <XpBar currentUserId={currentUserId} />
            <button
              onClick={() => setProfileUserId(currentUserId)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
              title="View Profile"
            >
              {session?.user?.email?.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Content */}
        {!currentTeam ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-[60vh]">
            <div className="text-6xl mb-6">👥</div>
            <h2 className="text-2xl font-bold mb-2">Welcome to TeamSync!</h2>
            <p className="mb-6 text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>Create a new team or join an existing one to get started.</p>
            <div className="w-full max-w-sm">
              <TeamManager currentTeam={currentTeam} onTeamChange={handleTeamChange} session={session} />
            </div>
          </motion.div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'board' && <TaskBoard teamId={currentTeam.id} session={session} onFocus={handleOpenFocus} />}
            {activeTab === 'notes' && <NotesPanel teamId={currentTeam.id} />}
            {activeTab === 'files' && <FilesPanel teamId={currentTeam.id} />}
            {activeTab === 'whiteboard' && <WhiteboardPanel teamId={currentTeam.id} />}
            {activeTab === 'github' && <GitHubPanel teamId={currentTeam.id} currentTeam={currentTeam} isLeader={isLeader} onTeamUpdate={() => {
              // Refresh team data when repo is linked/unlinked
              api(`/api/teams`).then(teams => {
                if (teams && Array.isArray(teams)) {
                  const updated = teams.find(t => t.id === currentTeam.id);
                  if (updated) setCurrentTeam(updated);
                }
              });
            }} />}
            {activeTab === 'analytics' && <AnalyticsPanel teamId={currentTeam.id} />}
            {activeTab === 'achievements' && (
              <div className="glass-panel rounded-3xl p-6"><AchievementsPanel /></div>
            )}
          </motion.div>
        )}
      </main>

      {/* Quick Add FAB */}
      {currentTeam && activeTab === 'board' && (
        <QuickAddTask teamId={currentTeam.id} userId={currentUserId} />
      )}

      {/* User Profile Modal */}
      <AnimatePresence>
        {profileUserId && <UserProfile userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      </AnimatePresence>
    </div>
  );
}
