
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, off, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Guarded Database Initialization
let dbInstance: Database | null = null;

const getDb = (): Database | null => {
  if (dbInstance) return dbInstance;
  
  const dbUrl = process.env.FIREBASE_DATABASE_URL;
  if (!dbUrl || dbUrl.includes('YOUR_FIREBASE')) {
    console.error("AgriSound Error: FIREBASE_DATABASE_URL is missing or invalid in .env");
    return null;
  }

  try {
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Firebase Database:", err);
    return null;
  }
};

export const firebaseService = {
  /**
   * Listen for changes to the main system switch.
   */
  subscribeToMainSwitch: (callback: (isOn: boolean) => void) => {
    const db = getDb();
    if (!db) {
      console.warn("AgriSound Warning: Firebase Database not available. Using local state.");
      return () => {};
    }
    
    const switchRef = ref(db, 'system/mainSwitch');
    onValue(switchRef, (snapshot) => {
      const data = snapshot.val();
      callback(data === true);
    }, (error) => {
      console.error("AgriSound Firebase Sync Error:", error);
    });
    
    return () => off(switchRef);
  },

  /**
   * Toggle the main system switch in the database.
   */
  setMainSwitch: async (isOn: boolean) => {
    const db = getDb();
    if (!db) {
      alert("Cannot connect to cloud controller. Please check your .env credentials.");
      return;
    }
    const switchRef = ref(db, 'system/mainSwitch');
    await set(switchRef, isOn);
  }
};
