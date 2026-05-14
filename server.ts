import express from "express";
import cors from "cors";
import path from "path";
import { firebaseService } from "./services/firebaseService";

const app = express();

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

// API to trigger detection
app.all("/api/detect", async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  
  try {
    const settings = await firebaseService.getSystemSettings();
    let soundToPlay = settings.detectionSoundId;
    const allSounds = await firebaseService.getAllSounds();
    if (allSounds.length > 0) {
      const randomIndex = Math.floor(Math.random() * allSounds.length);
      soundToPlay = allSounds[randomIndex].id;
    }

    if (!soundToPlay) {
      return res.json({ success: false, message: "Detection sound is not configured." });
    }

    runDetectionSequence(soundToPlay);

    res.json({ 
      success: true, 
      message: "Detection received. Hardware sequence initiated.",
      soundId: soundToPlay
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.all("/api/play", async (req, res) => {
  try {
    const allSounds = await firebaseService.getAllSounds();
    if (allSounds.length === 0) {
      return res.status(404).json({ success: false, message: "No sounds available" });
    }
    const sound = allSounds[Math.floor(Math.random() * allSounds.length)];
    await firebaseService.triggerManualSound(sound.id);
    res.json({ success: true, message: `Triggered: ${sound.name}`, sound: sound.name });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.all("/api/ping", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.all("/api/on", async (req, res) => {
  await firebaseService.setDevicePower(true);
  res.json({ success: true, message: "Hardware Power: ON" });
});

app.all("/api/off", async (req, res) => {
  await firebaseService.setDevicePower(false);
  res.json({ success: true, message: "Hardware Power: OFF" });
});

app.all("/api/callback", async (req, res) => {
  try {
    const allSounds = await firebaseService.getAllSounds();
    if (allSounds.length > 0) {
      const sound = allSounds[Math.floor(Math.random() * allSounds.length)];
      await firebaseService.triggerManualSound(sound.id);
      return res.json({ success: true, message: `Callback triggered: ${sound.name}` });
    }
    res.json({ success: true, message: "Callback received (no sounds)" });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Setup Vite or Static Serving
const isProd = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;

async function setupApp() {
  if (!isProd) {
    // Dynamic import to avoid bundling Vite in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Only serve static files if not on Vercel (Vercel handles static via rewrites usually)
    // but keeping it for local production testing / other hosts
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      // On Vercel, this might fail if dist doesn't exist in the function's env
      try {
        res.sendFile(path.join(distPath, "index.html"));
      } catch (e) {
        res.status(404).send("Not Found");
      }
    });
  }

  // Only start the internal listener if we are not on Vercel
  if (!isVercel || process.env.AIS_CONTAINER) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  }
}

// In serverless environments, we don't await setupApp() at top level
if (!isVercel) {
  setupApp().catch(console.error);
}

export default app;
