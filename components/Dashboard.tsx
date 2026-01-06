
import React, { useState, useEffect } from 'react';
import { Power, Activity, Clock, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { DeviceState, DeviceStatus } from '../types';

const Dashboard: React.FC = () => {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const fetchData = async () => {
      const state = await databaseService.getDeviceState();
      setDevice(state);
    };
    fetchData();

    const handleConn = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleConn);
    window.addEventListener('offline', handleConn);

    const interval = setInterval(fetchData, 2000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleConn);
      window.removeEventListener('offline', handleConn);
    };
  }, []);

  const handleManualPlay = async () => {
    setIsTriggering(true);
    await databaseService.triggerManualPlay();
    setIsTriggering(false);
  };

  if (!device) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing System...</div>;

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ACTIVE: return 'text-green-600 bg-green-100 border-green-200';
      case DeviceStatus.SLEEPING: return 'text-slate-500 bg-slate-100 border-slate-200';
      case DeviceStatus.WAKING: return 'text-amber-600 bg-amber-100 border-amber-200 animate-pulse';
      case DeviceStatus.OFFLINE: return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="p-6 space-y-6 flex flex-col items-center">
      {/* Hero Logo Section */}
      <div className="w-full flex flex-col items-center justify-center pt-4 pb-2">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <img 
            src="./agriSound.png" 
            alt="AgriSound Logo" 
            className="relative w-48 h-48 object-contain drop-shadow-xl"
            onError={(e) => {
               // Fallback if image doesn't exist
               const target = e.target as HTMLImageElement;
               target.style.display = 'none';
               const parent = target.parentElement;
               if (parent && !parent.querySelector('.hero-fallback')) {
                 const fallback = document.createElement('div');
                 fallback.className = 'hero-fallback relative w-48 h-48 bg-white border-8 border-green-600 rounded-full flex flex-col items-center justify-center shadow-xl';
                 fallback.innerHTML = '<span class="text-green-600 font-black text-2xl tracking-tighter">AGRI</span><span class="text-green-800 font-black text-2xl tracking-tighter">SOUND</span>';
                 parent.appendChild(fallback);
               }
            }}
          />
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className={`w-full p-4 rounded-3xl border flex items-center justify-between transition-colors duration-500 ${isOnline ? 'bg-green-600 border-green-700 text-white shadow-lg shadow-green-200' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-widest">{isOnline ? 'Network Linked' : 'Offline Mode'}</h3>
            <p className="text-[12px] text-white/90 font-bold">
              {isOnline ? 'Syncing with cloud' : 'Operating locally'}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-md uppercase tracking-tighter">
          v1.0.4
        </div>
      </div>

      {/* System State Card */}
      <section className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1.5">Current Operating Mode</h2>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-black uppercase tracking-wider ${getStatusColor(device.status)}`}>
              <div className={`w-2 h-2 rounded-full ${device.status === DeviceStatus.ACTIVE ? 'bg-green-600 animate-ping' : 'bg-current'}`} />
              {device.status}
            </div>
          </div>
          <Activity className="text-slate-200" size={28} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1.5">
              <Clock size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Last Activity</span>
            </div>
            <p className="text-sm font-black text-slate-800">
              {new Date(device.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1.5">
              <ShieldAlert size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Active Sound</span>
            </div>
            <p className="text-sm font-black text-slate-800 truncate">{device.lastSoundPlayed || 'Silent'}</p>
          </div>
        </div>
      </section>

      {/* Primary Control Button */}
      <section className="flex flex-col items-center justify-center space-y-6 pt-4 pb-8">
        <button
          onClick={handleManualPlay}
          disabled={device.status === DeviceStatus.WAKING || device.status === DeviceStatus.ACTIVE || isTriggering}
          className={`
            relative w-52 h-52 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-90
            ${device.status === DeviceStatus.ACTIVE || device.status === DeviceStatus.WAKING
              ? 'bg-green-600 text-white cursor-not-allowed scale-105' 
              : 'bg-white text-slate-900 border-[10px] border-green-500 hover:border-green-400 hover:bg-green-50'}
          `}
        >
          <div className={`absolute inset-0 rounded-full border-4 border-dashed border-green-200/50 ${device.status === DeviceStatus.ACTIVE ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
          {isTriggering && (
             <div className="absolute inset-2 rounded-full border-4 border-green-600/20 border-t-green-600 animate-spin" />
          )}
          <Power size={56} className={device.status === DeviceStatus.ACTIVE ? 'animate-pulse' : 'text-green-600'} />
          <span className="mt-4 text-sm font-black uppercase tracking-widest">
            {device.status === DeviceStatus.ACTIVE ? 'Broadcasting' : 'Trigger Now'}
          </span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
            Manual Override Mode
          </p>
          <p className="text-[9px] text-slate-300 font-bold uppercase text-center max-w-[200px]">
            Device will return to deep sleep after playback is completed
          </p>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
