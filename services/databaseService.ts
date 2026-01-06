
import { DeviceState, DeviceStatus, Schedule, SoundFile, PlaybackLog, ScheduleType } from '../types';

const DB_NAME = 'AgriSoundDB';
const DB_VERSION = 1;
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
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.SOUNDS)) db.createObjectStore(STORES.SOUNDS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.SCHEDULES)) db.createObjectStore(STORES.SCHEDULES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.LOGS)) db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORES.STATE)) db.createObjectStore(STORES.STATE);
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

  async put(storeName: string, item: any): Promise<void> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.put(item);
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
    const states = await localDB.getAll<any>(STORES.STATE);
    const defaultState: DeviceState = {
      status: DeviceStatus.SLEEPING,
      batteryLevel: 84,
      lastWakeTime: Date.now(),
      lastSoundPlayed: 'None',
      lastSyncTime: Date.now()
    };
    return states.length > 0 ? states[0] : defaultState;
  },

  updateDeviceState: async (updates: Partial<DeviceState>) => {
    const current = await databaseService.getDeviceState();
    const next = { ...current, ...updates };
    await localDB.put(STORES.STATE, { ...next, id: 'main' });
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
    // 1. Wake Sequence
    await databaseService.updateDeviceState({ status: DeviceStatus.WAKING });
    await new Promise(r => setTimeout(r, 1500));
    
    // 2. Start Playback
    await databaseService.updateDeviceState({ status: DeviceStatus.ACTIVE });
    
    const sounds = await databaseService.getSounds();
    const soundName = sounds.length > 0 ? sounds[Math.floor(Math.random() * sounds.length)].name : 'No Sound Found';
    
    // 3. Log the Activity
    await databaseService.addLog({
      timestamp: Date.now(),
      soundName,
      triggerType,
      status: 'success'
    });

    // 4. Update Runtime State
    await databaseService.updateDeviceState({ 
      lastWakeTime: Date.now(),
      lastSoundPlayed: soundName
    });

    // 5. If it's a schedule, update the last run time to prevent loops
    if (scheduleId) {
      const schedules = await databaseService.getSchedules();
      const sched = schedules.find(s => s.id === scheduleId);
      if (sched) {
        await databaseService.saveSchedule({ ...sched, lastRunTimestamp: Date.now() });
      }
    }

    // 6. Return to Sleep after "playback" simulation
    await new Promise(r => setTimeout(r, 4000));
    await databaseService.updateDeviceState({ status: DeviceStatus.SLEEPING, lastSyncTime: Date.now() });
  },

  triggerManualPlay: async () => {
    await databaseService.performPlayback('manual');
  }
};
