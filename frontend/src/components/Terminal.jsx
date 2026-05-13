import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, Trash2, Maximize2, Minimize2 } from 'lucide-react';

export default function Terminal({ output, isOpen, onClose, onClear, isExecuting }) {
  const scrollRef = useRef(null);

  console.log(`[Terminal] Rendering. isOpen: ${isOpen}, outputLength: ${output?.length || 0}`);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-64 bg-[#0c0c0c] border-t-2 border-zinc-700 text-zinc-300 font-mono text-sm shadow-2xl z-[100] flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-zinc-800/50">
        <div className="flex items-center space-x-2">
          <TerminalIcon size={14} className={isExecuting ? "text-green-400 animate-pulse" : "text-zinc-500"} />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Terminal</span>
          {isExecuting && (
            <span className="flex items-center space-x-1 ml-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
              <span className="text-[10px] text-green-500/80 font-bold uppercase tracking-tighter">Running...</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onClear}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-zinc-300"
            title="Clear Terminal"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded transition-colors text-zinc-500 hover:text-red-400"
            title="Close Terminal"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-[#0c0c0c]"
        style={{ 
          scrollBehavior: 'smooth'
        }}
      >
        {!output ? (
          <div className="text-zinc-600 italic select-none text-xs">No output to display. Run some code to see results.</div>
        ) : (
          <pre className="whitespace-pre-wrap break-all leading-relaxed text-zinc-100 text-xs selection:bg-zinc-700">
            {output}
            {isExecuting && (
              <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1 align-middle" />
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
