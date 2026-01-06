
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

  if (!device) return <div className="p-10 text-center text-slate-400">Initializing Core...</div>;

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
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-4">
        <img 
          src="agriSound.png" 
          alt="AgriSound Logo" 
          className="w-40 h-40 object-contain drop-shadow-md"
        />
      </div>

      {/* Connection Status Banner */}
      <div className={`w-full p-4 rounded-3xl border flex items-center justify-between transition-colors duration-500 ${isOnline ? 'bg-green-600 border-green-700 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest">{isOnline ? 'Cloud Linked' : 'Stand-Alone Mode'}</h3>
            <p className="text-[10px] text-white/70 font-bold uppercase">
              {isOnline ? 'Remote updates enabled' : 'Operating on local triggers'}
            </p>
          </div>
        </div>
      </div>

      {/* System State Card */}
      <section className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Device Status</h2>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-bold ${getStatusColor(device.status)}`}>
              <div className={`w-2 h-2 rounded-full ${device.status === DeviceStatus.ACTIVE ? 'bg-green-600 animate-ping' : 'bg-current'}`} />
              {device.status}
            </div>
          </div>
          <Activity className="text-slate-200" size={32} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase tracking-tighter">Last Sync</span>
            </div>
            <p className="text-sm font-black text-slate-800">
              {new Date(device.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <ShieldAlert size={16} />
              <span className="text-xs font-semibold uppercase tracking-tighter">Broadcast</span>
            </div>
            <p className="text-sm font-black text-slate-800 truncate">{device.lastSoundPlayed}</p>
          </div>
        </div>
      </section>

      {/* Primary Control Button */}
      <section className="flex flex-col items-center justify-center space-y-4 pt-6">
        <button
          onClick={handleManualPlay}
          disabled={device.status === DeviceStatus.WAKING || device.status === DeviceStatus.ACTIVE || isTriggering}
          className={`
            relative w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-95
            ${device.status === DeviceStatus.ACTIVE || device.status === DeviceStatus.WAKING
              ? 'bg-green-600 text-white cursor-not-allowed scale-105' 
              : 'bg-white text-slate-900 border-8 border-green-500 hover:bg-green-50'}
          `}
        >
          {isTriggering && (
             <div className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          )}
          <Power size={64} className={device.status === DeviceStatus.ACTIVE ? 'animate-pulse' : ''} />
          <span className="mt-4 text-lg font-black uppercase tracking-tighter">
            {device.status === DeviceStatus.ACTIVE ? 'Broadcasting...' : 'Play Now'}
          </span>
        </button>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
          Manual wake-up triggers immediate playback<br/>and returns to sleep after completion
        </p>
      </section>
    </div>
  );
};

export default Dashboard;
