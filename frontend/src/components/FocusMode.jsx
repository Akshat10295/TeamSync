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
        const ms = new Date(dl) - Date.now();
        if (ms < 0) { setCountdown('Overdue'); return; }
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      } else {
        setCountdown('No deadline');
      }
      // Session elapsed
      if (task.timerRunning && task.timerStart) {
        setElapsed(Math.floor((Date.now() - task.timerStart) / 1000) + (task.actualTime || 0) * 60);
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
    setIsStarting(true);
    try {
      await onTimer(task.id, 'start');
    } catch (e) {
      console.error('Timer start error:', e);
    }
    setIsStarting(false);
  };

  const handlePause = async () => {
    await onTimer(task.id, 'stop');
  };

  const handleComplete = async () => {
    stopAudio();
    await onTimer(task.id, 'complete');
    onClose();
  };

  if (!task) return null;

  const isRunning = task.timerRunning;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ background: '#080810' }}>
      {/* Breathing background */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[600px] h-[600px] rounded-full blur-[150px]"
        style={{ background: 'rgba(139, 92, 246, 0.08)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
        style={{ background: 'rgba(59, 130, 246, 0.06)', top: '20%', left: '30%' }}
      />

      {/* Close */}
      <button onClick={() => { stopAudio(); onClose(); }}
        className="absolute top-6 right-6 text-gray-500 hover:text-white transition-all p-2 cursor-pointer z-10">
        <X className="w-6 h-6" />
      </button>

      {/* Focus label */}
      <motion.p
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="text-xs uppercase tracking-[0.3em] font-bold mb-8"
        style={{ color: 'rgba(139,92,246,0.6)' }}>Focus Mode</motion.p>

      {/* Task title */}
      <h1 className="text-3xl md:text-4xl font-bold text-center max-w-lg px-4 mb-12" style={{ color: '#e2e8f0' }}>{task.title}</h1>

      {/* Countdown */}
      <div className="mb-8 text-center">
        <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: '#64748b' }}>Deadline</p>
        <p className={`text-5xl md:text-6xl font-black font-mono tracking-tight ${countdown === 'Overdue' ? 'text-red-400' : ''}`}
          style={{ color: countdown === 'Overdue' ? undefined : '#e2e8f0' }}>{countdown}</p>
      </div>

      {/* Session elapsed */}
      <div className="mb-12 text-center">
        <p className="text-xs mb-1 uppercase tracking-widest" style={{ color: '#64748b' }}>Session Time</p>
        <p className="text-2xl font-mono" style={{ color: '#94a3b8' }}>{formatElapsed(elapsed)}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isRunning ? (
          <>
            <button onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer hover:scale-105"
              style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}>
              <Pause className="w-5 h-5" /> Pause
            </button>
            <button onClick={handleComplete}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all cursor-pointer hover:scale-105"
              style={{ background: 'linear-gradient(to right, #16a34a, #059669)', boxShadow: '0 10px 25px rgba(22,163,74,0.15)' }}>
              <CheckCircle className="w-5 h-5" /> Complete
            </button>
          </>
        ) : (
          <button onClick={handleStart} disabled={isStarting}
            className="flex items-center gap-2 px-8 py-3 rounded-2xl text-white text-sm font-semibold shadow-lg transition-all cursor-pointer hover:scale-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #9333ea, #3b82f6)', boxShadow: '0 10px 25px rgba(147,51,234,0.15)' }}>
            <Play className="w-5 h-5" /> {isStarting ? 'Starting...' : 'Start Working'}
          </button>
        )}
      </div>

      {/* Ambient Sound */}
      <div className="absolute bottom-8 flex items-center gap-3">
        {SOUNDS.map(s => (
          <button key={s.key} onClick={() => setActiveSound(activeSound === s.key ? null : s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeSound === s.key
                ? 'text-purple-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            style={{ background: activeSound === s.key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)' }}>
            <s.icon className="w-3.5 h-3.5" /> {s.label}
          </button>
        ))}
        {activeSound && (
          <>
            <button onClick={() => setMuted(!muted)} className="text-gray-500 hover:text-white transition-all p-1 cursor-pointer">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-purple-500 h-1" />
          </>
        )}
      </div>
    </motion.div>
  );
}
