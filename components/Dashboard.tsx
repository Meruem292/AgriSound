
import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldAlert, ShieldCheck, Cloud, RefreshCw, Play, Music, Database, Power, Zap, WifiOff, Bird, Settings, CheckCircle2, Copy, CheckCheck, Terminal } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { firebaseService } from '../services/firebaseService';
import { DeviceState, DeviceStatus, SoundFile, SystemSettings } from '../types';

interface DashboardProps {
  isDevicePowered: boolean;
  isUnlocked: boolean;
  isLeader: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isDevicePowered, isUnlocked, isLeader }) => {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [isUpdatingCloud, setIsUpdatingCloud] = useState(false);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({ detectionSoundId: '', isDetectionEnabled: false });
  const [copied, setCopied] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

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

    const unsubSettings = firebaseService.subscribeToSystemSettings((remoteSettings) => {
      setSettings(remoteSettings);
    });

    const unsubManual = firebaseService.subscribeToManualTriggers((trigger) => {
      if (trigger) {
        setActivePlaybackId(trigger.soundId);
        setTimeout(() => setActivePlaybackId(null), 5000);
      }
    });

    return () => {
      clearInterval(interval);
      unsubSounds();
      unsubSettings();
      unsubManual();
    };
  }, []);

  const copyToClipboard = () => {
    const url = "https://agri-sound.vercel.app/api/detect";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const testTrigger = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      // Test the local endpoint first to prove it works in the current environment
      const response = await fetch('/api/detect');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: "Could not connect to API" });
    } finally {
      setTestLoading(false);
      setTimeout(() => setTestResult(null), 5000);
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

  const toggleRandomTrigger = async () => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.updateSystemSettings({ apiTrigger: !settings.apiTrigger });
    } finally {
      setIsUpdatingCloud(false);
    }
  };

  const updateDetectionSound = async (soundId: string) => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.updateSystemSettings({ detectionSoundId: soundId });
    } finally {
      setIsUpdatingCloud(false);
    }
  };

  const toggleDetection = async () => {
    setIsUpdatingCloud(true);
    try {
      await firebaseService.updateSystemSettings({ isDetectionEnabled: !settings.isDetectionEnabled });
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
    
    try {
      await firebaseService.triggerManualSound(sound.id);
    } catch (e) {
      console.error("Quick trigger failed", e);
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
            <Cloud size={14} className={isDevicePowered ? 'text-blue-500' : 'text-slate-300'} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Sync</span>
          </div>
          {isLeader && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-2xl shadow-sm border border-amber-100">
              <Zap size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Automation Leader</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="grid grid-cols-1 gap-6">
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
      </div>

      {/* Error Warning if Cloud is disconnected */}
      {!isDevicePowered && isUpdatingCloud && (
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
            System automatically Powers On 1 minute before scheduled events and Powers Off 5 seconds after playback ends.
          </p>
        </div>
      </div>

      {/* Bird Detection Settings */}
      <section className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">AI Vision Config</h2>
            <div className="flex items-center gap-6">
              <div 
                onClick={toggleDetection}
                className={`w-20 h-10 rounded-full relative cursor-pointer transition-all duration-300 p-1 border-2 ${
                  settings.isDetectionEnabled ? 'bg-green-600 border-green-500' : 'bg-slate-200 border-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transition-all duration-300 ${settings.isDetectionEnabled ? 'translate-x-10' : 'translate-x-0'}`} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Bird Detection Response</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Automatic alarm on visual detection</p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full space-y-6">
            <div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Response Sound Selection</h4>
              <div className="relative group">
                <select 
                  value={settings.detectionSoundId}
                  onChange={(e) => updateDetectionSound(e.target.value)}
                  disabled={settings.apiTrigger}
                  className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-tight appearance-none cursor-pointer hover:border-blue-300 transition-all focus:outline-none focus:ring-0 ${settings.apiTrigger ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <option value="">Select an Alarm Sound</option>
                  {sounds.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <Settings className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Music size={16} className="text-blue-500" />
                <div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">API Random Playback</h4>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Play random sound from library</p>
                </div>
              </div>
              <div 
                onClick={toggleRandomTrigger}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 p-0.5 border ${
                  settings.apiTrigger ? 'bg-blue-600 border-blue-500' : 'bg-slate-200 border-slate-100'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-300 ${settings.apiTrigger ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-3xl border-2 transition-all ${settings.isDetectionEnabled ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-50 text-slate-300'}`}>
            <Bird size={32} />
          </div>
        </div>

        {/* API Info */}
        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Terminal size={14} className="text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Raspberry Pi Integration</h4>
          </div>
          
          <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-tight">External Trigger Endpoint</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Send a GET or POST request from your Pi's AI software</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={testTrigger}
                    disabled={testLoading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      testResult 
                      ? (testResult.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                    } disabled:opacity-50`}
                  >
                    {testLoading ? 'Testing...' : (testResult ? (testResult.success ? 'Success!' : 'Failed') : 'Test Now')}
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      copied 
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCheck size={14} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 font-mono text-[11px] text-blue-400 break-all flex items-center gap-3">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-black text-[9px] border border-blue-400/20">GET / POST</span>
                <span className="opacity-90">https://agri-sound.vercel.app/api/detect</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Simple Call (Browser/Python)</p>
                  <code className="block bg-black/20 p-4 rounded-xl text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-nowrap border border-white/5">
                    requests.get("https://agri-sound.vercel.app/api/detect")
                  </code>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">Terminal (cURL)</p>
                  <code className="block bg-black/20 p-4 rounded-xl text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-nowrap border border-white/5">
                    curl "https://agri-sound.vercel.app/api/detect"
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
