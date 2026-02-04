
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database } from 'firebase/database';

/**
 * Enhanced environment variable lookup for Vite/Replit/Vercel environments.
 */
const getEnv = (key: string): string | undefined => {
  const findInObject = (obj: any) => {
    if (!obj) return undefined;
    
    // 1. Direct match
    if (obj[key]) return obj[key];
    
    // 2. Try VITE_ prefix (Required by Vite for client-side access)
    if (!key.startsWith('VITE_')) {
      const viteKey = `VITE_${key}`;
      if (obj[viteKey]) return obj[viteKey];
    }
    
    // 3. Try NEXT_PUBLIC_ prefix
    if (!key.startsWith('NEXT_PUBLIC_')) {
      const nextKey = `NEXT_PUBLIC_${key}`;
      if (obj[nextKey]) return obj[nextKey];
    }

    return undefined;
  };

  // Try Vite's preferred object first
  try {
    // @ts-ignore
    const viteEnvMatch = findInObject(import.meta.env);
    if (viteEnvMatch) return viteEnvMatch;
  } catch (e) {}

  // Fallback to standard process.env
  const processMatch = findInObject(process.env);
  if (processMatch) return processMatch;

  return undefined;
};

/**
 * Diagnostic tool to help debug why keys might be missing.
 */
const debugEnv = () => {
  const visibleKeys: string[] = [];
  try {
    // @ts-ignore
    Object.keys(import.meta.env || {}).forEach(k => visibleKeys.push(k));
  } catch(e) {}
  if (process.env) Object.keys(process.env).forEach(k => visibleKeys.push(k));
  
  if (visibleKeys.length > 0) {
    console.log("AgriSound Debug: The following keys are visible to the browser:", visibleKeys.filter(k => k.includes('FIREBASE') || k.includes('SUPABASE')));
  } else {
    console.warn("AgriSound Warning: No environment variables are visible to the browser context.");
  }
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
    console.error("AgriSound Error: FIREBASE_API_KEY is missing. Check if your dashboard keys start with VITE_");
    debugEnv();
    return null;
  }

  try {
    appInstance = !getApps().length ? initializeApp(config) : getApp();
    return appInstance;
  } catch (err) {
    console.error("AgriSound Error: Firebase initialization failed:", err);
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
    return null;
  }

  try {
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Realtime Database:", err);
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
    if (!db) {
      alert("System Offline: Ensure variables in your dashboard are prefixed with VITE_");
      return;
    }
    try {
      await set(ref(db, 'system/mainSwitch'), isOn);
    } catch (e) {
      console.error("AgriSound Error: Failed to update cloud state", e);
    }
  }
};
