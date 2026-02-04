
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database } from 'firebase/database';

/**
 * Highly robust environment variable getter for Vite, Webpack, and Meta-frameworks.
 */
const getEnv = (key: string): string | undefined => {
  const findInObject = (obj: any) => {
    if (!obj) return undefined;
    if (obj[key]) return obj[key];
    if (!key.startsWith('VITE_') && obj[`VITE_${key}`]) return obj[`VITE_${key}`];
    if (!key.startsWith('NEXT_PUBLIC_') && obj[`NEXT_PUBLIC_${key}`]) return obj[`NEXT_PUBLIC_${key}`];
    return undefined;
  };

  // 1. Try process.env (Standard Node/Webpack/CRA)
  const fromProcess = findInObject(process.env);
  if (fromProcess) return fromProcess;

  // 2. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    const viteEnv = import.meta.env;
    const fromVite = findInObject(viteEnv);
    if (fromVite) return fromVite;
  } catch (e) {
    // Ignore errors if import.meta.env is not supported
  }

  return undefined;
};

/**
 * Diagnostic helper to print available keys (not values) for debugging environment injection.
 */
const debugEnvKeys = () => {
  const keys = new Set<string>();
  if (process.env) Object.keys(process.env).forEach(k => keys.add(k));
  try {
    // @ts-ignore
    if (import.meta.env) Object.keys(import.meta.env).forEach(k => keys.add(k));
  } catch(e) {}
  console.log("AgriSound Debug - Available Env Keys:", Array.from(keys));
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

  if (!config.apiKey) {
    console.error("AgriSound Error: FIREBASE_API_KEY is missing.");
    debugEnvKeys();
    return null;
  }

  try {
    appInstance = !getApps().length ? initializeApp(config) : getApp();
    return appInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Firebase App:", err);
    return null;
  }
};

const getDb = (): Database | null => {
  if (dbInstance) return dbInstance;
  
  const app = initFirebase();
  if (!app) return null;

  const dbUrl = getEnv('FIREBASE_DATABASE_URL');
  
  if (!dbUrl) {
    console.error("AgriSound Error: FIREBASE_DATABASE_URL is missing.");
    debugEnvKeys();
    return null;
  }

  try {
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Firebase Database service:", err);
    return null;
  }
};

export const firebaseService = {
  subscribeToMainSwitch: (callback: (isOn: boolean) => void) => {
    const db = getDb();
    if (!db) {
      console.warn("AgriSound Warning: Cloud controller unavailable. Remote sync disabled.");
      return () => {};
    }
    
    try {
      const switchRef = ref(db, 'system/mainSwitch');
      onValue(switchRef, (snapshot) => {
        const data = snapshot.val();
        callback(data === true);
      }, (error) => {
        console.error("AgriSound Firebase Sync Error:", error);
      });
      
      return () => off(switchRef);
    } catch (e) {
      console.error("AgriSound Error: Could not create reference to database", e);
      return () => {};
    }
  },

  setMainSwitch: async (isOn: boolean) => {
    const db = getDb();
    if (!db) {
      alert("System Offline: Check your deployment dashboard for Firebase variables.");
      return;
    }
    try {
      const switchRef = ref(db, 'system/mainSwitch');
      await set(switchRef, isOn);
    } catch (e) {
      console.error("AgriSound Error: Failed to update cloud switch", e);
      alert("Connection Error: Failed to update cloud state.");
    }
  }
};
