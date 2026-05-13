import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Plus, Trash2, FilePlus, FolderPlus, Edit2 } from 'lucide-react';

const FileItem = ({ item, depth, onSelect, onAdd, onDelete, onRename, activeFileId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = activeFileId === item.id;

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (item.type === 'folder') setIsOpen(!isOpen);
    else onSelect(item);
  };

  return (
    <div className="select-none">
      <div 
        className={`group flex items-center py-1 px-2 cursor-pointer hover:bg-zinc-800 transition-colors ${isSelected ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400'}`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        onClick={toggleOpen}
      >
        <div className="w-4 h-4 mr-1 flex items-center justify-center">
          {item.type === 'folder' && (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          )}
        </div>
        
        {item.type === 'folder' ? (
          <Folder size={14} className="mr-2 text-blue-500 fill-blue-500/20" />
        ) : (
          <File size={14} className="mr-2 text-zinc-500" />
        )}
        
        <span className="text-xs font-medium truncate flex-1">{item.name}</span>
        
        <div className="hidden group-hover:flex items-center space-x-1">
          {item.type === 'folder' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onAdd(item.id, 'file'); }} className="p-0.5 hover:text-white" title="New File">
                <FilePlus size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAdd(item.id, 'folder'); }} className="p-0.5 hover:text-white" title="New Folder">
                <FolderPlus size={12} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRename(item); }} className="p-0.5 hover:text-white" title="Rename">
            <Edit2 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-0.5 hover:text-red-400" title="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {item.type === 'folder' && isOpen && item.children && (
        <div>
          {item.children.map(child => (
            <FileItem 
              key={child.id} 
              item={child} 
              depth={depth + 1} 
              onSelect={onSelect}
              onAdd={onAdd}
              onDelete={onDelete}
              onRename={onRename}
              activeFileId={activeFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileExplorer({ files, onSelect, onAdd, onDelete, onRename, activeFileId }) {
  // Build tree from flat list
  const buildTree = (list) => {
    const map = {};
    const roots = [];
    
    list.forEach(item => {
      map[item.id] = { ...item, children: [] };
    });
    
    list.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    
    return roots;
  };

  const tree = buildTree(files);

  return (
    <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
      <div className="px-4 py-1 flex items-center justify-between group">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Explorer</span>
        <div className="flex items-center space-x-1 transition-opacity">
          <button onClick={() => onAdd(null, 'file')} className="p-1 hover:text-white text-zinc-400" title="New File">
            <FilePlus size={14} />
          </button>
          <button onClick={() => onAdd(null, 'folder')} className="p-1 hover:text-white text-zinc-400" title="New Folder">
            <FolderPlus size={14} />
          </button>
        </div>
      </div>
      
      {tree.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-zinc-600 italic">No files in project</p>
          <button 
            onClick={() => onAdd(null, 'file')}
            className="mt-4 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] rounded"
          >
            Create your first file
          </button>
        </div>
      ) : (
        tree.map(item => (
          <FileItem 
            key={item.id} 
            item={item} 
            depth={0} 
            onSelect={onSelect}
            onAdd={onAdd}
            onDelete={onDelete}
            onRename={onRename}
            activeFileId={activeFileId}
          />
        ))
      )}
    </div>
  );
}
