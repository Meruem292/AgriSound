
import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldAlert, ShieldCheck, Cloud, RefreshCw } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { firebaseService } from '../services/firebaseService';
import { DeviceState, DeviceStatus } from '../types';

interface DashboardProps {
  isArmed: boolean;
  isUnlocked: boolean;
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
      case DeviceStatus.ACTIVE: return 'text-green-600 bg-green-50 border-green-200';
      case DeviceStatus.SLEEPING: return 'text-slate-500 bg-slate-50 border-slate-200';
      case DeviceStatus.WAKING: return 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse';
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
    <div className="space-y-8 py-6">
      {/* Top Welcome / Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 font-medium">Real-time Field Operations</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Cloud size={16} className={isArmed ? 'text-blue-500' : 'text-slate-300'} />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Live Cloud Sync</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Master Switch Section */}
        <div 
          onClick={toggleMasterSwitch}
          className={`group p-8 rounded-[40px] border flex flex-col justify-between transition-all duration-500 cursor-pointer select-none active:scale-[0.98] h-full ${
            isArmed 
            ? 'bg-green-600 border-green-500 text-white shadow-2xl shadow-green-200' 
            : 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-200'
          }`}
        >
          <div className="flex justify-between items-start mb-12">
            <div className={`p-4 rounded-3xl backdrop-blur-md transition-transform group-hover:scale-110 ${isArmed ? 'bg-white/20' : 'bg-slate-800'}`}>
              {isUpdatingCloud ? (
                <RefreshCw size={32} className="animate-spin" />
              ) : isArmed ? (
                <ShieldCheck size={32} className="animate-pulse" />
              ) : (
                <ShieldAlert size={32} />
              )}
            </div>
            <div className={`w-16 h-9 rounded-full relative transition-colors border-2 ${isArmed ? 'bg-white border-white' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-300 ${isArmed ? 'left-8 bg-green-600' : 'left-1 bg-slate-500'}`} />
            </div>
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] opacity-70 mb-2">Master System Control</h3>
            <p className="text-3xl font-black tracking-tight leading-none">
              {isArmed ? 'SYSTEM ARMED' : 'SYSTEM DISARMED'}
            </p>
            <p className="text-[11px] font-bold opacity-60 mt-4 leading-relaxed">
              {isArmed ? 'Device is actively listening for scheduled cloud events.' : 'All automated triggers are currently suppressed.'}
            </p>
          </div>
        </div>

        {/* Repeller Status Card */}
        <section className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mb-3">Unit Hardware Status</h2>
              <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-sm font-black uppercase tracking-widest ${getStatusColor(device.status)}`}>
                <div className={`w-3 h-3 rounded-full ${device.status === DeviceStatus.ACTIVE ? 'bg-green-600 animate-ping' : 'bg-current'}`} />
                {device.status}
              </div>
            </div>
            <Activity className="text-slate-100" size={48} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Clock size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Last Run</span>
              </div>
              <p className="text-base font-black text-slate-900">
                {device.lastSyncTime ? formatPHTime(device.lastSyncTime) : '--:--'}
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <RefreshCw size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Sound</span>
              </div>
              <p className="text-base font-black text-slate-900 truncate">{device.lastSoundPlayed || 'Standby'}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Local Lock Warning */}
      {!isUnlocked && (
        <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl">
            <ShieldAlert size={32} />
          </div>
          <div className="text-center md:text-left">
            <h4 className="text-amber-900 font-black text-lg uppercase tracking-tight mb-1">Speaker Permissions Locked</h4>
            <p className="text-amber-800 text-sm leading-relaxed max-w-md">
              Automated playback is blocked by your browser. Please refresh and tap the <strong>Unlock Speaker</strong> button to permit background operation.
            </p>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center md:text-left border-t border-slate-100 pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Precision Agri-Tech Control
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-sm">
            Units synchronize with PH Standard Time (UTC+8) to ensure peak field protection during sunrise/sunset cycles.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
