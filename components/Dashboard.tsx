
import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldAlert, ShieldCheck, Cloud, RefreshCw } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { firebaseService } from '../services/firebaseService';
import { DeviceState, DeviceStatus } from '../types';

interface DashboardProps {
  isArmed: boolean; // Controlled by Firebase
  isUnlocked: boolean; // Local browser audio state
}

const Dashboard: React.FC<DashboardProps> = ({ isArmed, isUnlocked }) => {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [isUpdatingCloud, setIsUpdatingCloud] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const state = await databaseService.getDeviceState();
      setDevice(state);
    };
    fetchData();

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleMasterSwitch = async () => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.setMainSwitch(!isArmed);
    } finally {
      setIsUpdatingCloud(false);
    }
  };

  if (!device) return <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing System...</div>;

  const getStatusColor = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ACTIVE: return 'text-green-600 bg-green-100 border-green-200';
      case DeviceStatus.SLEEPING: return 'text-slate-500 bg-slate-100 border-slate-200';
      case DeviceStatus.WAKING: return 'text-amber-600 bg-amber-100 border-amber-200 animate-pulse';
      default: return 'text-slate-400';
    }
  };

  const formatPHTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="p-6 space-y-6 flex flex-col items-center">
      {/* Realtime Master Switch Banner */}
      <div 
        onClick={toggleMasterSwitch}
        className={`w-full p-6 rounded-[32px] border flex items-center justify-between transition-all duration-500 cursor-pointer select-none active:scale-[0.98] ${
          isArmed 
          ? 'bg-green-600 border-green-500 text-white shadow-xl shadow-green-200' 
          : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl backdrop-blur-md ${isArmed ? 'bg-white/20' : 'bg-slate-800'}`}>
            {isUpdatingCloud ? (
              <RefreshCw size={24} className="animate-spin" />
            ) : isArmed ? (
              <ShieldCheck size={24} className="animate-pulse" />
            ) : (
              <ShieldAlert size={24} />
            )}
          </div>
          <div>
            <h3 className="font-black text-[11px] uppercase tracking-widest opacity-80 mb-0.5">Master System Switch</h3>
            <p className="text-lg font-black tracking-tight leading-none">
              {isArmed ? 'SYSTEM ARMED' : 'SYSTEM DISARMED'}
            </p>
          </div>
        </div>
        <div className={`w-14 h-8 rounded-full relative transition-colors ${isArmed ? 'bg-white' : 'bg-slate-700'}`}>
          <div className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-300 ${isArmed ? 'left-7 bg-green-600' : 'left-1 bg-slate-500'}`} />
        </div>
      </div>

      {/* Cloud Connectivity Status */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200 self-start">
        <Cloud size={14} className={isArmed ? 'text-blue-500' : 'text-slate-400'} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Realtime Cloud Sync Active</span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-1" />
      </div>

      {/* System State Card */}
      <section className="w-full bg-white rounded-[32px] p-7 shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">Repeller Status</h2>
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
            <p className="text-sm font-black text-slate-800">
              {device.lastSyncTime ? formatPHTime(device.lastSyncTime) : 'N/A'}
            </p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <RefreshCw size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">Audio Output</span>
            </div>
            <p className="text-sm font-black text-slate-800 truncate">{device.lastSoundPlayed || 'None'}</p>
          </div>
        </div>
      </section>

      {/* Instructions for Unlocked State */}
      {!isUnlocked && (
        <div className="w-full bg-amber-50 border border-amber-100 rounded-3xl p-6 text-center">
          <ShieldAlert size={32} className="text-amber-600 mx-auto mb-3" />
          <h4 className="text-amber-800 font-black text-sm uppercase tracking-wider mb-2">Local Speaker Locked</h4>
          <p className="text-amber-700 text-xs leading-relaxed">
            Please refresh the page and tap "Unlock Speaker" to allow automated playback on this specific device.
          </p>
        </div>
      )}

      {/* Environmental Note */}
      <div className="text-center pt-8 opacity-40">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          Automated Pest Deterrence
        </p>
        <p className="text-[9px] text-slate-400 font-bold uppercase max-w-[200px] mx-auto leading-relaxed mt-2">
          System follows Philippine Standard Time (PST) logic for all scheduled triggers.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
