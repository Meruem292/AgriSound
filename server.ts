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

  // Helper to handle the power cycle sequence without blocking API response
  async function runDetectionSequence(soundId: string) {
    try {
      console.log(`[Sequence] Starting detection sequence for ${soundId}...`);
      
      // 1. Power ON
      console.log("[Sequence] Powering ON device...");
      await firebaseService.setDevicePower(true);
      
      // 2. Wait 1 minute for warm-up
      console.log("[Sequence] Device warming up. Waiting 60 seconds...");
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // 3. Trigger Sound
      console.log(`[Sequence] Warm-up complete. Triggering sound: ${soundId}`);
      await firebaseService.triggerManualSound(soundId);
      
      // 4. Wait for playback (e.g. 30 seconds)
      console.log("[Sequence] Sound triggered. Waiting 30 seconds for playback...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // 5. Power OFF
      console.log("[Sequence] Playback finished. Powering OFF device.");
      await firebaseService.setDevicePower(false);
      
    } catch (err) {
      console.error("[Sequence] Error in power cycle sequence:", err);
    }
  }

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
      
      // 2. Select Sound (Default to random from library for anti-habituation)
      const allSounds = await firebaseService.getAllSounds();
      if (allSounds.length > 0) {
        const randomIndex = Math.floor(Math.random() * allSounds.length);
        soundToPlay = allSounds[randomIndex].id;
        console.log(`[API] Selected random sound for anti-habituation: ${allSounds[randomIndex].name} (${soundToPlay})`);
      }

      if (!soundToPlay) {
        console.log("[API] Detection ignored: No alarm sound configured.");
        return res.json({ 
          success: false, 
          message: "Detection sound is not configured." 
        });
      }

      // Start the async sequence (Power ON -> 60s Wait -> Sound -> 30s Wait -> Power OFF)
      // We don't await this so the API response returns immediately
      runDetectionSequence(soundToPlay);

      res.json({ 
        success: true, 
        message: "Detection received. Hardware sequence initiated (Power ON -> 1m delay -> Playback -> Power OFF).",
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
