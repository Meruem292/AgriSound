
export enum DeviceStatus {
  SLEEPING = 'SLEEPING',
  ACTIVE = 'ACTIVE',
  OFFLINE = 'OFFLINE',
  WAKING = 'WAKING'
}

export enum ScheduleType {
  FIXED = 'FIXED',
  INTERVAL = 'INTERVAL',
  SUNRISE_SUNSET = 'SUNRISE_SUNSET'
}

export interface SoundFile {
  id: string;
  name: string;
  blob: Blob;
  tag: 'predator' | 'distress' | 'mechanical' | 'other';
  duration: number; // in seconds
  fileName: string;
}

export interface Schedule {
  id: string;
  name: string;
  type: ScheduleType;
  time: string; // HH:mm
  intervalMinutes?: number;
  soundIds: string[] | 'random';
  playbackCount: number;
  isActive: boolean;
  days: number[]; // 0-6 (Sun-Sat)
  lastRunTimestamp?: number; // To prevent double triggers
}

export interface PlaybackLog {
  id: string;
  timestamp: number;
  soundName: string;
  triggerType: 'manual' | 'scheduled';
  status: 'success' | 'failed';
}

export interface DeviceState {
  status: DeviceStatus;
  batteryLevel: number;
  lastWakeTime: number;
  lastSoundPlayed: string;
  lastSyncTime: number;
}
