import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const app = !getApps().length ? initializeApp(config) : getApp();
    const db = getDatabase(app);
    
    // Default sound ID or from query/body
    const soundId = (req.query.soundId as string) || (req.body?.soundId as string) || 'default_alert';

    // 1. Ensure Power systems are ON
    const devicePowerPath = 'system/devicePower';
    const mainSwitchPath = 'system/mainSwitch';
    
    const devicePowerRef = ref(db, devicePowerPath);
    const mainSwitchRef = ref(db, mainSwitchPath);

    const [pSnap, mSnap] = await Promise.all([get(devicePowerRef), get(mainSwitchRef)]);
    
    if (pSnap.val() !== true) {
      await set(devicePowerRef, true);
    }
    if (mSnap.val() !== true) {
      await set(mainSwitchRef, true);
    }

    // 2. Schedule playback with 30s delay
    const now = Date.now();
    const scheduledTime = now + 30000;

    await set(ref(db, 'system/manualTrigger'), {
      soundId,
      timestamp: now,
      scheduledPlayTimestamp: scheduledTime,
      source: 'api_trigger'
    });

    res.status(200).json({ 
      status: "ok", 
      message: `Playback scheduled for sound: ${soundId} in 30 seconds. Power systems enabled.`, 
      timestamp: new Date().toISOString(),
      scheduledPlayTime: new Date(scheduledTime).toISOString()
    });
  } catch (error: any) {
    console.error("API Play Error:", error);
    res.status(500).json({ 
      status: "error", 
      message: error.message || "Failed to trigger playback" 
    });
  }
}
