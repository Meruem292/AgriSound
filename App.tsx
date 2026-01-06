
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Scheduler from './components/Scheduler';
import Library from './components/Library';
import Logs from './components/Logs';
import { databaseService } from './services/databaseService';
import { DeviceStatus } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // --- AUTOMATED SCHEDULING WORKER ---
    const checkSchedules = async () => {
      try {
        const deviceState = await databaseService.getDeviceState();
        
        // Skip if device is already performing a task
        if (deviceState.status !== DeviceStatus.SLEEPING) return;

        const schedules = await databaseService.getSchedules();
        const now = new Date();
        
        // Robust HH:mm formatting matching the <input type="time"> format
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const currentHHmm = `${hours}:${minutes}`;
        const currentDay = now.getDay();

        // Debug logging (Viewable in browser console)
        console.log(`[AgriSound Worker] Tick: ${currentHHmm} | Day: ${currentDay}`);

        for (const schedule of schedules) {
          if (!schedule.isActive) continue;

          const timeMatch = schedule.time === currentHHmm;
          const dayMatch = schedule.days.includes(currentDay);
          
          // Last run check to prevent multiple triggers within the same minute
          const lastRun = schedule.lastRunTimestamp ? new Date(schedule.lastRunTimestamp) : null;
          const alreadyRanThisMinute = lastRun && 
            lastRun.getHours() === now.getHours() && 
            lastRun.getMinutes() === now.getMinutes() &&
            lastRun.getDate() === now.getDate();

          if (timeMatch && dayMatch && !alreadyRanThisMinute) {
            console.log(`[AgriSound Worker] SUCCESS: Triggering "${schedule.name}" at ${currentHHmm}`);
            // Fire and forget to not block the worker loop
            databaseService.performPlayback('scheduled', schedule.id);
          }
        }
      } catch (error) {
        console.error("[AgriSound Worker] Error checking schedules:", error);
      }
    };

    // Check every 10 seconds for high reliability
    const workerInterval = setInterval(checkSchedules, 10000); 
    
    // Run an initial check on mount
    checkSchedules();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(workerInterval);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'scheduler': return <Scheduler />;
      case 'library': return <Library />;
      case 'logs': return <Logs />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} isOnline={isOnline}>
      {renderContent()}
    </Layout>
  );
};

export default App;
