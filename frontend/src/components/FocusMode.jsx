import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, CheckCircle, Volume2, VolumeX, CloudRain, Wind, Waves } from 'lucide-react';

const SOUNDS = [
  { key: 'rain', label: 'Gentle Rain', icon: CloudRain },
  { key: 'ocean', label: 'Ocean Waves', icon: Waves },
  { key: 'breeze', label: 'Soft Breeze', icon: Wind },
];

// Soft pink noise (warm, gentle — like Alto's Adventure ambiance)
function generateSoftNoise(ctx, type) {
  const sampleRate = ctx.sampleRate;
  const duration = 4; // seconds of buffer to loop
  const bufferSize = duration * sampleRate;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate); // stereo

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const output = buffer.getChannelData(ch);

    if (type === 'rain') {
      // Gentle pink noise with soft droplet modulation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        // Gentle amplitude modulation for raindrop feel
        const mod = 0.7 + 0.3 * Math.sin(2 * Math.PI * (i / sampleRate) * 0.15);
        output[i] = pink * 0.015 * mod;
      }
    } else if (type === 'ocean') {
      // Ocean waves: modulated low-pass noise (very soothing)
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise (low frequency rumble)
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        // Wave envelope — slow breathing rhythm ~6 second cycle
        const wave = 0.4 + 0.6 * Math.pow(Math.sin(2 * Math.PI * (i / sampleRate) * 0.08), 2);
        output[i] = lastOut * 0.4 * wave;
      }
    } else {
      // Soft breeze: extra-filtered pink noise, barely there
      let lastOut = 0;
      let lastOut2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Double low-pass for extreme softness
        lastOut = lastOut * 0.97 + white * 0.03;
        lastOut2 = lastOut2 * 0.95 + lastOut * 0.05;
        // Gentle undulation
        const mod = 0.6 + 0.4 * Math.sin(2 * Math.PI * (i / sampleRate) * 0.04);
        output[i] = lastOut2 * 0.5 * mod;
      }
    }
  }

  return buffer;
}

export default function FocusMode({ task, onClose, onTimer }) {
  const [countdown, setCountdown] = useState('--:--:--');
  const [elapsed, setElapsed] = useState(0);
  const [activeSound, setActiveSound] = useState(null);
  const [volume, setVolume] = useState(0.3); // Start lower for softness
  const [muted, setMuted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);

  // Live countdown
  useEffect(() => {
    if (!task) return;
    const tick = () => {
      if (task.deadline || task.dueDate) {
        const dl = task.deadline || task.dueDate;
        // Only replace T with space for local strings without TZ info
        let dateStr = dl;
        if (typeof dl === 'string' && dl.includes('T') && !dl.includes('Z') && !dl.includes('+')) {
          dateStr = dl.replace('T', ' ');
        }
        const dlTime = new Date(dateStr).getTime();
        const now = Date.now();
        const ms = dlTime - now;
        
        if (ms <= 0) { 
          setCountdown('Overdue'); 
        } else {
          const d = Math.floor(ms / 86400000);
          const h = Math.floor((ms % 86400000) / 3600000);
          const m = Math.floor((ms % 3600000) / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          
          if (d > 0) {
            setCountdown(`${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          } else {
            setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          }
        }
      } else {
        setCountdown('No deadline');
      }
      // Session elapsed
      if (task.timerRunning && task.timerStart) {
        const startMs = typeof task.timerStart === 'string' ? new Date(task.timerStart).getTime() : task.timerStart;
        const diff = Math.floor((Date.now() - startMs) / 1000);
        setElapsed(Math.max(0, diff + (task.actualTime || 0) * 60));
      } else {
        setElapsed((task.actualTime || 0) * 60);
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [task]);

  // Audio controls
  const stopAudio = useCallback(() => {
    try {
      if (sourceRef.current) { sourceRef.current.stop(); sourceRef.current = null; }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
      gainRef.current = null;
    } catch (e) { /* ignore */ }
  }, []);

  const startAudio = useCallback((type) => {
    stopAudio();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const buffer = generateSoftNoise(ctx, type);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Create a gentle low-pass filter to soften everything further
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = type === 'ocean' ? 400 : type === 'rain' ? 800 : 500;
      filter.Q.value = 0.5;

      const gainNode = ctx.createGain();
      const vol = muted ? 0 : volume * 0.4; // Extra soft multiplier
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2); // 2 sec fade in

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();

      sourceRef.current = source;
      gainRef.current = gainNode;
    } catch (e) {
      console.warn('Audio not supported:', e);
    }
  }, [stopAudio, muted, volume]);

  useEffect(() => {
    if (activeSound) startAudio(activeSound);
    else stopAudio();
    return () => stopAudio();
  }, [activeSound]);

  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      const vol = muted ? 0 : volume * 0.4;
      gainRef.current.gain.linearRampToValueAtTime(vol, audioCtxRef.current.currentTime + 0.3);
    }
  }, [volume, muted, activeSound]);

  // Cleanup on unmount
  useEffect(() => { return () => stopAudio(); }, [stopAudio]);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    console.log('[FocusMode] Start button clicked for task:', task.id);
    setIsStarting(true);
    try {
      await onTimer(task.id, 'start');
    } catch (e) {
      console.error('[FocusMode] Timer start error:', e);
    }
    setIsStarting(false);
  };

  const handlePause = async () => {
    console.log('[FocusMode] Pause button clicked');
    await onTimer(task.id, 'stop');
  };

  const handleComplete = async () => {
    console.log('[FocusMode] Complete button clicked');
    stopAudio();
    await onTimer(task.id, 'complete');
    onClose();
  };

  if (!task) return null;

  const isRunning = task.timerRunning;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden z-[1000]" 
      style={{ background: '#05050a' }}
    >
      {/* Breathing background elements */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[800px] h-[800px] rounded-full blur-[180px] pointer-events-none"
        style={{ background: 'rgba(139, 92, 246, 0.12)', top: '-10%', left: '-10%' }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{ background: 'rgba(59, 130, 246, 0.08)', bottom: '-10%', right: '-10%' }}
      />

      {/* Close Button - Fixed to viewport */}
      <button 
        onClick={() => { stopAudio(); onClose(); }}
        className="absolute top-10 right-10 text-zinc-500 hover:text-white hover:scale-110 transition-all p-3 cursor-pointer z-[1100] bg-white/5 rounded-full backdrop-blur-md border border-white/5"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Centered Content */}
      <div className="relative z-[1050] flex flex-col items-center justify-center max-w-2xl w-full px-6 space-y-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <motion.p
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[10px] uppercase tracking-[0.5em] font-black text-purple-500/60"
          >
            Deep Focus Session
          </motion.p>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {task.title}
          </h1>
        </div>

        {/* Timer/Deadline Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-lg">
          <div className="text-center space-y-3 p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Deadline</p>
            <p className={`text-4xl font-mono font-black tracking-tighter ${countdown === 'Overdue' ? 'text-red-500' : 'text-zinc-200'}`}>
              {countdown}
            </p>
          </div>
          <div className="text-center space-y-3 p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Session Time</p>
            <p className="text-4xl font-mono font-black tracking-tighter text-purple-400">
              {formatElapsed(elapsed)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {isRunning ? (
            <>
              <button 
                onClick={handlePause}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold transition-all cursor-pointer hover:bg-yellow-500/20 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
              >
                <Pause className="w-5 h-5 fill-current" /> 
                <span>Pause Session</span>
              </button>
              <button 
                onClick={handleComplete}
                className="group flex items-center gap-3 px-10 py-4 rounded-2xl text-white text-sm font-bold shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-emerald-500/20"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <CheckCircle className="w-5 h-5" /> 
                <span>Mark Complete</span>
              </button>
            </>
          ) : (
            <button 
              onClick={handleStart} 
              disabled={isStarting}
              className="group flex items-center gap-4 px-12 py-5 rounded-2xl text-white text-base font-black shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 shadow-purple-500/25"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <Play className="w-6 h-6 fill-current" /> 
              <span>{isStarting ? 'Preparing...' : 'Start Working'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ambient Sound Controls - Fixed to Bottom */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-[1100]">
        <div className="flex items-center gap-4 p-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl">
          {SOUNDS.map(s => (
            <button 
              key={s.key} 
              onClick={() => setActiveSound(activeSound === s.key ? null : s.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSound === s.key
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              <s.icon className="w-4 h-4" /> 
              {s.label}
            </button>
          ))}
          
          <div className="w-px h-6 bg-white/10 mx-1" />

          <div className="flex items-center gap-4 px-2">
            <button 
              onClick={() => setMuted(!muted)} 
              className="text-zinc-500 hover:text-white transition-colors p-1 cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={volume} 
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-purple-500 h-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity" 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
