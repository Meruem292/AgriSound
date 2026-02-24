
import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldAlert, ShieldCheck, Cloud, RefreshCw, Play, Music, Database, Power, Zap, WifiOff } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { firebaseService } from '../services/firebaseService';
import { DeviceState, DeviceStatus, SoundFile } from '../types';

interface DashboardProps {
  isArmed: boolean;
  isDevicePowered: boolean;
  isUnlocked: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isArmed, isDevicePowered, isUnlocked }) => {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [isUpdatingCloud, setIsUpdatingCloud] = useState(false);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const state = await databaseService.getDeviceState();
      setDevice(state);
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);

    const unsubSounds = firebaseService.subscribeToSounds((remoteSounds) => {
      setSounds(remoteSounds);
    });

    return () => {
      clearInterval(interval);
      unsubSounds();
    };
  }, []);

  const toggleMasterSwitch = async () => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.setMainSwitch(!isArmed);
    } catch (err) {
      console.error("Toggle Master Switch failed:", err);
    } finally {
      setIsUpdatingCloud(false);
    }
  };

  const toggleDevicePower = async () => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.setDevicePower(!isDevicePowered);
    } catch (err) {
      console.error("Toggle Device Power failed:", err);
    } finally {
      setIsUpdatingCloud(false);
    }
  };

  const quickTrigger = async (sound: SoundFile) => {
    if (!isUnlocked) {
      alert("Please unlock the speaker first.");
      return;
    }
    if (!isDevicePowered) {
      alert("Device is Powered Off. Automatic and Manual triggers are disabled until power is restored.");
      return;
    }
    setActivePlaybackId(sound.id);
    
    const audio = new Audio(sound.url);
    audio.crossOrigin = "anonymous";
    
    audio.onplay = () => {
      databaseService.addLog({
        timestamp: Date.now(),
        soundName: sound.name,
        triggerType: 'manual',
        status: 'success'
      });
    };

    audio.onended = () => setActivePlaybackId(null);
    audio.onerror = () => setActivePlaybackId(null);

    try {
      await audio.play();
    } catch (e) {
      console.error("Quick trigger failed", e);
      setActivePlaybackId(null);
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
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="space-y-8 py-6 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Field Dashboard</h1>
          <p className="text-slate-500 font-medium">Remote Asset Monitoring & Control</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Database size={14} className="text-green-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{sounds.length} Synced Files</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Cloud size={14} className={isArmed ? 'text-blue-500' : 'text-slate-300'} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Sync</span>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Power Button */}
        <div 
          onClick={toggleDevicePower}
          className={`group p-8 rounded-[48px] border-2 flex flex-col justify-between transition-all duration-500 cursor-pointer select-none active:scale-[0.96] h-full ${
            isDevicePowered 
            ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-200' 
            : 'bg-white border-slate-100 text-slate-400'
          }`}
        >
          <div className="flex justify-between items-start mb-12">
            <div className={`p-5 rounded-3xl backdrop-blur-md transition-all ${isDevicePowered ? 'bg-white/20' : 'bg-slate-100'}`}>
              <Power size={36} className={isDevicePowered ? 'animate-pulse' : ''} />
            </div>
            {isUpdatingCloud && <RefreshCw size={24} className="animate-spin opacity-40" />}
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-70 mb-2">Main Hardware Power</h3>
            <p className="text-4xl font-black tracking-tighter leading-none">
              {isDevicePowered ? 'POWERED ON' : 'POWERED OFF'}
            </p>
            <p className="text-[10px] font-bold opacity-60 mt-4 leading-relaxed">
              {isDevicePowered ? 'Hardware active. Ready for triggers.' : 'Hardware disabled. Triggers will not fire.'}
            </p>
          </div>
        </div>

        {/* Master Arming Switch */}
        <div 
          onClick={toggleMasterSwitch}
          className={`group p-8 rounded-[48px] border-2 flex flex-col justify-between transition-all duration-500 cursor-pointer select-none active:scale-[0.96] h-full ${
            isArmed 
            ? 'bg-green-600 border-green-500 text-white shadow-2xl shadow-green-200' 
            : 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-200'
          }`}
        >
          <div className="flex justify-between items-start mb-12">
            <div className={`p-5 rounded-3xl backdrop-blur-md transition-all ${isArmed ? 'bg-white/20' : 'bg-slate-800'}`}>
              {isArmed ? <ShieldCheck size={36} className="animate-pulse" /> : <ShieldAlert size={36} />}
            </div>
            <div className={`w-18 h-10 rounded-full relative border-2 p-1 transition-all ${isArmed ? 'bg-white border-white' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`w-7 h-7 rounded-full transition-all duration-300 shadow-sm ${isArmed ? 'translate-x-8 bg-green-600' : 'translate-x-0 bg-slate-500'}`} />
            </div>
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-70 mb-2">Automated Field Defense</h3>
            <p className="text-4xl font-black tracking-tighter leading-none">
              {isArmed ? 'SYSTEM ARMED' : 'SYSTEM DISARMED'}
            </p>
            <p className="text-[10px] font-bold opacity-60 mt-4 leading-relaxed">
              {isArmed ? 'Armed for cloud schedules.' : 'Manual override active. Schedules paused.'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Warning if Cloud is disconnected */}
      {!isArmed && !isDevicePowered && isUpdatingCloud && (
        <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-6 flex items-center gap-5 shadow-sm animate-pulse">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-[20px] flex items-center justify-center shrink-0">
            <WifiOff size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-red-900">Cloud Link Failed</h4>
            <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider leading-relaxed opacity-80">
              The system is failing to reach Firebase. Please check your internet connection and API configuration.
            </p>
          </div>
        </div>
      )}

      {/* Smart Anticipation Notification */}
      <div className="bg-amber-50 border-2 border-amber-100 rounded-[32px] p-6 flex items-center gap-5 shadow-sm">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-[20px] flex items-center justify-center shrink-0">
          <Zap size={24} fill="currentColor" />
        </div>
        <div className="space-y-1">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-900">Proactive Power Management</h4>
          <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider leading-relaxed opacity-80">
            System automatically Arms and Powers On 1 minute before scheduled field events to ensure peak readiness.
          </p>
        </div>
      </div>

      {/* System Status Metrics */}
      <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Hardware Telemetry</h2>
            <div className={`inline-flex items-center gap-4 px-8 py-3 rounded-full border-2 text-sm font-black uppercase tracking-widest ${getStatusColor(device.status)}`}>
              <div className={`w-4 h-4 rounded-full ${device.status === DeviceStatus.ACTIVE ? 'bg-green-600 animate-ping' : 'bg-current'}`} />
              {device.status}
            </div>
          </div>
          <Activity className="text-slate-50 hidden lg:block" size={120} />
          
          <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 min-w-[160px]">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-3">Last Sync Time</span>
              <p className="text-xl font-black text-slate-900">{device.lastSyncTime ? formatPHTime(device.lastSyncTime) : '--:--'}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 min-w-[160px]">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-3">Current Call</span>
              <p className="text-xl font-black text-slate-900 truncate">{device.lastSoundPlayed || 'None'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Fire Arsenal - Updated for accessibility */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Manual Call Library</h2>
          <span className="text-[9px] font-bold text-slate-300 uppercase">Scroll horizontally</span>
        </div>
        {sounds.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[40px] p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
            Audio vault empty. Sync assets in the library tab.
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-8 pt-2 custom-scrollbar snap-x px-2">
            {sounds.map(sound => (
              <button
                key={sound.id}
                onClick={() => quickTrigger(sound)}
                disabled={activePlaybackId !== null}
                className={`flex-none w-44 h-52 rounded-[40px] p-7 flex flex-col justify-between items-center text-center transition-all snap-start border-2 ${
                  activePlaybackId === sound.id
                  ? 'bg-green-600 border-green-500 text-white shadow-2xl scale-95'
                  : 'bg-white border-slate-100 text-slate-900 hover:border-green-300 active:scale-90'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${activePlaybackId === sound.id ? 'bg-white/20' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
                  {activePlaybackId === sound.id ? <RefreshCw size={28} className="animate-spin" /> : <Play size={28} fill="currentColor" />}
                </div>
                <h4 className="font-black text-[11px] uppercase tracking-tighter leading-tight line-clamp-2">{sound.name}</h4>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Connection Indicator Footer */}
      <div className="pt-10 pb-24 text-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Secure Precision Interface • AgriSound v2.2
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
