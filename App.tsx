
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Scheduler from './components/Scheduler';
import Library from './components/Library';
import Logs from './components/Logs';
import { databaseService } from './services/databaseService';
import { firebaseService } from './services/firebaseService';
import { DeviceStatus } from './types';
import { ShieldAlert, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Local "Armed" state (Browser audio engine unlocked)
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  
  // Remote "Master Switch" state from Firebase
  const [isMasterSwitchOn, setIsMasterSwitchOn] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // --- FIREBASE SYNC ---
    const unsubscribeFirebase = firebaseService.subscribeToMainSwitch((isOn) => {
      console.log(`[Firebase] Remote Switch updated: ${isOn ? 'ON' : 'OFF'}`);
      setIsMasterSwitchOn(isOn);
    });

    // --- AUTOMATED SCHEDULING WORKER ---
    const checkSchedules = async () => {
      // Logic requirement: 
      // 1. Browser must be unlocked (isLocallyUnlocked)
      // 2. Remote Master Switch must be ON (isMasterSwitchOn)
      if (!isLocallyUnlocked || !isMasterSwitchOn) return;

      try {
        await databaseService.ensureInit();
        const deviceState = await databaseService.getDeviceState();
        
        if (deviceState.status !== DeviceStatus.SLEEPING) return;

        const schedules = await databaseService.getSchedules();
        const now = new Date();
        
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: "Asia/Manila",
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const currentHHmm = timeFormatter.format(now);
        
        const phDayString = now.toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          weekday: 'long'
        });
        
        const daysMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        const currentDay = daysMap[phDayString];

        for (const schedule of schedules) {
          if (!schedule.isActive) continue;

          const timeMatch = schedule.time === currentHHmm;
          const dayMatch = schedule.days.includes(currentDay);
          
          const lastRunMs = schedule.lastRunTimestamp || 0;
          const msSinceLastRun = Date.now() - lastRunMs;
          const alreadyRanThisMinute = msSinceLastRun < 61000;

          if (timeMatch && dayMatch && !alreadyRanThisMinute) {
            console.log(`[AgriSound Worker] Match: ${schedule.name}`);
            const updatedSchedule = { ...schedule, lastRunTimestamp: Date.now() };
            await databaseService.saveSchedule(updatedSchedule);
            databaseService.performPlayback('scheduled', schedule.id);
          }
        }
      } catch (error) {
        console.error("[AgriSound Worker] Error:", error);
      }
    };

    const workerInterval = setInterval(checkSchedules, 10000); 
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeFirebase();
      clearInterval(workerInterval);
    };
  }, [isLocallyUnlocked, isMasterSwitchOn]);

  const armSystem = () => {
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    silentAudio.play().catch(() => {});
    setIsLocallyUnlocked(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard 
          isArmed={isMasterSwitchOn} 
          isUnlocked={isLocallyUnlocked} 
        />
      );
      case 'scheduler': return <Scheduler />;
      case 'library': return <Library />;
      case 'logs': return <Logs />;
      default: return <Dashboard isArmed={isMasterSwitchOn} isUnlocked={isLocallyUnlocked} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline}>
      {!isLocallyUnlocked && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
            <ShieldAlert size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Audio Locked</h1>
          <p className="text-slate-400 text-sm mb-12 max-w-[280px] leading-relaxed">
            Browsers require a user gesture to enable automated background audio. Tap to unlock the device speaker.
          </p>
          <button 
            onClick={armSystem}
            className="group relative w-full max-w-xs bg-green-600 hover:bg-green-500 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-green-900/40 active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Zap size={24} fill="currentColor" />
            Unlock Speaker
          </button>
          <p className="mt-6 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Local Interaction Required for Background Playback</p>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
