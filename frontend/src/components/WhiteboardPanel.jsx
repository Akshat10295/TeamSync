import React, { useState, useCallback, useRef, useMemo } from 'react';
import { ReactFlow, Controls, Background, MiniMap, Handle, Position, addEdge, useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toJpeg } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, Save, Upload, X, Circle, Square, Diamond, Type, Palette } from 'lucide-react';
import { api } from '../lib/api';

const COLORS = [
  { label: 'Purple', bg: 'rgba(139,92,246,0.25)', border: 'rgba(139,92,246,0.6)', text: '#e2e8f0' },
  { label: 'Blue', bg: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.6)', text: '#e2e8f0' },
  { label: 'Green', bg: 'rgba(34,197,94,0.25)', border: 'rgba(34,197,94,0.6)', text: '#e2e8f0' },
  { label: 'Red', bg: 'rgba(239,68,68,0.25)', border: 'rgba(239,68,68,0.6)', text: '#e2e8f0' },
  { label: 'Yellow', bg: 'rgba(234,179,8,0.25)', border: 'rgba(234,179,8,0.6)', text: '#e2e8f0' },
  { label: 'Pink', bg: 'rgba(236,72,153,0.25)', border: 'rgba(236,72,153,0.6)', text: '#e2e8f0' },
  { label: 'Cyan', bg: 'rgba(6,182,212,0.25)', border: 'rgba(6,182,212,0.6)', text: '#e2e8f0' },
  { label: 'Gray', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', text: '#94a3b8' },
];

// ─── Custom Node Types ───────────────────────────────────────────────────────
function RectangleNode({ data }) {
  return (
    <div style={{
      background: data.color?.bg || COLORS[0].bg,
      border: `2px solid ${data.color?.border || COLORS[0].border}`,
      color: data.color?.text || '#e2e8f0',
      borderRadius: '12px', padding: '12px 24px', minWidth: '120px', textAlign: 'center',
      fontSize: '13px', fontFamily: 'Inter,sans-serif', fontWeight: 500,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1', width: 8, height: 8 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', width: 8, height: 8 }} />
    </div>
  );
}

function DiamondNode({ data }) {
  return (
    <div style={{
      background: data.color?.bg || COLORS[4].bg,
      border: `2px solid ${data.color?.border || COLORS[4].border}`,
      color: data.color?.text || '#e2e8f0',
      transform: 'rotate(45deg)', width: '80px', height: '80px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#eab308', width: 8, height: 8, transform: 'rotate(-45deg)' }} />
      <span style={{ transform: 'rotate(-45deg)', fontSize: '11px', fontFamily: 'Inter,sans-serif', fontWeight: 500, textAlign: 'center', padding: '4px' }}>
        {data.label}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ background: '#eab308', width: 8, height: 8, transform: 'rotate(-45deg)' }} />
    </div>
  );
}

function CircleNode({ data }) {
  return (
    <div style={{
      background: data.color?.bg || COLORS[2].bg,
      border: `2px solid ${data.color?.border || COLORS[2].border}`,
      color: data.color?.text || '#e2e8f0',
      borderRadius: '50%', width: '80px', height: '80px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '11px', fontFamily: 'Inter,sans-serif', fontWeight: 500, textAlign: 'center', padding: '8px',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#22c55e', width: 8, height: 8 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: '#22c55e', width: 8, height: 8 }} />
    </div>
  );
}

function TextNode({ data }) {
  return (
    <div style={{ color: data.color?.text || '#94a3b8', fontSize: '13px', fontFamily: 'Inter,sans-serif', fontWeight: 400, padding: '4px 8px' }}>
      {data.label}
    </div>
  );
}

const nodeTypes = { rectangle: RectangleNode, diamond: DiamondNode, circle: CircleNode, textLabel: TextNode };

const SHAPES = [
  { key: 'rectangle', label: 'Rectangle', icon: Square },
  { key: 'diamond', label: 'Decision', icon: Diamond },
  { key: 'circle', label: 'Start/End', icon: Circle },
  { key: 'textLabel', label: 'Text', icon: Type },
];

const defaultNodes = [
  { id: '1', type: 'circle', data: { label: 'Start', color: COLORS[2] }, position: { x: 250, y: 30 } },
  { id: '2', type: 'rectangle', data: { label: 'Process', color: COLORS[0] }, position: { x: 220, y: 160 } },
  { id: '3', type: 'diamond', data: { label: 'Yes?', color: COLORS[4] }, position: { x: 240, y: 310 } },
];
const defaultEdges = [
  { id: 'e1-2', source: '1', target: '2', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#6366f1', strokeWidth: 2 }, animated: true },
  { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#6366f1', strokeWidth: 2 } },
];

export default function WhiteboardPanel({ teamId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [nodeLabel, setNodeLabel] = useState('');
  const [selectedShape, setSelectedShape] = useState('rectangle');
  const [selectedColor, setSelectedColor] = useState(0);
  const [showColors, setShowColors] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedDiagrams, setSavedDiagrams] = useState([]);
  const [counter, setCounter] = useState(4);
  const flowRef = useRef(null);
  const fileInputRef = useRef(null);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6366f1', strokeWidth: 2 },
      animated: false,
    }, eds));
  }, [setEdges]);

  const addNode = () => {
    const label = nodeLabel.trim() || `Node ${counter}`;
    const newNode = {
      id: String(counter),
      type: selectedShape,
      data: { label, color: COLORS[selectedColor] },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
    };
    setNodes(nds => [...nds, newNode]);
    setCounter(c => c + 1);
    setNodeLabel('');
  };

  const deleteSelected = () => {
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
  };

  const exportPng = () => {
    if (!flowRef.current) return;
    const el = flowRef.current.querySelector('.react-flow__viewport');
    if (!el) return;
    toPng(el, { backgroundColor: '#0d0c13' }).then(dataUrl => {
      const link = document.createElement('a');
      link.download = 'diagram.png';
      link.href = dataUrl;
      link.click();
    }).catch(console.error);
  };

  const exportJpg = () => {
    if (!flowRef.current) return;
    const el = flowRef.current.querySelector('.react-flow__viewport');
    if (!el) return;
    toJpeg(el, { backgroundColor: '#0d0c13', quality: 0.95 }).then(dataUrl => {
      const link = document.createElement('a');
      link.download = 'diagram.jpg';
      link.href = dataUrl;
      link.click();
    }).catch(console.error);
  };

  const exportJson = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'diagram.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        setCounter(Math.max(...(data.nodes || []).map(n => parseInt(n.id) || 0)) + 1);
      } catch (err) {
        console.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveDiagram = async () => {
    if (!saveName.trim()) return;
    await api('/api/diagrams', 'POST', {
      title: saveName,
      diagramData: { nodes, edges },
      teamId,
    });
    setShowSaveModal(false);
    setSaveName('');
  };

  const loadDiagrams = async () => {
    const data = await api(`/api/diagrams?teamId=${teamId}`);
    if (data && Array.isArray(data)) {
      setSavedDiagrams(data);
      setShowLoadModal(true);
    }
  };

  const loadDiagram = (diagram) => {
    try {
      const data = diagram.diagramData || {};
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
      setCounter(Math.max(...(data.nodes || []).map(n => parseInt(n.id) || 0)) + 1);
      setShowLoadModal(false);
    } catch (e) { console.error('Invalid diagram data'); }
  };

  const handleDiagramDelete = async (id, e) => {
    e.stopPropagation();
    await api(`/api/diagrams/${id}`, 'DELETE');
    setSavedDiagrams(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar Row 1: Shape + Label */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {SHAPES.map(s => (
            <button key={s.key} onClick={() => setSelectedShape(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-all cursor-pointer ${
                selectedShape === s.key ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`} title={s.label}>
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div className="relative">
          <button onClick={() => setShowColors(!showColors)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-all cursor-pointer">
            <div className="w-4 h-4 rounded-full" style={{ background: COLORS[selectedColor].border }} />
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColors && (
            <div className="absolute z-20 top-full mt-1 left-0 rounded-xl p-2 shadow-xl flex gap-1.5"
              style={{ background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)' }}>
              {COLORS.map((c, i) => (
                <button key={i} onClick={() => { setSelectedColor(i); setShowColors(false); }}
                  className={`w-7 h-7 rounded-lg transition-all cursor-pointer ${selectedColor === i ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                  style={{ background: c.bg, border: `2px solid ${c.border}` }} title={c.label} />
              ))}
            </div>
          )}
        </div>

        <input type="text" value={nodeLabel} onChange={e => setNodeLabel(e.target.value)} placeholder="Label..."
          onKeyDown={e => e.key === 'Enter' && addNode()}
          className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 w-32" />
        <button onClick={addNode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
        <button onClick={deleteSelected}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-xs transition-all cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      {/* Toolbar Row 2: Save/Load/Export */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Save className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={loadDiagrams}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> Load
        </button>
        
        <div className="w-px h-4 bg-white/10 mx-1" />
        
        <button onClick={exportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Download className="w-3.5 h-3.5" /> PNG
        </button>
        <button onClick={exportJpg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Download className="w-3.5 h-3.5" /> JPG
        </button>
        <button onClick={exportJson}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Download className="w-3.5 h-3.5" /> JSON Export
        </button>

        {/* Hidden internal JSON import */}
        <input type="file" accept=".json" ref={fileInputRef} onChange={importJson} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-all cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> JSON Import
        </button>
        <span className="text-[10px] text-gray-600 ml-2">💡 Drag from handle to handle to connect shapes</span>
      </div>

      {/* Canvas */}
      <div ref={flowRef} className="h-[calc(100vh-280px)] min-h-[400px] rounded-2xl overflow-hidden border border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          fitView
          style={{ background: '#0d0c13' }}
          defaultEdgeOptions={{ style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } }}
          connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        >
          <Background color="#1e1b2e" gap={20} />
          <Controls style={{ background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
          <MiniMap style={{ background: '#1a1625' }} nodeColor="#6366f1" maskColor="rgba(0,0,0,0.5)" />
        </ReactFlow>
      </div>

      {/* Save Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSaveModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h4 className="text-lg font-bold text-white mb-4">Save Diagram</h4>
              <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Diagram name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4" />
              <button onClick={saveDiagram} className="w-full bg-purple-600 text-white rounded-xl py-3 font-semibold cursor-pointer">Save Diagram</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Modal */}
      <AnimatePresence>
        {showLoadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLoadModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-panel rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-white">Load Diagram</h4>
                <button onClick={() => setShowLoadModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              {savedDiagrams.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No saved diagrams</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedDiagrams.map(d => (
                    <div key={d.id} className="flex gap-2">
                      <button onClick={() => loadDiagram(d)}
                        className="flex-1 text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-all cursor-pointer">
                        {d.title}
                      </button>
                      <button onClick={(e) => handleDiagramDelete(d.id, e)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
