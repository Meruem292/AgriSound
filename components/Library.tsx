
import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Plus, Search, Trash2, Download, Cloud, AlertCircle, ExternalLink, Info, Loader2 } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { supabaseService } from '../services/supabaseService';
import { SoundFile } from '../types';

const Library: React.FC = () => {
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSounds();
  }, []);

  const loadSounds = async () => {
    const data = await databaseService.getSounds();
    setSounds(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload to Supabase Storage
      const publicUrl = await supabaseService.uploadSound(file, file.name);

      // 2. Save metadata to local DB
      const sound: SoundFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.split('.')[0],
        fileName: file.name,
        url: publicUrl,
        tag: 'other',
        duration: 0
      };

      await databaseService.addSound(sound);
      await loadSounds();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload sound to cloud storage.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (sound: SoundFile) => {
    if (confirm("Remove this sound from the system?")) {
      // Optional: Delete from Supabase too
      await supabaseService.deleteSound(sound.url);
      await databaseService.deleteSound(sound.id);
      await loadSounds();
    }
  };

  const previewSound = (url: string) => {
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    audio.play().catch(e => console.error("Preview blocked:", e));
  };

  const filteredSounds = sounds.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Cloud Library</h2>
          <p className="text-sm text-slate-500 font-medium">Supabase Storage Sync</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="audio/*" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-green-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 size={28} className="animate-spin" /> : <Plus size={28} strokeWidth={3} />}
          </button>
        </div>
      </div>

      {/* Discovery Link Section */}
      <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Download size={20} className="text-green-400" />
          <h3 className="font-bold text-lg">Discover New Sounds</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Centralize your bird repelling audio. Files uploaded here are available to all units linked to this Supabase project.
        </p>
        <a 
          href="https://pixabay.com/sound-effects/search/bird/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-xl transition-colors font-bold text-sm"
        >
          Open Pixabay Library <ExternalLink size={16} />
        </a>
      </div>

      {/* Instructions Guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3 text-blue-800">
          <Info size={18} />
          <h4 className="font-black text-xs uppercase tracking-wider">How to sync sounds:</h4>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</div>
            <p className="text-xs text-blue-900 font-medium">Download an audio file to your device.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</div>
            <p className="text-xs text-blue-900 font-medium">Click <strong>+</strong> to upload to Supabase Cloud Storage.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">3</div>
            <p className="text-xs text-blue-900 font-medium">The repeller will stream the audio from the cloud when triggered.</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search synced sounds..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sounds.length === 0 ? (
          <div className="bg-slate-100 rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center">
            <Cloud size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">Cloud library empty</p>
            <p className="text-slate-400 text-xs mt-1">Upload files to sync with the field units</p>
          </div>
        ) : (
          filteredSounds.map(sound => (
            <div key={sound.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
              <div 
                onClick={() => previewSound(sound.url)}
                className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 cursor-pointer transition-transform active:scale-90"
              >
                <Play size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{sound.name}</h3>
                <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">Cloud Storage • SUPABASE</span>
              </div>
              <button onClick={() => handleDelete(sound)} className="text-slate-300 hover:text-red-500 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <p className="text-[11px] text-amber-800 font-medium leading-tight">
          <strong>Network Requirement:</strong> The device must have internet access to stream audio from Supabase during a playback event.
        </p>
      </div>
    </div>
  );
};

export default Library;
