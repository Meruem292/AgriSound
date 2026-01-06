
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
    // This heartbeat runs in the background while the app is open
    const checkSchedules = async () => {
      const deviceState = await databaseService.getDeviceState();
      
      // Don't trigger if already busy
      if (deviceState.status !== DeviceStatus.SLEEPING) return;

      const schedules = await databaseService.getSchedules();
      const now = new Date();
      const currentHHmm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const currentDay = now.getDay();

      for (const schedule of schedules) {
        if (!schedule.isActive) continue;

        // Check if current time matches schedule time
        const timeMatch = schedule.time === currentHHmm;
        // Check if today is an active day
        const dayMatch = schedule.days.includes(currentDay);
        
        // Prevent re-triggering within the same minute
        const lastRun = schedule.lastRunTimestamp ? new Date(schedule.lastRunTimestamp) : null;
        const alreadyRanThisMinute = lastRun && 
          lastRun.getHours() === now.getHours() && 
          lastRun.getMinutes() === now.getMinutes();

        if (timeMatch && dayMatch && !alreadyRanThisMinute) {
          console.log(`Triggering scheduled playback: ${schedule.name}`);
          databaseService.performPlayback('scheduled', schedule.id);
        }
      }
    };

    const workerInterval = setInterval(checkSchedules, 30000); // Check every 30 seconds

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
