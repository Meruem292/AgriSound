
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
  
  // Check if missing, empty, or still contains placeholder strings
  const isInvalid = !dbUrl || 
                    dbUrl.toUpperCase().includes('YOUR_FIREBASE') || 
                    dbUrl.includes('your-app-default-rtdb');

  if (isInvalid) {
    console.error(`AgriSound Error: FIREBASE_DATABASE_URL is ${!dbUrl ? 'MISSING' : 'INVALID (placeholder detected)'} in .env. Value found: "${dbUrl}"`);
    return null;
  }

  try {
    // Explicitly passing the URL to getDatabase ensures it doesn't try to guess from config if config is broken
    dbInstance = getDatabase(app, dbUrl);
    return dbInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Firebase Database service:", err);
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
      console.warn("AgriSound Warning: Cloud controller unavailable. Background sync is disabled.");
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

  /**
   * Toggle the main system switch in the database.
   */
  setMainSwitch: async (isOn: boolean) => {
    const db = getDb();
    if (!db) {
      alert("System Offline: Please update your .env with valid Firebase credentials to use remote control.");
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
