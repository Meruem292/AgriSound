
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
      {/* Connection Status Banner */}
      <div className={`w-full p-5 rounded-3xl border flex items-center justify-between transition-colors duration-500 ${isOnline ? 'bg-green-600 border-green-700 text-white shadow-lg shadow-green-200' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
            {isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
          </div>
          <div>
            <h3 className="font-black text-[10px] uppercase tracking-widest">{isOnline ? 'Cloud Linked' : 'Standalone'}</h3>
            <p className="text-[13px] text-white/95 font-bold">
              {isOnline ? 'Active Sync Enabled' : 'Local Logic Only'}
            </p>
          </div>
        </div>
        <div className="text-[10px] font-black bg-white/20 px-2 py-1.5 rounded-lg uppercase tracking-widest">
          v1.0.4
        </div>
      </div>

      {/* System State Card */}
      <section className="w-full bg-white rounded-[32px] p-7 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">System Operating State</h2>
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-[13px] font-black uppercase tracking-widest ${getStatusColor(device.status)}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${device.status === DeviceStatus.ACTIVE ? 'bg-green-600 animate-ping' : 'bg-current'}`} />
              {device.status}
            </div>
          </div>
          <Activity className="text-slate-200" size={32} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Clock size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">Last Trigger</span>
            </div>
            <p className="text-base font-black text-slate-800">
              {new Date(device.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <ShieldAlert size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">Audio Profile</span>
            </div>
            <p className="text-base font-black text-slate-800 truncate">{device.lastSoundPlayed || 'IDLE'}</p>
          </div>
        </div>
      </section>

      {/* Primary Control Button */}
      <section className="flex flex-col items-center justify-center space-y-8 pt-6 pb-12">
        <div className="relative">
           {/* Animated Outer Rings */}
           <div className={`absolute -inset-6 rounded-full border-2 border-green-500/10 ${device.status === DeviceStatus.ACTIVE ? 'animate-ping' : ''}`} />
           <div className={`absolute -inset-12 rounded-full border border-green-500/5 ${device.status === DeviceStatus.ACTIVE ? 'animate-[ping_3s_linear_infinite]' : ''}`} />
           
          <button
            onClick={handleManualPlay}
            disabled={device.status === DeviceStatus.WAKING || device.status === DeviceStatus.ACTIVE || isTriggering}
            className={`
              relative w-60 h-60 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-90
              ${device.status === DeviceStatus.ACTIVE || device.status === DeviceStatus.WAKING
                ? 'bg-green-600 text-white cursor-not-allowed scale-105' 
                : 'bg-white text-slate-900 border-[12px] border-green-500 hover:border-green-400 hover:bg-green-50'}
            `}
          >
            {isTriggering && (
               <div className="absolute inset-2 rounded-full border-[6px] border-green-600/10 border-t-green-600 animate-spin" />
            )}
            <Power size={64} className={device.status === DeviceStatus.ACTIVE ? 'animate-pulse' : 'text-green-600'} />
            <span className="mt-5 text-base font-black uppercase tracking-[0.15em]">
              {device.status === DeviceStatus.ACTIVE ? 'Broadcasting' : 'Trigger Now'}
            </span>
          </button>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] text-center">
            Manual Override Mode
          </p>
          <div className="h-1 w-12 bg-slate-200 rounded-full" />
          <p className="text-[10px] text-slate-400 font-bold uppercase text-center max-w-[240px] leading-relaxed">
            Unit will execute high-volume playback then return to deep sleep
          </p>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
