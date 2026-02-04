
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

// Explicitly pass the databaseURL to getDatabase to avoid "Can't determine URL" error
const dbUrl = process.env.FIREBASE_DATABASE_URL;

if (!dbUrl) {
  console.error("FIREBASE_DATABASE_URL is missing from environment variables.");
}

const db: Database = getDatabase(app, dbUrl);

export const firebaseService = {
  /**
   * Listen for changes to the main system switch.
   */
  subscribeToMainSwitch: (callback: (isOn: boolean) => void) => {
    if (!db) return () => {};
    
    const switchRef = ref(db, 'system/mainSwitch');
    onValue(switchRef, (snapshot) => {
      const data = snapshot.val();
      callback(data === true);
    }, (error) => {
      console.error("Firebase subscription error:", error);
    });
    
    return () => off(switchRef);
  },

  /**
   * Toggle the main system switch in the database.
   */
  setMainSwitch: async (isOn: boolean) => {
    if (!db) throw new Error("Database not initialized");
    const switchRef = ref(db, 'system/mainSwitch');
    await set(switchRef, isOn);
  }
};
