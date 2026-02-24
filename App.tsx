
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Scheduler from './components/Scheduler';
import Library from './components/Library';
import Logs from './components/Logs';
import { databaseService } from './services/databaseService';
import { firebaseService } from './services/firebaseService';
import { DeviceStatus, Schedule } from './types';
import { ShieldAlert, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  
  // States synced with Firebase
  const [isMasterSwitchOn, setIsMasterSwitchOn] = useState(false);
  const [isDevicePowered, setIsDevicePowered] = useState(false);

  // Use refs to keep track of current state for the worker interval
  const masterSwitchRef = useRef(isMasterSwitchOn);
  const devicePowerRef = useRef(isDevicePowered);
  const locallyUnlockedRef = useRef(isLocallyUnlocked);

  useEffect(() => {
    masterSwitchRef.current = isMasterSwitchOn;
  }, [isMasterSwitchOn]);

  useEffect(() => {
    devicePowerRef.current = isDevicePowered;
  }, [isDevicePowered]);

  useEffect(() => {
    locallyUnlockedRef.current = isLocallyUnlocked;
  }, [isLocallyUnlocked]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let unsubSwitch = () => {};
    let unsubPower = () => {};
    let unsubScheds = () => {};
    let unsubSounds = () => {};

    const initializeSubscriptions = () => {
      unsubSwitch();
      unsubPower();
      unsubScheds();
      unsubSounds();

      unsubSwitch = firebaseService.subscribeToMainSwitch(setIsMasterSwitchOn);
      unsubPower = firebaseService.subscribeToDevicePower(setIsDevicePowered);
      unsubScheds = firebaseService.subscribeToSchedules(async (remoteSchedules) => {
        await databaseService.ensureInit();
        const localSchedules = await databaseService.getSchedules();
        const remoteIds = remoteSchedules.map(s => s.id);

        for (const local of localSchedules) {
          if (!remoteIds.includes(local.id)) {
            await databaseService.deleteSchedule(local.id);
          }
        }

        for (const sched of remoteSchedules) {
          await databaseService.saveSchedule(sched);
        }
      });
      unsubSounds = firebaseService.subscribeToSounds(async (remoteSounds) => {
        await databaseService.ensureInit();
        // Get current local sounds to check for deletions
        const localSounds = await databaseService.getSounds();
        const remoteIds = remoteSounds.map(s => s.id);
        
        // Delete local sounds that are no longer in remote
        for (const local of localSounds) {
          if (!remoteIds.includes(local.id)) {
            await databaseService.deleteSound(local.id);
          }
        }

        // Save/Update remote sounds locally
        for (const sound of remoteSounds) {
          await databaseService.addSound(sound);
        }
      });
    };

    if (isOnline) {
      initializeSubscriptions();
    }

    // Main background worker for automated triggers and anticipatory power
    const workerInterval = setInterval(async () => {
      await databaseService.ensureInit();
      const schedules = await databaseService.getSchedules();
      const now = new Date();
      
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: "Asia/Manila",
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const currentHHmm = timeFormatter.format(now);
      
      const phDayString = now.toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: 'long' });
      const daysMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const currentDay = daysMap[phDayString];

      // Anticipatory Logic: Look 5 minutes ahead (window check)
      let upcomingTrigger = false;
      const nowTimeInMins = now.getHours() * 60 + now.getMinutes();

      for (const s of schedules) {
        if (!s.isActive || !s.days.includes(currentDay)) continue;
        
        const [sHour, sMin] = s.time.split(':').map(Number);
        const sTimeInMins = sHour * 60 + sMin;
        const diff = sTimeInMins - nowTimeInMins;

        // If a schedule is starting in the next 1 to 5 minutes
        if (diff > 0 && diff <= 5) {
          upcomingTrigger = true;
          break;
        }
      }

      // Automatically turn on if a schedule is approaching
      if (upcomingTrigger) {
        if (!masterSwitchRef.current) {
          console.log("[AgriSound] Anticipatory: Arming Master Switch");
          await firebaseService.setMainSwitch(true);
        }
        if (!devicePowerRef.current) {
          console.log("[AgriSound] Anticipatory: Powering On Device");
          await firebaseService.setDevicePower(true);
        }
      }

      // Playback Execution
      if (locallyUnlockedRef.current && masterSwitchRef.current && devicePowerRef.current) {
        for (const schedule of schedules) {
          if (!schedule.isActive || !schedule.days.includes(currentDay)) continue;
          
          const timeMatch = schedule.time === currentHHmm;
          const alreadyRan = (Date.now() - (schedule.lastRunTimestamp || 0)) < 61000;

          if (timeMatch && !alreadyRan) {
            const updated = { ...schedule, lastRunTimestamp: Date.now() };
            await databaseService.saveSchedule(updated);
            await firebaseService.saveScheduleRemote(updated);
            
            console.log(`[AgriSound] Executing scheduled trigger: ${schedule.name}`);
            databaseService.performPlayback('scheduled', schedule.id);
          }
        }
      }
    }, 10000); 
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSwitch();
      unsubPower();
      unsubScheds();
      unsubSounds();
      clearInterval(workerInterval);
    };
  }, [isOnline]); // Depend on online status to re-init subscriptions if needed

  const armSystem = () => {
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    silentAudio.play().then(() => {
      setIsLocallyUnlocked(true);
    }).catch((e) => {
      console.warn("Unlock failed, browser still blocking", e);
      setIsLocallyUnlocked(true); // Still set to true to try anyway
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard isArmed={isMasterSwitchOn} isDevicePowered={isDevicePowered} isUnlocked={isLocallyUnlocked} />;
      case 'scheduler': return <Scheduler />;
      case 'library': return <Library />;
      case 'logs': return <Logs />;
      default: return <Dashboard isArmed={isMasterSwitchOn} isDevicePowered={isDevicePowered} isUnlocked={isLocallyUnlocked} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline}>
      {!isLocallyUnlocked && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
            <ShieldAlert size={48} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Field Audio Locked</h1>
          <p className="text-slate-400 text-sm mb-12 max-w-[280px] leading-relaxed">
            Browsers block automated audio until you interact. Tap to grant <strong>AgriSound</strong> speaker permissions.
          </p>
          <button onClick={armSystem} className="group relative w-full max-w-xs bg-green-600 hover:bg-green-500 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
            <Zap size={24} fill="currentColor" /> Unlock Field Speaker
          </button>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default App;
