
import React, { useState, useEffect } from 'react';
import { ClipboardList, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { PlaybackLog } from '../types';

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<PlaybackLog[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await databaseService.getLogs();
      setLogs(data);
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 py-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Activity</h1>
          <p className="text-slate-500 font-medium">Field Audit Logs</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-sm hover:bg-slate-50 transition-all">
          <Download size={20} />
          <span className="text-sm font-black uppercase tracking-widest hidden md:inline">Export Audit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {logs.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 border-2 border-dashed border-slate-100 text-center">
            <ClipboardList className="mx-auto mb-6 text-slate-100" size={64} />
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Recent Activity</h3>
            <p className="text-slate-400 text-sm mt-2">Historical triggers will appear here in chronological order.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white border border-slate-100 rounded-[28px] p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-inner ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {log.status === 'success' ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">{log.soundName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                      {log.triggerType}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.status === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                {log.status === 'success' ? 'Deployed' : 'Fail'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Logs;
