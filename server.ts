
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

// Firebase config for the server
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for POST requests
  app.use(express.json());

  // API routes
  app.get("/api/ping", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "pong", 
      timestamp: new Date().toISOString(),
      service: "AgriSound API"
    });
  });

  app.all("/api/play", async (req, res) => {
    try {
      const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const db = getDatabase(firebaseApp);
      
      const soundId = (req.query.soundId as string) || (req.body?.soundId as string) || 'default_alert';

      await set(ref(db, 'system/manualTrigger'), {
        soundId,
        timestamp: Date.now(),
        source: 'api_trigger'
      });

      res.json({ 
        status: "ok", 
        message: `Playback triggered: ${soundId}`, 
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("API Play Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 5, use *all to match everything for SPA fallback
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
