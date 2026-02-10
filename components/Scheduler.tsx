
import React, { useState, useEffect } from 'react';
import { Plus, Clock, Trash2, Edit2, X, Check, Music, Shuffle, RotateCcw } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { firebaseService } from '../services/firebaseService';
import { Schedule, ScheduleType, SoundFile } from '../types';

const Scheduler: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);

  useEffect(() => {
    loadData();
    // Subscribe to Firebase changes specifically for this UI view
    const unsubscribe = firebaseService.subscribeToSchedules((remoteSchedules) => {
      setSchedules(remoteSchedules);
    });
    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    const [schedData, soundData] = await Promise.all([
      databaseService.getSchedules(),
      databaseService.getSounds()
    ]);
    setSchedules(schedData);
    setSounds(soundData);
  };

  const handleOpenModal = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
    } else {
      setEditingSchedule({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        type: ScheduleType.FIXED,
        time: '08:00',
        playbackCount: 1,
        isActive: true,
        soundIds: 'random',
        days: [1, 2, 3, 4, 5],
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (editingSchedule && editingSchedule.name) {
      const scheduleToSave = {
        ...editingSchedule,
        playbackCount: Math.max(1, editingSchedule.playbackCount || 1)
      } as Schedule;
      
      // Dual-write: Local and Firebase
      await databaseService.saveSchedule(scheduleToSave);
      await firebaseService.saveScheduleRemote(scheduleToSave);
      
      setIsModalOpen(false);
      setEditingSchedule(null);
      await loadData();
    } else {
      alert("Please provide a name for the schedule.");
    }
  };

  const toggleSchedule = async (id: string) => {
    const target = schedules.find(s => s.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };
    
    // Dual-write: Local and Firebase
    await databaseService.saveSchedule(updated);
    await firebaseService.saveScheduleRemote(updated);
    
    await loadData();
  };

  const deleteSchedule = async (id: string) => {
    if (confirm('Delete this schedule from both local and cloud?')) {
      await databaseService.deleteSchedule(id);
      await firebaseService.deleteScheduleRemote(id);
      await loadData();
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (!editingSchedule) return;
    const currentDays = editingSchedule.days || [];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter(d => d !== dayIndex)
      : [...currentDays, dayIndex].sort();
    setEditingSchedule({ ...editingSchedule, days: newDays });
  };

  const toggleSoundSelection = (soundId: string) => {
    if (!editingSchedule) return;
    let currentIds = editingSchedule.soundIds;
    if (currentIds === 'random') {
      currentIds = [soundId];
    } else if (Array.isArray(currentIds)) {
      currentIds = currentIds.includes(soundId)
        ? currentIds.filter(id => id !== soundId)
        : [...currentIds, soundId];
    }
    setEditingSchedule({ ...editingSchedule, soundIds: currentIds });
  };

  const selectAllSounds = () => {
    if (!editingSchedule) return;
    const allIds = sounds.map(s => s.id);
    setEditingSchedule({ ...editingSchedule, soundIds: allIds });
  };

  const deselectAllSounds = () => {
    if (!editingSchedule) return;
    setEditingSchedule({ ...editingSchedule, soundIds: [] });
  };

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-8 py-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Triggers</h1>
          <p className="text-slate-500 font-medium">Cloud Synchronized Schedules</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white flex items-center gap-3 px-6 py-4 rounded-[24px] shadow-xl shadow-green-100 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          <span className="text-sm font-black uppercase tracking-widest hidden md:inline">Add Trigger</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.length === 0 ? (
          <div className="col-span-full bg-white rounded-[40px] p-16 border-2 border-dashed border-slate-100 text-center">
            <Clock size={64} className="mx-auto text-slate-100 mb-6" />
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">No Active Schedules</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Schedules are synced between all your devices via Firebase.</p>
          </div>
        ) : (
          schedules.map(schedule => (
            <div 
              key={schedule.id}
              className={`bg-white rounded-[32px] p-6 shadow-sm border transition-all duration-300 flex flex-col justify-between ${schedule.isActive ? 'border-green-100 ring-4 ring-green-50/50' : 'border-slate-100 opacity-60'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${schedule.isActive ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">{schedule.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                        {schedule.playbackCount || 1} Cycles
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenModal(schedule)}
                    className="text-slate-400 hover:text-green-600 p-2.5 rounded-xl hover:bg-green-50 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => deleteSchedule(schedule.id)} className="text-slate-300 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-end bg-slate-50/50 p-4 rounded-[24px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{schedule.time}</span>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${schedule.isActive ? 'bg-green-600 text-white' : 'bg-slate-300 text-white'}`}>Active</span>
                  </div>
                  <div className="flex gap-1.5">
                    {daysOfWeek.map((day, i) => (
                      <span key={i} className={`text-[9px] font-black w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${schedule.days.includes(i) ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-300 border border-slate-100'}`}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => toggleSchedule(schedule.id)}
                  className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${schedule.isActive ? 'bg-green-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${schedule.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal - Tablet Optimized */}
      {isModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {editingSchedule.name ? 'Modify Event' : 'Create New Trigger'}
                </h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure Field Timing</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1">Event Description</label>
                    <input 
                      type="text"
                      placeholder="e.g., Morning Perimeter Alarm"
                      className="w-full bg-slate-50 border border-slate-100 rounded-[20px] px-5 py-4 text-sm font-black focus:outline-none focus:ring-4 focus:ring-green-500/10 transition-all"
                      value={editingSchedule.name || ''}
                      onChange={(e) => setEditingSchedule({...editingSchedule, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1">Daily Recurrence</label>
                    <div className="flex justify-between gap-2">
                      {daysOfWeek.map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay(i)}
                          className={`w-10 h-10 rounded-xl text-xs font-black border transition-all ${editingSchedule.days?.includes(i) ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1">Playback Cycles</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingSchedule({...editingSchedule, playbackCount: 1})}
                        className={`flex-1 py-4 px-4 rounded-[20px] text-xs font-black border transition-all ${editingSchedule.playbackCount === 1 ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                      >
                        Single
                      </button>
                      <div className={`flex-[1.5] flex items-center bg-slate-50 border rounded-[20px] px-5 gap-3 transition-all ${editingSchedule.playbackCount && editingSchedule.playbackCount > 1 ? 'border-green-600 ring-4 ring-green-50' : 'border-slate-100'}`}>
                        <RotateCcw size={18} className={editingSchedule.playbackCount && editingSchedule.playbackCount > 1 ? 'text-green-600' : 'text-slate-300'} />
                        <input 
                          type="number"
                          min="2"
                          placeholder="Repeat (x)"
                          className="w-full bg-transparent py-4 text-sm font-black focus:outline-none"
                          value={editingSchedule.playbackCount && editingSchedule.playbackCount > 1 ? editingSchedule.playbackCount : ''}
                          onChange={(e) => setEditingSchedule({...editingSchedule, playbackCount: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 text-center">Trigger Time (HH:MM)</label>
                    <input 
                      type="time"
                      className="w-full bg-slate-900 text-white rounded-[32px] px-4 py-8 text-5xl font-black text-center focus:outline-none shadow-2xl transition-all"
                      value={editingSchedule.time || '08:00'}
                      onChange={(e) => setEditingSchedule({...editingSchedule, time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Audio Profile</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSchedule({...editingSchedule, soundIds: 'random'})}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black border flex items-center justify-center gap-2 transition-all ${editingSchedule.soundIds === 'random' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                      >
                        <Shuffle size={14} /> SHUFFLE
                      </button>
                      <button
                        onClick={() => setEditingSchedule({...editingSchedule, soundIds: editingSchedule.soundIds === 'random' ? [] : editingSchedule.soundIds})}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black border flex items-center justify-center gap-2 transition-all ${editingSchedule.soundIds !== 'random' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                      >
                        <Music size={14} /> CUSTOM
                      </button>
                    </div>
                    {editingSchedule.soundIds !== 'random' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-black uppercase text-slate-400">Library Selection</span>
                          <div className="flex gap-2">
                            <button onClick={selectAllSounds} className="text-[9px] font-black text-green-600 hover:text-green-700 uppercase">Use All</button>
                            <span className="text-[9px] text-slate-300">/</span>
                            <button onClick={deselectAllSounds} className="text-[9px] font-black text-slate-400 hover:text-slate-500 uppercase">None</button>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-[24px] p-2 border border-slate-100 max-h-48 overflow-y-auto custom-scrollbar">
                          {sounds.length === 0 ? (
                            <p className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">No sounds found</p>
                          ) : (
                            sounds.map(sound => (
                              <div 
                                key={sound.id}
                                onClick={() => toggleSoundSelection(sound.id)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer mb-1 last:mb-0 ${Array.isArray(editingSchedule.soundIds) && editingSchedule.soundIds.includes(sound.id) ? 'bg-white shadow-sm ring-1 ring-green-200' : 'hover:bg-white/50'}`}
                              >
                                <span className={`text-[11px] font-bold ${Array.isArray(editingSchedule.soundIds) && editingSchedule.soundIds.includes(sound.id) ? 'text-green-900' : 'text-slate-500'}`}>{sound.name}</span>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${Array.isArray(editingSchedule.soundIds) && editingSchedule.soundIds.includes(sound.id) ? 'bg-green-600 border-green-600' : 'border-slate-200'}`}>
                                  {Array.isArray(editingSchedule.soundIds) && editingSchedule.soundIds.includes(sound.id) && <Check size={10} className="text-white" strokeWidth={5} />}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 px-6 rounded-[24px] text-sm font-black text-slate-500 bg-white border border-slate-200 active:scale-95 transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-5 px-6 rounded-[24px] text-sm font-black text-white bg-green-600 shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
              >
                <Check size={20} strokeWidth={4} />
                Deploy Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
