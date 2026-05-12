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

  /**
   * API to trigger the detection alarm.
   * This is intended to be called by an AI Camera or external system.
   * 
   * Method: POST
   * URL: /api/detect
   * Body: {} (Empty body is fine, or optional metadata)
   */
  app.post("/api/detect", async (req, res) => {
    try {
      console.log("[API] Detection received from external source.");
      
      // 1. Fetch current settings to see if detection is enabled and which sound to use
      const settings = await firebaseService.getSystemSettings();
      
      if (!settings.isDetectionEnabled) {
        console.log("[API] Detection ignored: Feature is disabled in settings.");
        return res.json({ 
          success: false, 
          message: "Detection is currently disabled in system settings." 
        });
      }

      if (!settings.detectionSoundId) {
        console.log("[API] Detection ignored: No alarm sound configured.");
        return res.json({ 
          success: false, 
          message: "Detection sound is not configured." 
        });
      }

      // 2. Trigger the sound globally via Firebase
      console.log(`[API] Triggering alarm sound ID: ${settings.detectionSoundId}`);
      await firebaseService.triggerManualSound(settings.detectionSoundId);

      // 3. Optional: Logic to turn on hardware power if it's off?
      // For now, assume hardware is on or handles its own power if needed.
      // But we can force it on too:
      await firebaseService.setDevicePower(true);

      res.json({ 
        success: true, 
        message: "Detection alarm triggered successfully.",
        soundId: settings.detectionSoundId
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
