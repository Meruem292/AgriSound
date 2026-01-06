
import React from 'react';
import { Home, Calendar, Music, ClipboardList, Wifi, WifiOff } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isOnline }) => {
  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-slate-50 shadow-xl relative text-slate-900">
      {/* Official Branded Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="./agriSound.png" 
            alt="AgriSound" 
            className="h-10 w-10 object-contain"
            onError={(e) => {
              // Fallback to a styled div if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.logo-fallback')) {
                const fallback = document.createElement('div');
                fallback.className = 'logo-fallback w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-xs';
                fallback.innerText = 'AS';
                parent.prepend(fallback);
              }
            }}
          />
          <span className="text-lg font-black text-slate-900 tracking-tighter">AgriSound</span>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
              <WifiOff size={12} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-wider">Local</span>
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
