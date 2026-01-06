
import React from 'react';
import { Home, Calendar, Music, ClipboardList, Wifi, WifiOff, HardDrive } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isOnline }) => {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-slate-50 shadow-xl relative">
      {/* Enhanced Status Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AgriSound</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
              <Wifi size={14} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-wider">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <WifiOff size={14} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-wider">Offline</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 max-w-lg mx-auto flex justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: Home, label: 'Control' },
          { id: 'scheduler', icon: Calendar, label: 'Schedule' },
          { id: 'library', icon: Music, label: 'Sounds' },
          { id: 'logs', icon: ClipboardList, label: 'Activity' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-2xl transition-all duration-300 ${
              activeTab === item.id 
              ? 'bg-green-50 text-green-700 transform scale-105' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon size={activeTab === item.id ? 26 : 24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
