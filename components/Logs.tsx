
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Activity History</h2>
          <p className="text-sm text-slate-500 font-medium">Local monitoring</p>
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl shadow-sm">
          <Download size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-10 opacity-40">
            <ClipboardList className="mx-auto mb-2" size={40} />
            <p className="font-bold">No local logs yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {log.status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{log.soundName}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    {log.triggerType} • {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Logs;
