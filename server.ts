import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { firebaseService } from "./services/firebaseService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API to trigger detection - allows both GET for easy testing and POST for standard use
  app.all("/api/detect", async (req, res) => {
    // Only allow GET and POST
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }
    
    try {
      console.log(`[API] Detection triggered via ${req.method}`);
      
      // 1. Fetch current settings
      const settings = await firebaseService.getSystemSettings();
      
      if (!settings.isDetectionEnabled) {
        console.log("[API] Detection ignored: Feature is disabled in settings.");
        return res.json({ 
          success: false, 
          message: "Detection is currently disabled in system settings." 
        });
      }

      let soundToPlay = settings.detectionSoundId;

      // Handle random playback if enabled
      if (settings.apiTrigger) {
        console.log("[API] Random trigger enabled. Selecting random sound...");
        const allSounds = await firebaseService.getAllSounds();
        if (allSounds.length > 0) {
          const randomIndex = Math.floor(Math.random() * allSounds.length);
          soundToPlay = allSounds[randomIndex].id;
          console.log(`[API] Selected random sound: ${allSounds[randomIndex].name} (${soundToPlay})`);
        }
      }

      if (!soundToPlay) {
        console.log("[API] Detection ignored: No alarm sound configured.");
        return res.json({ 
          success: false, 
          message: "Detection sound is not configured." 
        });
      }

      // 2. Trigger the sound globally via Firebase
      console.log(`[API] Triggering alarm sound ID: ${soundToPlay}`);
      await firebaseService.triggerManualSound(soundToPlay);

      // 3. Ensure hardware is on
      await firebaseService.setDevicePower(true);

      res.json({ 
        success: true, 
        message: "Detection alarm triggered successfully.",
        soundId: soundToPlay,
        isRandom: settings.apiTrigger
      });
    } catch (err) {
      console.error("[API] Detection error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error triggering detection." 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`AI Detection API ready at: http://localhost:${PORT}/api/detect`);
  });
}

startServer();
