
import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Plus, Search, Trash2, Download, HardDrive, AlertCircle, ExternalLink, Info, StepForward } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { SoundFile } from '../types';

const Library: React.FC = () => {
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [search, setSearch] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
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

    const sound: SoundFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name.split('.')[0],
      fileName: file.name,
      blob: file,
      tag: 'other',
      duration: 0
    };

    await databaseService.addSound(sound);
    await loadSounds();
  };

  const handleDownloadUrl = async () => {
    const url = prompt("Enter the direct URL of the audio file (.mp3, .wav):");
    if (!url) return;

    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const sound: SoundFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: "Remote Sound " + (sounds.length + 1),
        fileName: "downloaded_audio",
        blob: blob,
        tag: 'other',
        duration: 0
      };
      await databaseService.addSound(sound);
      await loadSounds();
    } catch (e) {
      alert("Failed to download sound. Ensure the URL is accessible and supports CORS.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this sound from local storage?")) {
      await databaseService.deleteSound(id);
      await loadSounds();
    }
  };

  const previewSound = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const filteredSounds = sounds.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header & Main Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Local Sounds</h2>
          <p className="text-sm text-slate-500 font-medium">Internal Storage</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="audio/*" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={28} strokeWidth={3} />
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
          Need predator calls or distress noises? Find thousands of free bird-repelling sounds on Pixabay.
        </p>
        <a 
          href="https://pixabay.com/sound-effects/search/" 
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
          <h4 className="font-black text-xs uppercase tracking-wider">How to add sounds:</h4>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</div>
            <p className="text-xs text-blue-900 font-medium">Download a sound from Pixabay or another source to your device.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</div>
            <p className="text-xs text-blue-900 font-medium">Click the green <strong>+</strong> button above to open your device's <strong>Downloads</strong> folder.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">3</div>
            <p className="text-xs text-blue-900 font-medium">Select the file to import it into the system's local memory for offline use.</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search imported sounds..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sounds.length === 0 ? (
          <div className="bg-slate-100 rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center">
            <HardDrive size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No sounds imported yet</p>
            <p className="text-slate-400 text-xs mt-1">Follow the guide above to start</p>
          </div>
        ) : (
          filteredSounds.map(sound => (
            <div key={sound.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
              <div 
                onClick={() => previewSound(sound.blob)}
                className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 cursor-pointer"
              >
                <Play size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{sound.name}</h3>
                <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">{(sound.blob.size / 1024 / 1024).toFixed(2)} MB • LOCAL STORAGE</span>
              </div>
              <button onClick={() => handleDelete(sound.id)} className="text-slate-300 hover:text-red-500 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
        <p className="text-[11px] text-amber-800 font-medium leading-tight">
          <strong>Memory Optimization:</strong> Files are stored directly in your browser's local database. Clearing browser data will remove these sounds.
        </p>
      </div>
    </div>
  );
};

export default Library;
