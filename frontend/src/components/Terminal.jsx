import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as TerminalIcon, X, Trash2, Copy, Check, GripHorizontal } from 'lucide-react';
import { Terminal as Xterm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import socket from '../lib/socket';

export default function Terminal({ isOpen, onClose, teamId }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [height, setHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle Resize
  const startResizing = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setHeight(newHeight);
        fitAddonRef.current?.fit();
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize]);

  useEffect(() => {
    if (isOpen && terminalRef.current && !xtermRef.current) {
      const term = new Xterm({
        theme: {
          background: '#0a0a0a',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selection: '#rgba(255, 255, 255, 0.3)',
        },
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
        cursorBlink: true,
        convertEol: true,
        rows: 20
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      
      // Delay fit to ensure container is fully rendered
      setTimeout(() => fitAddon.fit(), 100);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => {
        socket.emit('terminal:input', data);
      });

      socket.emit('terminal:join', { teamId });

      const handleOutput = (data) => {
        term.write(data);
      };

      socket.on('terminal:output', handleOutput);
      socket.on('code-output', handleOutput);

      return () => {
        socket.off('terminal:output', handleOutput);
        socket.off('code-output', handleOutput);
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, [isOpen, teamId]);

  const handleCopy = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      } else {
        // If no selection, copy all
        // xterm doesn't have a simple "getAllText", so we use a fallback
        // or just prompt the user to select
        alert("Please select some text in the terminal first to copy.");
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a] border-t-2 border-[#1a1a1a] text-zinc-300 shadow-2xl z-[100] flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-blue-500/50 transition-colors z-[110] flex items-center justify-center group"
      >
        <GripHorizontal size={12} className="text-zinc-700 group-hover:text-blue-400" />
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121212] border-b border-[#1a1a1a]">
        <div className="flex items-center space-x-3">
          <TerminalIcon size={14} className="text-zinc-500" />
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400">Collaborative Terminal</span>
          <span className="flex items-center space-x-1.5 ml-2 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Live</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-200 cursor-pointer flex items-center space-x-1"
            title="Copy Selection"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className="text-[9px] font-bold uppercase ml-1">Copy</span>
          </button>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button 
            onClick={() => xtermRef.current?.clear()}
            className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-200 cursor-pointer"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-zinc-500 hover:text-red-400 cursor-pointer"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* xterm.js Container */}
      <div className="flex-1 p-2 bg-[#0a0a0a] overflow-hidden select-text" ref={terminalRef}></div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .xterm-viewport::-webkit-scrollbar { width: 10px; }
        .xterm-viewport::-webkit-scrollbar-track { background: #0a0a0a; }
        .xterm-viewport::-webkit-scrollbar-thumb { background: #1a1a1a; border: 2px solid #0a0a0a; border-radius: 10px; }
        .xterm-viewport::-webkit-scrollbar-thumb:hover { background: #2a2a2a; }
        .xterm { padding: 4px; }
        .xterm-rows { line-height: 1.4; }
      `}} />
    </div>
  );
}
