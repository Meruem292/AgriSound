
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database, remove } from 'firebase/database';
import { Schedule } from '../types';

const getEnv = (key: string): string | undefined => {
  // 1. Try exact matches first
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  try {
    const meta = (import.meta as any);
    if (meta.env && meta.env[key]) return meta.env[key];
  } catch (e) {}

  // 2. Try common prefixes
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'VITE_NEXT_PUBLIC_'];
  for (const pref of prefixes) {
    const fullKey = `${pref}${key}`;
    
    if (typeof process !== 'undefined' && process.env && process.env[fullKey]) {
      return process.env[fullKey];
    }
    
    try {
      const meta = (import.meta as any);
      if (meta.env && meta.env[fullKey]) {
        return meta.env[fullKey];
      }
    } catch (e) {}
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

  if (!config.apiKey) return null;
  try {
    appInstance = !getApps().length ? initializeApp(config) : getApp();
    return appInstance;
  } catch (err) {
    return null;
  }
};

const getDb = (): Database | null => {
  if (dbInstance) return dbInstance;
  const app = initFirebase();
  if (!app) return null;
  const dbUrl = getEnv('FIREBASE_DATABASE_URL');
  if (!dbUrl) return null;
  try {
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    return null;
  }
};

export const firebaseService = {
  subscribeToMainSwitch: (callback: (isOn: boolean) => void) => {
    const db = getDb();
    if (!db) return () => {};
    try {
      const switchRef = ref(db, 'system/mainSwitch');
      onValue(switchRef, (snapshot) => {
        callback(snapshot.val() === true);
      });
      return () => off(switchRef);
    } catch (e) {
      return () => {};
    }
  },
  
  setMainSwitch: async (isOn: boolean) => {
    const db = getDb();
    if (!db) return;
    try {
      await set(ref(db, 'system/mainSwitch'), isOn);
    } catch (e) {}
  },

  subscribeToSchedules: (callback: (schedules: Schedule[]) => void) => {
    const db = getDb();
    if (!db) return () => {};
    try {
      const schedulesRef = ref(db, 'schedules');
      onValue(schedulesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const scheduleList = Object.values(data) as Schedule[];
          callback(scheduleList);
        } else {
          callback([]);
        }
      });
      return () => off(schedulesRef);
    } catch (e) {
      return () => {};
    }
  },

  saveScheduleRemote: async (schedule: Schedule) => {
    const db = getDb();
    if (!db) return;
    try {
      await set(ref(db, `schedules/${schedule.id}`), schedule);
    } catch (e) {
      console.error("[Firebase] Failed to save schedule:", e);
    }
  },

  deleteScheduleRemote: async (id: string) => {
    const db = getDb();
    if (!db) return;
    try {
      await remove(ref(db, `schedules/${id}`));
    } catch (e) {
      console.error("[Firebase] Failed to delete schedule:", e);
    }
  }
};
