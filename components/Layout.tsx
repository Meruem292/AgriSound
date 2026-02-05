
import React from 'react';
import { Home, Calendar, Music, ClipboardList, Wifi, WifiOff } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
}

const AgriSoundLogo = () => (
  <svg viewBox="0 0 100 100" className="h-10 w-10 md:h-12 md:w-12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" stroke="#2d5a27" strokeWidth="4" />
    <circle cx="50" cy="50" r="44" fill="white" />
    <path d="M40 55 L52 65 L52 45 L40 55 Z" fill="#2d5a27" />
    <rect x="36" y="52" width="6" height="6" rx="1" fill="#2d5a27" />
    <path d="M58 45 Q64 55 58 65" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M64 40 Q72 55 64 70" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <path d="M70 35 Q80 55 70 75" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    <path d="M35 40 C30 35 32 28 38 25 C42 28 48 32 50 38 C45 36 38 38 35 40 Z" fill="#2d5a27" />
    <path d="M38 25 C45 22 55 25 58 30 C55 35 50 38 48 38" fill="#2d5a27" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isOnline }) => {
  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto bg-slate-50 shadow-2xl relative text-slate-900 overflow-hidden">
      {/* Branded Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 md:px-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <AgriSoundLogo />
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black text-slate-900 leading-none tracking-tighter">AgriSound</span>
            <span className="text-[10px] md:text-xs font-bold text-green-700 uppercase tracking-widest leading-none mt-1">Intelligent Field Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">Cloud Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <WifiOff size={14} strokeWidth={3} />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">Local Only</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-28 pt-4 overflow-y-auto px-4 md:px-10">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Navigation - Optimized for Tablet Reach */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/90 backdrop-blur-xl border border-slate-200 px-2 py-3 rounded-[32px] flex justify-around shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all">
        {[
          { id: 'dashboard', icon: Home, label: 'Control' },
          { id: 'scheduler', icon: Calendar, label: 'Schedule' },
          { id: 'library', icon: Music, label: 'Sounds' },
          { id: 'logs', icon: ClipboardList, label: 'Activity' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all duration-300 ${
              activeTab === item.id 
              ? 'bg-green-600 text-white shadow-lg shadow-green-200 transform scale-105' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon size={activeTab === item.id ? 24 : 22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === item.id ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
