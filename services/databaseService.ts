
import { DeviceState, DeviceStatus, Schedule, SoundFile, PlaybackLog, ScheduleType } from '../types';

const DB_NAME = 'AgriSoundDB';
const DB_VERSION = 4; // Bumped to 4 for Supabase URL migration
const STORES = {
  SOUNDS: 'sounds',
  SCHEDULES: 'schedules',
  LOGS: 'logs',
  STATE: 'state'
};

class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;
        
        // Handle migration if needed
        if (event.oldVersion < 4) {
          // You could add logic here to clean up old blobs if space is tight
        }

        if (!db.objectStoreNames.contains(STORES.SOUNDS)) db.createObjectStore(STORES.SOUNDS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.SCHEDULES)) db.createObjectStore(STORES.SCHEDULES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.LOGS)) db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.STATE)) db.createObjectStore(STORES.STATE, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async put(storeName: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      if (storeName === STORES.STATE && !item.id) item.id = 'main';
      const request = store.put(item);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete(id);
      transaction.oncomplete = () => resolve();
    });
  }
}

const localDB = new LocalDB();
let dbInitialized = false;

export const databaseService = {
  ensureInit: async () => {
    if (!dbInitialized) {
      await localDB.init();
      dbInitialized = true;
    }
  },

  getSchedules: async (): Promise<Schedule[]> => {
    await databaseService.ensureInit();
    return localDB.getAll<Schedule>(STORES.SCHEDULES);
  },

  saveSchedule: async (schedule: Schedule) => {
    await databaseService.ensureInit();
    await localDB.put(STORES.SCHEDULES, schedule);
  },

  deleteSchedule: async (id: string) => {
    await databaseService.ensureInit();
    await localDB.delete(STORES.SCHEDULES, id);
  },

  getSounds: async (): Promise<SoundFile[]> => {
    await databaseService.ensureInit();
    return localDB.getAll<SoundFile>(STORES.SOUNDS);
  },

  addSound: async (sound: SoundFile) => {
    await databaseService.ensureInit();
    await localDB.put(STORES.SOUNDS, sound);
  },

  deleteSound: async (id: string) => {
    await databaseService.ensureInit();
    await localDB.delete(STORES.SOUNDS, id);
  },

  getDeviceState: async (): Promise<DeviceState> => {
    await databaseService.ensureInit();
    const state = await localDB.get<any>(STORES.STATE, 'main');
    const defaultState: DeviceState = {
      status: DeviceStatus.SLEEPING,
      batteryLevel: 84,
      lastWakeTime: Date.now(),
      lastSoundPlayed: 'None',
      lastSyncTime: Date.now()
    };
    return state ? state : defaultState;
  },

  updateDeviceState: async (updates: Partial<DeviceState>) => {
    const current = await databaseService.getDeviceState();
    const next = { ...current, ...updates, id: 'main' };
    await localDB.put(STORES.STATE, next);
    return next;
  },

  getLogs: async (): Promise<PlaybackLog[]> => {
    await databaseService.ensureInit();
    const logs = await localDB.getAll<PlaybackLog>(STORES.LOGS);
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },

  addLog: async (log: Omit<PlaybackLog, 'id'>) => {
    await databaseService.ensureInit();
    const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    await localDB.put(STORES.LOGS, newLog);
  },

  performPlayback: async (triggerType: 'manual' | 'scheduled', scheduleId?: string) => {
    await databaseService.ensureInit();
    
    const allSounds = await databaseService.getSounds();
    if (allSounds.length === 0) {
      console.warn("Playback triggered but no sounds are available.");
      return;
    }

    let targetSounds: SoundFile[] = allSounds;
    let cycles = 1;

    if (scheduleId) {
      const schedules = await databaseService.getSchedules();
      const sched = schedules.find(s => s.id === scheduleId);
      if (sched) {
        cycles = sched.playbackCount || 1;
        if (Array.isArray(sched.soundIds) && sched.soundIds.length > 0) {
          const filtered = allSounds.filter(s => (sched.soundIds as string[]).includes(s.id));
          if (filtered.length > 0) targetSounds = filtered;
        }
      }
    }

    await databaseService.updateDeviceState({ status: DeviceStatus.WAKING });
    await new Promise(r => setTimeout(r, 1000));
    await databaseService.updateDeviceState({ status: DeviceStatus.ACTIVE });

    for (let i = 0; i < cycles; i++) {
      const sound = targetSounds[Math.floor(Math.random() * targetSounds.length)];
      await databaseService.updateDeviceState({ 
        lastSoundPlayed: sound.name,
        lastWakeTime: Date.now()
      });

      const audio = new Audio(sound.url);
      audio.crossOrigin = "anonymous"; // Needed if Supabase has CORS restricted

      await new Promise((resolve) => {
        audio.onplay = () => {
          databaseService.addLog({
            timestamp: Date.now(),
            soundName: sound.name,
            triggerType,
            status: 'success'
          });
        };
        audio.onended = () => resolve(true);
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          resolve(false);
        };
        audio.play().catch(err => {
          console.error("Playback blocked. Use the UNLOCK button.", err);
          resolve(false);
        });
      });

      if (i < cycles - 1) await new Promise(r => setTimeout(r, 1500));
    }

    await databaseService.updateDeviceState({ 
      status: DeviceStatus.SLEEPING, 
      lastSyncTime: Date.now() 
    });
  },

  triggerManualPlay: async () => {
    await databaseService.performPlayback('manual');
  }
};
