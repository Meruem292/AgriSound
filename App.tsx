
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Scheduler from './components/Scheduler';
import Library from './components/Library';
import Logs from './components/Logs';
import { databaseService } from './services/databaseService';
import { firebaseService } from './services/firebaseService';
import { supabaseService } from './services/supabaseService';
import { DeviceStatus, Schedule, SoundFile } from './types';
import { ShieldAlert, Zap } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLocallyUnlocked, setIsLocallyUnlocked] = useState(false);
  const [clientId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [isLeader, setIsLeader] = useState(false);
  const isLeaderRef = useRef(isLeader);
  
  // States synced with Firebase
  const [isDevicePowered, setIsDevicePowered] = useState(false);

  // Use refs to keep track of current state for the worker interval
  const devicePowerRef = useRef(isDevicePowered);
  const locallyUnlockedRef = useRef(isLocallyUnlocked);
  const lastManualTriggerRef = useRef<number>(0); // Initialize to 0 to catch pending triggers on load

  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  useEffect(() => {
    devicePowerRef.current = isDevicePowered;
  }, [isDevicePowered]);

  useEffect(() => {
    locallyUnlockedRef.current = isLocallyUnlocked;
  }, [isLocallyUnlocked]);

  useEffect(() => {
    const reconcileStorage = async () => {
      if (!isOnline) return;
      
      console.log("[AgriSound] Reconciling Cloud Storage...");
      try {
        const cloudFiles = await supabaseService.listSounds();
        
        // Get current firebase sounds to avoid duplicates
        // We'll use a one-time fetch here instead of the subscription for the reconciliation logic
        // But since we already have a subscription in the main useEffect, we can just wait for it to populate
        // Or better, just iterate and use saveSoundRemote which is idempotent if we derive the same ID
        
        for (const file of cloudFiles) {
          // Derive a consistent ID from the filename to prevent duplicates
          // If it's a standard AgriSound upload, it starts with timestamp-
          const id = file.name.split('.')[0].replace(/[^a-z0-9]/gi, '_');
          
          const sound: SoundFile = {
            id: id,
            name: file.name.split('-').slice(1).join('-').split('.')[0] || file.name.split('.')[0],
            fileName: file.name,
            url: file.url,
            tag: 'other',
            duration: 0
          };
          
          await firebaseService.saveSoundRemote(sound);
        }
        console.log("[AgriSound] Cloud Storage Reconciled.");
      } catch (err) {
        console.error("[AgriSound] Reconciliation failed:", err);
      }
    };

    if (isOnline) {
      reconcileStorage();
    }
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let unsubPower = () => {};
    let unsubScheds = () => {};
    let unsubSounds = () => {};
    let unsubManual = () => {};
    let unsubScheduledTriggers = () => {};

    const initializeSubscriptions = async () => {
      // Try to become leader immediately so playback works without waiting 5s
      const amLeader = await firebaseService.tryBecomeLeader(clientId);
      setIsLeader(amLeader);

      unsubPower();
      unsubScheds();
      unsubSounds();
      unsubManual();
      unsubScheduledTriggers();

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

      unsubManual = firebaseService.subscribeToManualTriggers(async (trigger) => {
        // Only the leader client should play audio to prevent echoing across tabs/devices
        // AND client must be unlocked (user interaction granted)
        if (!trigger || !locallyUnlockedRef.current || !isLeaderRef.current) return;
        
        // Track pending trigger for power management
        if ((trigger as any).scheduledPlayTimestamp) {
          (window as any)._pendingManualTrigger = trigger;
        }

        // Avoid re-playing old triggers or the same trigger multiple times
        // If it's a scheduled manual trigger, we only skip if it's already "expired" (e.g. played long ago)
        const now = Date.now();
        const triggerAge = now - trigger.timestamp;
        
        // If trigger is very old (> 5 mins) and not a future scheduled one, skip
        if (triggerAge > 300000 && !(trigger as any).scheduledPlayTimestamp) return;

        // Session-based deduplication
        if (trigger.timestamp <= lastManualTriggerRef.current) return;
        
        // If it's a future trigger, don't update the ref yet, wait until it plays
        // or just update it now to acknowledge we've "received" it.
        // Actually, if we update it now, we won't process it again if we refresh?
        // Let's use a "played" flag in the trigger object if we could, but we can't easily write to Firebase here without loops.
        // Let's just update the ref to acknowledge receipt.
        lastManualTriggerRef.current = trigger.timestamp;

        console.log(`[AgriSound] Received Manual Trigger${(trigger as any).scheduledPlayTimestamp ? ' (Scheduled)' : ''}: ${trigger.soundId}`);
        
        // Handle Scheduled Delay from API
        const delay = (trigger as any).scheduledPlayTimestamp ? (trigger as any).scheduledPlayTimestamp - now : 0;

        const executePlay = () => {
          // Clear pending state
          if ((window as any)._pendingManualTrigger?.timestamp === trigger.timestamp) {
            (window as any)._pendingManualTrigger = null;
          }

          // Check power exactly at execution time
          if (!devicePowerRef.current) {
            console.log("[AgriSound] Skipping execution - Device Power is OFF (User must have turned it off manually)");
            return;
          }
          console.log(`[AgriSound] Executing playback for ${trigger.soundId} after ${delay > 0 ? delay : 0}ms delay`);
          databaseService.performPlayback('manual', undefined, trigger.soundId);
        };

        if (delay > 0) {
          console.log(`[AgriSound] Playback scheduled in ${Math.round(delay/1000)}s...`);
          setTimeout(executePlay, delay);
        } else {
          executePlay();
        }
      });

      unsubScheduledTriggers = firebaseService.subscribeToScheduledTriggers(async (trigger) => {
        // Only the leader client should play audio
        if (!trigger || !locallyUnlockedRef.current || !isLeaderRef.current) return;

        // Use a ref to avoid re-playing the same scheduled trigger
        const lastTriggerTime = (window as any)._lastScheduledTriggerTime || 0;
        if (trigger.timestamp <= lastTriggerTime) return;
        (window as any)._lastScheduledTriggerTime = trigger.timestamp;

        console.log(`[AgriSound] Remote Scheduled Trigger (Leader): ${trigger.soundId} for schedule ${trigger.scheduleId}`);
        
        // Final power check before playback
        if (!devicePowerRef.current) {
          console.log("[AgriSound] Skipping scheduled trigger - Device Power is OFF");
          return;
        }

        // Play audio locally
        databaseService.performPlayback('scheduled', trigger.scheduleId, trigger.soundId);
      });
    };

    if (isOnline) {
      initializeSubscriptions();
    }

    // Main background worker for automated triggers and anticipatory power
    const workerInterval = setInterval(async () => {
      if (!isOnline) return;

      // Leader Election: Only one client should manage automation
      const amLeader = await firebaseService.tryBecomeLeader(clientId);
      setIsLeader(amLeader);
      
      if (!amLeader) {
        return;
      }

      await databaseService.ensureInit();
      const schedules = await databaseService.getSchedules();
      const deviceState = await databaseService.getDeviceState();
      const now = new Date();
      const nowMs = now.getTime();
      
      const timeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: "Asia/Manila",
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const currentHHmm = timeFormatter.format(now);
      
      const phDayString = now.toLocaleString("en-US", { timeZone: "Asia/Manila", weekday: 'long' });
      const daysMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const currentDay = daysMap[phDayString];

      // Anticipatory Logic: Look ahead
      let upcomingTrigger = false;
      
      // 1. Check Schedules
      const [nowHour, nowMin] = currentHHmm.split(':').map(Number);
      const nowTimeInMins = nowHour * 60 + nowMin;

      for (const s of schedules) {
        if (!s.isActive || !s.days.includes(currentDay)) continue;
        
        const [sHour, sMin] = s.time.split(':').map(Number);
        const sTimeInMins = sHour * 60 + sMin;
        
        // Handle day wrap-around
        let diff = sTimeInMins - nowTimeInMins;
        if (diff < -1400) diff += 1440; 
        
        if (diff === 1 || diff === 0 || (deviceState.status !== DeviceStatus.SLEEPING)) {
          upcomingTrigger = true;
          break;
        }
      }

      // 2. Check for Pending Manual Trigger from API
      if (!upcomingTrigger) {
        // We can't easily wait for the subscription here, but we can peek at the ref if we stored it
        // Or better, just check if the system is currently "active" or "waking"
        if (deviceState.status !== DeviceStatus.SLEEPING) {
          upcomingTrigger = true;
        } else {
          // Peek manual trigger if possible (using a global or shared state)
          const pendingTrigger = (window as any)._pendingManualTrigger;
          if (pendingTrigger && pendingTrigger.scheduledPlayTimestamp > nowMs && (pendingTrigger.scheduledPlayTimestamp - nowMs) < 60000) {
            upcomingTrigger = true;
          }
        }
      }

      // Automatically turn on if a schedule or manual trigger is approaching
      if (upcomingTrigger) {
        if (!devicePowerRef.current) {
          console.log("[AgriSound] Leader: Powering On Device for impending trigger");
          await firebaseService.setDevicePower(true);
        }
      } else {
        // Automatically turn off if no trigger is approaching
        if (devicePowerRef.current) {
          const lastPlaybackAge = nowMs - (deviceState.lastSyncTime || 0);
          const isSystemIdle = deviceState.status === DeviceStatus.SLEEPING;
          
          if (isSystemIdle && lastPlaybackAge > 5000) {
            console.log("[AgriSound] Leader: Powering Off Hardware (System Idle)");
            await firebaseService.setDevicePower(false);
          }
        }
      }

      // Playback Execution (Broadcast to all clients)
      for (const schedule of schedules) {
        if (!schedule.isActive || !schedule.days.includes(currentDay)) continue;
        
        const timeMatch = schedule.time === currentHHmm;
        const alreadyRan = (Date.now() - (schedule.lastRunTimestamp || 0)) < 61000;

        if (timeMatch && !alreadyRan) {
          const updated = { ...schedule, lastRunTimestamp: Date.now() };
          await databaseService.saveSchedule(updated);
          await firebaseService.saveScheduleRemote(updated);
          
          console.log(`[AgriSound] Leader: Broadcasting scheduled trigger: ${schedule.name}`);
          
          // Pick a sound and broadcast it
          const soundId = await databaseService.pickSoundForSchedule(schedule.id);
          if (soundId) {
            await firebaseService.triggerScheduledSound(soundId, schedule.id);
          }
        }
      }
    }, 5000); 
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubPower();
      unsubScheds();
      unsubSounds();
      unsubManual();
      unsubScheduledTriggers();
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
      case 'dashboard': return <Dashboard isDevicePowered={isDevicePowered} isUnlocked={isLocallyUnlocked} isLeader={isLeader} />;
      case 'scheduler': return <Scheduler />;
      case 'library': return <Library />;
      case 'logs': return <Logs />;
      default: return <Dashboard isDevicePowered={isDevicePowered} isUnlocked={isLocallyUnlocked} isLeader={isLeader} />;
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
