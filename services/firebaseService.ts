
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database, remove } from 'firebase/database';
import { Schedule, SoundFile } from '../types';

/**
 * Robust environment variable retrieval for both local and cloud environments.
 */
const getEnv = (key: string): string | undefined => {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = (typeof process !== 'undefined' ? process.env : {}) || {};

  const check = (k: string) => {
    if (metaEnv[k]) return metaEnv[k];
    if (procEnv[k]) return procEnv[k];
    return undefined;
  };

  // 1. Exact match
  let val = check(key);
  if (val) return val;

  // 2. Framework prefixes
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'VITE_NEXT_PUBLIC_'];
  for (const p of prefixes) {
    val = check(`${p}${key}`);
    if (val) return val;
  }

  // 3. Scan all keys for suffix match
  const allKeys = [...Object.keys(metaEnv), ...Object.keys(procEnv)];
  const upperKey = key.toUpperCase();
  for (const k of allKeys) {
    if (k.toUpperCase().endsWith(upperKey)) {
      const found = check(k);
      if (found) return found;
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
    console.error("Firebase Config Missing:", config);
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
      alert("Firebase not connected. Cannot toggle Main Switch.");
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
      alert("Firebase not connected. Cannot toggle Device Power.");
      return;
    }
    await set(ref(db, 'system/devicePower'), isPowered);
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
  }
};
