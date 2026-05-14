
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database, remove } from 'firebase/database';
import { Schedule, SoundFile, SystemSettings } from '../types';

/**
 * Robust environment variable retrieval for both local and cloud environments.
 */
const getEnv = (key: string): string | undefined => {
  // 1. Try process.env (Node.js / Vercel)
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key] || process.env[`VITE_${key}`] || process.env[`NEXT_PUBLIC_${key}`];
    if (val) return val;
  }

  // 2. Try import.meta.env (Vite)
  try {
    // @ts-ignore
    const env = import.meta.env;
    if (env) {
      const val = env[key] || env[`VITE_${key}`] || env[`NEXT_PUBLIC_${key}`];
      if (val) return val;
    }
  } catch (e) {
    // import.meta might not be available in some environments
  }

  // 3. Last ditch: Case-insensitive search in process.env
  if (typeof process !== 'undefined' && process.env) {
    const upperKey = key.toUpperCase();
    for (const k in process.env) {
      if (k.toUpperCase().endsWith(upperKey)) {
        return process.env[k];
      }
    }
  }

  return undefined;
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;

const initFirebase = (): FirebaseApp | null => {
  if (appInstance) return appInstance;
  
  const config = {
    apiKey: getEnv('FIREBASE_API_KEY'),
    authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
    databaseURL: getEnv('FIREBASE_DATABASE_URL'),
    projectId: getEnv('FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('FIREBASE_APP_ID')
  };

  if (!config.apiKey || !config.databaseURL) {
    console.error("Firebase Config Missing. Keys checked:", Object.keys(config).filter(k => !(config as any)[k]));
    console.log("Current Environment Check:");
    console.log("- FIREBASE_API_KEY available:", !!getEnv('FIREBASE_API_KEY'));
    console.log("- FIREBASE_DATABASE_URL available:", !!getEnv('FIREBASE_DATABASE_URL'));
    return null;
  }

  try {
    appInstance = !getApps().length ? initializeApp(config) : getApp();
    return appInstance;
  } catch (err) {
    console.error("Firebase init error:", err);
    return null;
  }
};

const getDb = (): Database | null => {
  if (dbInstance) return dbInstance;
  const app = initFirebase();
  if (!app) return null;
  
  const dbUrl = getEnv('FIREBASE_DATABASE_URL');
  try {
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    console.error("Database connection error:", err);
    return null;
  }
};

const notifyMissingConfig = (action: string) => {
  const msg = `FIREBASE CONFIGURATION ERROR:\n\nCannot ${action}. The app could not find your Firebase credentials.\n\nPlease ensure your dashboard has:\n- VITE_FIREBASE_API_KEY\n- VITE_FIREBASE_DATABASE_URL\n...and other required keys.`;
  console.error(msg);
  // We avoid alert() here to prevent spamming, but log to console
};

export const firebaseService = {
  subscribeToMainSwitch: (callback: (isOn: boolean) => void) => {
    const db = getDb();
    if (!db) {
      notifyMissingConfig('subscribe to Main Switch');
      return () => {};
    }
    const switchRef = ref(db, 'system/mainSwitch');
    onValue(switchRef, (snapshot) => {
      callback(snapshot.val() === true);
    });
    return () => off(switchRef);
  },
  
  setMainSwitch: async (isOn: boolean) => {
    const db = getDb();
    if (!db) {
      console.error("Firebase not connected. Cannot toggle Main Switch.");
      return;
    }
    await set(ref(db, 'system/mainSwitch'), isOn);
  },

  subscribeToDevicePower: (callback: (isPowered: boolean) => void) => {
    const db = getDb();
    if (!db) {
      notifyMissingConfig('subscribe to Device Power');
      return () => {};
    }
    const powerRef = ref(db, 'system/devicePower');
    onValue(powerRef, (snapshot) => {
      callback(snapshot.val() === true);
    });
    return () => off(powerRef);
  },

  setDevicePower: async (isPowered: boolean) => {
    const db = getDb();
    if (!db) {
      console.error("Firebase not connected. Cannot toggle Device Power.");
      return;
    }
    await set(ref(db, 'system/devicePower'), isPowered);
  },

  subscribeToSystemSettings: (callback: (settings: SystemSettings) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const settingsRef = ref(db, 'system/settings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      callback({
        detectionSoundId: data?.detectionSoundId || '',
        isDetectionEnabled: data?.isDetectionEnabled ?? false,
        apiTrigger: data?.apiTrigger ?? false
      });
    });
    return () => off(settingsRef);
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    const db = getDb();
    if (!db) return { detectionSoundId: '', isDetectionEnabled: false, apiTrigger: false };
    const settingsRef = ref(db, 'system/settings');
    
    return new Promise((resolve) => {
      onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        resolve({
          detectionSoundId: data?.detectionSoundId || '',
          isDetectionEnabled: data?.isDetectionEnabled ?? false,
          apiTrigger: data?.apiTrigger ?? false
        });
      }, { onlyOnce: true });
    });
  },

  updateSystemSettings: async (settings: Partial<SystemSettings>) => {
    const db = getDb();
    if (!db) return;
    const settingsRef = ref(db, 'system/settings');
    
    onValue(settingsRef, async (snapshot) => {
      const current = snapshot.val() || {};
      await set(settingsRef, {
        ...current,
        ...settings
      });
    }, { onlyOnce: true });
  },

  subscribeToSchedules: (callback: (schedules: Schedule[]) => void) => {
    const db = getDb();
    if (!db) {
      notifyMissingConfig('subscribe to Schedules');
      return () => {};
    }
    const schedulesRef = ref(db, 'schedules');
    onValue(schedulesRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? (Object.values(data) as Schedule[]) : []);
    });
    return () => off(schedulesRef);
  },

  saveScheduleRemote: async (schedule: Schedule) => {
    const db = getDb();
    if (!db) return;
    await set(ref(db, `schedules/${schedule.id}`), schedule);
  },

  deleteScheduleRemote: async (id: string) => {
    const db = getDb();
    if (!db) return;
    await remove(ref(db, `schedules/${id}`));
  },

  subscribeToSounds: (callback: (sounds: SoundFile[]) => void) => {
    const db = getDb();
    if (!db) {
      notifyMissingConfig('subscribe to Sounds');
      return () => {};
    }
    const soundsRef = ref(db, 'sounds');
    onValue(soundsRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? (Object.values(data) as SoundFile[]) : []);
    });
    return () => off(soundsRef);
  },

  saveSoundRemote: async (sound: SoundFile) => {
    const db = getDb();
    if (!db) return;
    await set(ref(db, `sounds/${sound.id}`), sound);
  },

  deleteSoundRemote: async (id: string) => {
    const db = getDb();
    if (!db) return;
    await remove(ref(db, `sounds/${id}`));
  },

  triggerManualSound: async (soundId: string) => {
    const db = getDb();
    if (!db) return;
    await set(ref(db, 'system/manualTrigger'), {
      soundId,
      timestamp: Date.now()
    });
  },

  subscribeToManualTriggers: (callback: (trigger: { soundId: string, timestamp: number } | null) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const triggerRef = ref(db, 'system/manualTrigger');
    onValue(triggerRef, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(triggerRef);
  },

  triggerScheduledSound: async (soundId: string, scheduleId: string) => {
    const db = getDb();
    if (!db) return;
    await set(ref(db, 'system/scheduledTrigger'), {
      soundId,
      scheduleId,
      timestamp: Date.now()
    });
  },

  subscribeToScheduledTriggers: (callback: (trigger: { soundId: string, scheduleId: string, timestamp: number } | null) => void) => {
    const db = getDb();
    if (!db) return () => {};
    const triggerRef = ref(db, 'system/scheduledTrigger');
    onValue(triggerRef, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(triggerRef);
  },

  getAllSounds: async (): Promise<SoundFile[]> => {
    const db = getDb();
    if (!db) return [];
    const soundsRef = ref(db, 'sounds');
    return new Promise((resolve) => {
      onValue(soundsRef, (snapshot) => {
        const data = snapshot.val();
        resolve(data ? (Object.values(data) as SoundFile[]) : []);
      }, { onlyOnce: true });
    });
  },
  tryBecomeLeader: async (clientId: string): Promise<boolean> => {
    const db = getDb();
    if (!db) return false;
    
    const leaderRef = ref(db, 'system/automationLeader');
    return new Promise((resolve) => {
      onValue(leaderRef, async (snapshot) => {
        const current = snapshot.val();
        const now = Date.now();
        
        // If no leader or leader is stale (15s), try to take over
        if (!current || current.clientId === clientId || (now - current.heartbeat) > 15000) {
          try {
            await set(leaderRef, {
              clientId,
              heartbeat: now
            });
            resolve(true);
          } catch (e) {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }, { onlyOnce: true });
    });
  }
};
