
import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, Edit2, X, Check, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { Schedule, ScheduleType } from '../types';

const Scheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    const data = await databaseService.getSchedules();
    setSchedules(data);
  };

  const handleOpenModal = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
    } else {
      setEditingSchedule({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        type: ScheduleType.FIXED,
        startTime: '06:00',
        endTime: '18:00',
        intervalMinutes: 30,
        isActive: true,
        soundIds: 'random',
        days: [1, 2, 3, 4, 5],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (editingSchedule && editingSchedule.name) {
      await databaseService.saveSchedule(editingSchedule as Schedule);
      setIsModalOpen(false);
      setEditingSchedule(null);
      await loadSchedules();
    } else {
      alert("Please provide a name for the schedule.");
    }
  };

  const toggleSchedule = async (id: string) => {
    const target = schedules.find(s => s.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };
    await databaseService.saveSchedule(updated);
    await loadSchedules();
  };

  const deleteSchedule = async (id: string) => {
    if (confirm('Delete this local schedule?')) {
      await databaseService.deleteSchedule(id);
      await loadSchedules();
    }
  };

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const toggleDay = (dayIndex: number) => {
    if (!editingSchedule) return;
    const currentDays = editingSchedule.days || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    setEditingSchedule({ ...editingSchedule, days: newDays });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Local Schedules</h2>
          <p className="text-sm text-slate-500 font-medium">Automatic Playback</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      <div className="space-y-4">
        {schedules.length === 0 ? (
          <div className="bg-slate-100 rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center">
            <Clock size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No schedules saved</p>
            <p className="text-slate-400 text-xs mt-1">Add a new window for the repeller</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div 
              key={schedule.id}
              className={`bg-white rounded-3xl p-5 shadow-sm border transition-all duration-300 ${schedule.isActive ? 'border-green-100' : 'border-slate-100 opacity-60'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                    {schedule.type === ScheduleType.FIXED ? <Clock size={20} /> : <Repeat size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{schedule.name}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      {schedule.type} • {schedule.soundIds === 'random' ? 'Random Mix' : 'Specific File'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenModal(schedule)}
                    className="text-slate-400 hover:text-green-600 p-2"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => toggleSchedule(schedule.id)}
                    className={`w-12 h-7 rounded-full transition-colors relative ${schedule.isActive ? 'bg-green-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${schedule.isActive ? 'left-6' : 'left-1'}`} />
                  </button>
                  <button onClick={() => deleteSchedule(schedule.id)} className="text-slate-300 p-2">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-lg font-black text-slate-800">
                    {schedule.startTime} - {schedule.endTime}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {daysOfWeek.map((day, i) => (
                      <span key={i} className={`text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${schedule.days.includes(i) ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
                {schedule.type === ScheduleType.INTERVAL && (
                  <p className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    Every {schedule.intervalMinutes}m
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">
                {editingSchedule.name ? 'Edit Schedule' : 'New Schedule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Schedule Name</label>
                <input 
                  type="text"
                  placeholder="e.g., Morning Deterrent"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  value={editingSchedule.name || ''}
                  onChange={(e) => setEditingSchedule({...editingSchedule, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Start Time</label>
                  <input 
                    type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    value={editingSchedule.startTime || '06:00'}
                    onChange={(e) => setEditingSchedule({...editingSchedule, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">End Time</label>
                  <input 
                    type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    value={editingSchedule.endTime || '18:00'}
                    onChange={(e) => setEditingSchedule({...editingSchedule, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Schedule Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[ScheduleType.FIXED, ScheduleType.INTERVAL].map((type) => (
                    <button
                      key={type}
                      onClick={() => setEditingSchedule({...editingSchedule, type})}
                      className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all ${editingSchedule.type === type ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                    >
                      {type === ScheduleType.FIXED ? 'Fixed Window' : 'Interval Based'}
                    </button>
                  ))}
                </div>
              </div>

              {editingSchedule.type === ScheduleType.INTERVAL && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Interval (Minutes)</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    value={editingSchedule.intervalMinutes || 30}
                    onChange={(e) => setEditingSchedule({...editingSchedule, intervalMinutes: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Active Days</label>
                <div className="flex justify-between">
                  {daysOfWeek.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${editingSchedule.days?.includes(i) ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-slate-500 bg-white border border-slate-200 active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-4 px-6 rounded-2xl text-sm font-bold text-white bg-green-600 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={3} />
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
