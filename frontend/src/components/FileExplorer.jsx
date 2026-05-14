import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Plus, Trash2, FilePlus, FolderPlus, Edit2, CloudDownload, Package, Loader2 } from 'lucide-react';

const SUPPORTED_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'py', 'ipynb', 'java', 'cpp', 'h', 'html', 'css', 'json', 'md', 'txt'];


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

const GithubItem = ({ item, depth, owner, repo, onImportGithub }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [api, setApi] = useState(null);

  // We need to access the api function. Since it's not a hook, we'll get it from a global or prop.
  // In our case, we can pass it down or import it if it was a library.
  // Let's assume we'll use window.api_instance or similar if needed, 
  // but for now let's just use the standard fetch/api if we can.
  
  const toggleOpen = async (e) => {
    e.stopPropagation();
    if (item.type !== 'dir') return;
    
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    
    if (newOpen && children.length === 0) {
      setLoading(true);
      try {
        // We'll use the global api from our lib
        const { api: apiCall } = await import('../lib/api');
        const data = await apiCall(`/api/github/contents/${owner}/${repo}?path=${encodeURIComponent(item.path)}`);
        if (data && Array.isArray(data)) setChildren(data);
      } catch (err) {
        console.error('Failed to fetch github subfolder:', err);
      }
      setLoading(false);
    }
  };

  return (
    <div className="select-none">
      <div 
        className="group flex items-center py-1.5 px-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        onClick={toggleOpen}
      >
        <div className="w-4 h-4 mr-1 flex items-center justify-center">
          {item.type === 'dir' && (
            loading ? <div className="w-2 h-2 border border-zinc-500 border-t-transparent rounded-full animate-spin" /> :
            (isOpen ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />)
          )}
        </div>
        
        {item.type === 'dir' ? (
          <Folder size={14} className="mr-2 text-blue-500/60" />
        ) : (
          <File size={14} className="mr-2 text-zinc-500" />
        )}
        
        <span className={`text-[11px] truncate flex-1 ${item.type === 'file' && !SUPPORTED_EXTENSIONS.includes(item.name.split('.').pop().toLowerCase()) ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {item.name}
        </span>
        
        {item.type === 'file' && (
          (() => {
            const ext = item.name.split('.').pop().toLowerCase();
            const isSupported = SUPPORTED_EXTENSIONS.includes(ext);
            if (!isSupported) return null;
            return (
              <button 
                onClick={(e) => { e.stopPropagation(); onImportGithub(item); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-400 text-zinc-600 transition-all"
                title="Import to Project"
              >
                <CloudDownload size={14} />
              </button>
            );
          })()
        )}
      </div>


      {isOpen && children.length > 0 && (
        <div>
          {children.map(child => (
            <GithubItem 
              key={child.path} 
              item={child} 
              depth={depth + 1} 
              owner={owner}
              repo={repo}
              onImportGithub={onImportGithub}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileExplorer({ files, onSelect, onAdd, onDelete, onRename, activeFileId, dashboardFiles = [], onImportDashboard, githubAssets = [], onImportGithub, githubRepoInfo }) {
  const [isDashOpen, setIsDashOpen] = useState(true);
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isGithubOpen, setIsGithubOpen] = useState(false);

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
    <div className="flex-1 overflow-y-auto py-2 custom-scrollbar flex flex-col">
      {/* Project Files Section */}
      <div className="mb-4">
        <div 
          onClick={() => setIsExplorerOpen(!isExplorerOpen)}
          className="px-4 py-1 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {isExplorerOpen ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Project Files</span>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onAdd(null, 'file'); }} className="p-1 hover:text-white text-zinc-400" title="New File">
              <FilePlus size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAdd(null, 'folder'); }} className="p-1 hover:text-white text-zinc-400" title="New Folder">
              <FolderPlus size={14} />
            </button>
          </div>
        </div>
        
        {isExplorerOpen && (
          <div className="mt-1">
            {tree.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-zinc-600 italic">Empty</p>
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
        )}
      </div>

      {/* Dashboard Resources Section */}
      <div className="mt-2 border-t border-zinc-800 pt-4">
        <div 
          onClick={() => setIsDashOpen(!isDashOpen)}
          className="px-4 py-1 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {isDashOpen ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Dashboard Assets</span>
          </div>
          <div className="flex items-center bg-purple-500/10 text-purple-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
            Sync
          </div>
        </div>

        {isDashOpen && (
          <div className="mt-2 space-y-0.5">
            {dashboardFiles.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-zinc-600 italic">No assets found</p>
              </div>
            ) : (
              dashboardFiles.map(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                const isSupported = SUPPORTED_EXTENSIONS.includes(ext);
                
                return (
                  <div 
                    key={file.id} 
                    className={`group flex items-center py-1.5 px-4 transition-colors ${isSupported ? 'hover:bg-purple-500/10 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => isSupported && onImportDashboard(file.id)}
                    title={isSupported ? 'Import to Project' : 'Unsupported file type'}
                  >
                    <Package size={14} className={`mr-2 ${isSupported ? 'text-purple-400' : 'text-zinc-600'}`} />
                    <span className={`text-[11px] truncate flex-1 ${isSupported ? 'text-zinc-300' : 'text-zinc-600'}`}>{file.name}</span>
                    {isSupported && (
                      <CloudDownload size={14} className="opacity-0 group-hover:opacity-100 text-purple-400 transition-all" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* GitHub Repository Section */}
      <div className="mt-2 border-t border-zinc-800 pt-4 pb-10">
        <div 
          onClick={() => setIsGithubOpen(!isGithubOpen)}
          className="px-4 py-1 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {isGithubOpen ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">GitHub Repository</span>
          </div>
          <div className="flex items-center bg-blue-500/10 text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
            Live
          </div>
        </div>

        {isGithubOpen && (
          <div className="mt-2 space-y-0.5">
            {githubAssets.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-zinc-600 italic">Connect a repo first</p>
              </div>
            ) : (() => {
              // Extract owner/repo from any asset path or pass it as prop
              // Since we don't have it here easily, we'll use a hack or ask parent.
              // Let's assume the parent will pass owner/repo strings.
              return githubAssets.map(item => (
                <GithubItem 
                  key={item.path} 
                  item={item} 
                  depth={0} 
                  owner={githubRepoInfo?.owner}
                  repo={githubRepoInfo?.repo}
                  onImportGithub={onImportGithub}
                />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
