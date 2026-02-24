
import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Plus, Search, Trash2, Download, Cloud, AlertCircle, ExternalLink, Info, Loader2, Database, RefreshCw } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { supabaseService } from '../services/supabaseService';
import { firebaseService } from '../services/firebaseService';
import { SoundFile } from '../types';

const Library: React.FC = () => {
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = firebaseService.subscribeToSounds((remoteSounds) => {
      setSounds(remoteSounds);
    });
    return () => unsub();
  }, []);

  const syncCloud = async () => {
    setIsSyncing(true);
    try {
      const cloudFiles = await supabaseService.listSounds();
      for (const file of cloudFiles) {
        const id = file.name.split('.')[0].replace(/[^a-z0-9]/gi, '_');
        const sound: SoundFile = {
          id: id,
          name: file.name.split('-').slice(1).join('-').split('.')[0] || file.name.split('.')[0],
          fileName: file.name,
          url: file.url,
          tag: 'other',
          duration: 0
        };
        await firebaseService.saveSoundRemote(sound);
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { publicUrl, storagePath } = await supabaseService.uploadSound(file, file.name);
      const sound: SoundFile = {
        id: storagePath.split('.')[0].replace(/[^a-z0-9]/gi, '_'),
        name: file.name.split('.')[0],
        fileName: storagePath,
        url: publicUrl,
        tag: 'other',
        duration: 0
      };
      await databaseService.addSound(sound);
      await firebaseService.saveSoundRemote(sound);
    } catch (error: any) {
      console.error("Upload failed:", error);
      // Alerts are handled inside supabaseService for specific config errors
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (sound: SoundFile) => {
    if (confirm("Permanently delete this cloud asset?")) {
      try {
        await supabaseService.deleteSound(sound.url);
        await databaseService.deleteSound(sound.id);
        await firebaseService.deleteSoundRemote(sound.id);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const previewSound = (url: string) => {
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.play().catch(e => {
      console.error("Playback blocked:", e);
      alert("Playback blocked. Please ensure you've tapped 'Unlock Speaker' on the dashboard and your browser allows auto-play.");
    });
  };

  const filteredSounds = sounds.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Audio Vault</h1>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-2">
              <Database size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">{sounds.length} Assets</span>
            </div>
          </div>
          <p className="text-slate-500 font-medium">Synchronized Sound Database</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={syncCloud}
            disabled={isSyncing}
            className="bg-white border border-slate-200 text-slate-600 flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            <span className="text-sm font-black uppercase tracking-widest hidden md:inline">
              {isSyncing ? 'Syncing...' : 'Sync Cloud'}
            </span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} disabled={isUploading} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-slate-900 text-white flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
            <span className="text-sm font-black uppercase tracking-widest hidden md:inline">
              {isUploading ? 'Uploading...' : 'Import Sound'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discovery Tool */}
        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-125">
            <Music size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl">
                <Download size={24} />
              </div>
              <h3 className="font-black text-xl uppercase tracking-tighter">Expand Your Arsenal</h3>
            </div>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-sm">
              Sourcing high-quality predator calls is key to preventing habituation. Sync new files from global repositories directly to your unit.
            </p>
            <a 
              href="https://pixabay.com/sound-effects/search/bird/" 
              target="_blank" 
              className="inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-400 transition-colors shadow-lg"
            >
              Access Repelling Assets <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Dynamic Search & Requirement Box */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Filter synced library..." 
              className="w-full bg-white border border-slate-100 rounded-[24px] py-5 pl-16 pr-6 text-sm font-black focus:outline-none focus:ring-4 focus:ring-green-500/10 shadow-sm transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-[28px] p-6 flex gap-5 items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shrink-0">
              <Info size={24} />
            </div>
            <p className="text-[11px] text-blue-900 font-bold uppercase tracking-wider leading-relaxed">
              Every sound listed here is available for both <strong>Manual Triggers</strong> and <strong>Scheduled Events</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive Grid Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {sounds.length === 0 ? (
          <div className="col-span-full bg-white rounded-[40px] p-20 border-2 border-dashed border-slate-100 text-center">
            <Cloud size={64} className="mx-auto text-slate-100 mb-6" />
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Library Empty</h3>
            <p className="text-slate-400 text-sm mt-2">Upload audio assets to initialize the field array.</p>
          </div>
        ) : (
          filteredSounds.map(sound => (
            <div key={sound.id} className="group bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div 
                onClick={() => previewSound(sound.url)}
                className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center cursor-pointer transition-all hover:bg-green-600 hover:text-white group-active:scale-90 shadow-inner"
              >
                <Play size={28} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 truncate text-sm uppercase tracking-tight">{sound.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Cloud Asset</span>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(sound)} 
                className="opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Library;
