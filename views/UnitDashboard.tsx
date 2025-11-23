

import React, { useState, useEffect, useRef } from 'react';
import { AppState, Vehicle, VehicleStatus, Unit } from '../types';
import { ServiceModal } from '../components/ServiceModal';
import { JustificationModal } from '../components/JustificationModal';
import { VehicleCard } from '../components/VehicleCard';
import { AlertOctagon, AlertTriangle, CheckCircle2, Zap, Plus, Save, BellOff, BellRing, Filter, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/Button';

interface UnitDashboardProps {
  state: AppState;
  onServiceVehicle: (vehicleId: string, employeeId: string, photos: string[]) => void;
  onJustifyVehicle: (vehicleId: string, category: string, text: string) => void;
  onSilenceAlarm: (vehicleId: string) => void;
  onAddVehicle?: (data: any) => void;
}

// Minimalist Stat Card
const StatCard: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode; isActive?: boolean }> = ({ label, value, color, icon, isActive }) => (
  <div className={`flex flex-col justify-between p-4 rounded-2xl min-w-[140px] h-28 transition-all duration-300 border backdrop-blur-sm cursor-pointer
    ${isActive 
      ? `bg-white dark:bg-slate-800 shadow-lg scale-105 border-${color}-100 dark:border-${color}-900` 
      : 'bg-white/60 dark:bg-slate-900/80 border-transparent shadow-sm scale-100 opacity-70 hover:opacity-100'
    }`}>
    <div className={`p-2 rounded-full w-fit transition-colors
      ${isActive 
        ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400` 
        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
      }`}>
      {icon}
    </div>
    <div>
      <span className={`text-2xl font-bold text-sle-navy dark:text-white`}>{value}</span>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  </div>
);

// --- NEW TRIP FORM MODAL ---
const NewTripModal: React.FC<{ units: Unit[]; onClose: () => void; onSave: (data: any) => void }> = ({ units, onClose, onSave }) => {
  const [form, setForm] = useState({
     number: '',
     route: '',
     originId: units[0]?.id || '',
     originDate: new Date().toISOString().split('T')[0],
     originTime: '08:00',
     hasIntermediate: false,
     intId: units.length > 1 ? units[1].id : '',
     intDate: new Date().toISOString().split('T')[0],
     intTime: '12:00',
     destId: units.length > 1 ? units[units.length - 1].id : '',
     destDate: new Date().toISOString().split('T')[0],
     destTime: '18:00'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stops = [];
    stops.push({
        unitId: form.originId,
        type: 'ORIGIN',
        eta: new Date(`${form.originDate}T${form.originTime}:00`).toISOString(),
        status: VehicleStatus.PENDING
    });
    if (form.hasIntermediate) {
        stops.push({
            unitId: form.intId,
            type: 'INTERMEDIATE',
            eta: new Date(`${form.intDate}T${form.intTime}:00`).toISOString(),
            status: VehicleStatus.PENDING
        });
    }
    stops.push({
        unitId: form.destId,
        type: 'DESTINATION',
        eta: new Date(`${form.destDate}T${form.destTime}:00`).toISOString(),
        status: VehicleStatus.PENDING
    });
    onSave({ number: form.number, route: form.route, stops });
  };

  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm";

  return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10">
              <h3 className="font-bold text-lg">Nova Viagem (Rápida)</h3>
              <button onClick={onClose}><Plus className="rotate-45" /></button>
           </div>
           <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Veículo</label>
                 <input required type="text" className={inputClass} value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="Ex: V-100" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rota</label>
                 <input required type="text" className={inputClass} value={form.route} onChange={e => setForm({...form, route: e.target.value})} />
              </div>
              <Button type="submit" className="w-full mt-4" icon={<Save className="w-4 h-4"/>}>Salvar Viagem</Button>
           </form>
        </div>
     </div>
  );
};

export const UnitDashboard: React.FC<UnitDashboardProps> = ({ state, onServiceVehicle, onJustifyVehicle, onSilenceAlarm, onAddVehicle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedVehicleForService, setSelectedVehicleForService] = useState<Vehicle | null>(null);
  const [selectedVehicleForJustify, setSelectedVehicleForJustify] = useState<Vehicle | null>(null);
  
  // Filter State - DEFAULT IS 'PENDING' (Fila)
  const [filter, setFilter] = useState<'all' | 'pending' | 'late' | 'done'>('pending');
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  
  // Audio & Alarm State
  const [silencedAlarms, setSilencedAlarms] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentUnitId = state.currentUser?.unitId || '';
  const unitConfig = state.units.find(u => u.id === currentUnitId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStop = (v: Vehicle) => v.stops.find(s => s.unitId === currentUnitId);

  // --- CORE FILTERING LOGIC ---
  const visibleVehicles = state.vehicles.filter(v => {
      if (v.status === VehicleStatus.CANCELLED) return false;
      
      const stop = getStop(v);
      if (!stop) return false;

      const stopDate = new Date(stop.eta);
      const now = new Date();
      
      // Reset times to compare just dates
      const stopDay = new Date(stopDate.getFullYear(), stopDate.getMonth(), stopDate.getDate()).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const isToday = stopDay === today;
      const isPast = stopDay < today;

      if (isToday) return true; // Rule 1: Show everything from today
      if (isPast && stop.status === VehicleStatus.PENDING) return true; // Rule 2: Show backlog

      return false; // Hide everything else
  });

  // --- SECONDARY FILTERING (BUTTONS) & SORTING ---
  const filteredVehicles = visibleVehicles.filter(v => {
    const stop = getStop(v);
    if (!stop) return false;
    
    const isPending = stop.status === VehicleStatus.PENDING;
    const isLate = isPending && currentTime > new Date(stop.eta);
    const isDone = stop.status === VehicleStatus.COMPLETED || stop.status === VehicleStatus.LATE_JUSTIFIED;
    
    if (filter === 'pending') return isPending;
    if (filter === 'late') return isLate;
    if (filter === 'done') return isDone;
    // 'all' return true
    return true; 
  }).sort((a, b) => {
     const stopA = getStop(a);
     const stopB = getStop(b);
     if (!stopA || !stopB) return 0;
     
     const isLateA = stopA.status === VehicleStatus.PENDING && currentTime > new Date(stopA.eta);
     const isLateB = stopB.status === VehicleStatus.PENDING && currentTime > new Date(stopB.eta);

     // Sorting Logic:
     // 1. Late vehicles FIRST (Urgency)
     if (isLateA && !isLateB) return -1;
     if (!isLateA && isLateB) return 1;

     // 2. Then earliest ETA first (FIFO - Próximos a chegar)
     const timeA = new Date(stopA.eta).getTime();
     const timeB = new Date(stopB.eta).getTime();
     return timeA - timeB;
  });

  // --- ALARM LOGIC ---
  const CRITICAL_DELAY_MINUTES = 1; // Warning trigger starts immediately when late for demo purposes
  const criticalVehicles = visibleVehicles.filter(v => {
      const stop = getStop(v);
      if (!stop || stop.status !== VehicleStatus.PENDING) return false;
      
      const diffMs = currentTime.getTime() - new Date(stop.eta).getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      return diffMinutes >= 1 && !silencedAlarms.includes(v.id);
  });

  // Audio Alert Effect
  useEffect(() => {
      if (criticalVehicles.length > 0 && !isMuted) {
          if (!audioRef.current) {
              audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
              audioRef.current.volume = 0.5;
          }
          
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  console.log("Audio playback prevented by browser interaction policy.");
              });
          }
      }
  }, [criticalVehicles.length, isMuted]);

  const toggleSilence = (id: string) => {
      if (silencedAlarms.includes(id)) {
          setSilencedAlarms(prev => prev.filter(x => x !== id));
      } else {
          setSilencedAlarms(prev => [...prev, id]);
          onSilenceAlarm(id);
      }
  };

  // Stats for Cards
  const pendingCount = visibleVehicles.filter(v => getStop(v)?.status === VehicleStatus.PENDING).length;
  const lateCount = visibleVehicles.filter(v => {
      const s = getStop(v);
      return s?.status === VehicleStatus.PENDING && currentTime > new Date(s.eta);
  }).length;
  const doneCount = visibleVehicles.filter(v => {
      const s = getStop(v);
      return s?.status === VehicleStatus.COMPLETED || s?.status === VehicleStatus.LATE_JUSTIFIED;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-safe transition-colors duration-300">
      
      {/* ACTIVE ALARMS BANNER */}
      {criticalVehicles.length > 0 && (
          <div className="bg-red-600 text-white px-4 py-3 shadow-lg sticky top-16 z-40 animate-in slide-in-from-top-2">
              <div className="container mx-auto max-w-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-full animate-pulse">
                          <BellRing className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="font-bold text-sm">Atenção: {criticalVehicles.length} Veículo(s) com Atraso</p>
                          <p className="text-xs text-white/80">Justifique o atraso ou finalize o atendimento.</p>
                      </div>
                  </div>
                  <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                      {isMuted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                  </button>
              </div>
              <div className="container mx-auto max-w-2xl mt-3 space-y-2">
                  {criticalVehicles.map(v => (
                      <div key={v.id} className="bg-white/10 rounded-lg p-2 flex items-center justify-between">
                          <span className="font-bold text-sm px-2">{v.number}</span>
                          <div className="flex gap-2">
                             <button onClick={() => setSelectedVehicleForJustify(v)} className="bg-yellow-500/80 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                                 Justificar
                             </button>
                             <button 
                                onClick={() => toggleSilence(v.id)}
                                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                             >
                                 <BellOff className="w-3 h-3" /> Silenciar
                             </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* HEADER & STATS */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-16 z-30 pt-4 pb-2 px-4 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-end mb-4 container mx-auto max-w-2xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Operação</p>
            <h2 className="text-xl font-bold text-sle-navy dark:text-white leading-none">{unitConfig?.name}</h2>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full flex items-center gap-2">
             <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{currentTime.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
             <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-sle-blue">
                 {isMuted ? <VolumeX className="w-3 h-3"/> : <Volume2 className="w-3 h-3"/>}
             </button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar container mx-auto max-w-2xl">
          <div onClick={() => setFilter('pending')}>
             <StatCard label="Pendentes" value={pendingCount} color="blue" icon={<Zap className="w-5 h-5" />} isActive={filter === 'pending'} />
          </div>
          <div onClick={() => setFilter('all')}>
             <StatCard label="Agenda Dia" value={visibleVehicles.length} color="purple" icon={<AlertOctagon className="w-5 h-5" />} isActive={filter === 'all'} />
          </div>
          <div onClick={() => setFilter('late')}>
             <StatCard label="Atrasados" value={lateCount} color="red" icon={<AlertTriangle className="w-5 h-5" />} isActive={filter === 'late'} />
          </div>
          <div onClick={() => setFilter('done')}>
             <StatCard label="Atendidos" value={doneCount} color="green" icon={<CheckCircle2 className="w-5 h-5" />} isActive={filter === 'done'} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl relative">
        
        {/* ACTION BAR */}
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1 hide-scrollbar">
                <Filter className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
                <button 
                    onClick={() => setFilter('pending')} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 
                        ${filter === 'pending' 
                            ? 'bg-sle-navy text-white shadow-lg scale-105 ring-2 ring-offset-1 ring-sle-navy' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                    Fila (Prioridade)
                </button>
                <button 
                    onClick={() => setFilter('all')} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 
                        ${filter === 'all' 
                            ? 'bg-sle-navy text-white shadow-lg scale-105' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilter('late')} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 
                        ${filter === 'late' 
                            ? 'bg-sle-navy text-white shadow-lg scale-105' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                    Atrasados
                </button>
                 <button 
                    onClick={() => setFilter('done')} 
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 
                        ${filter === 'done' 
                            ? 'bg-sle-navy text-white shadow-lg scale-105' 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50'}`}
                >
                    Concluídos
                </button>
            </div>
        </div>

        {/* Floating Action Button for Add Trip - HIGHLIGHTED */}
        {onAddVehicle && (
           <div className="fixed bottom-6 right-6 z-50 animate-in zoom-in duration-300">
              <button 
                  onClick={() => setShowNewTripModal(true)}
                  className="group bg-sle-blue hover:bg-sle-navy text-white w-20 h-20 rounded-full shadow-[0_8px_25px_rgba(46,49,180,0.4)] hover:scale-105 hover:shadow-[0_15px_35px_rgba(46,49,180,0.5)] transition-all duration-300 flex flex-col items-center justify-center border-4 border-white/30 active:scale-95 ring-4 ring-sle-blue/20"
                  title="Registrar Viagem Extra"
              >
                  <Plus className="w-8 h-8 mb-1 group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Nova</span>
              </button>
           </div>
        )}

        {/* LIST */}
        <div className="space-y-4 min-h-[50vh]">
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700 opacity-50">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <p className="font-bold text-lg">Nenhum veículo neste filtro.</p>
              <p className="text-sm text-slate-400">Tudo certo por aqui.</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="animate-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                <VehicleCard 
                  vehicle={vehicle} 
                  currentUnitId={currentUnitId}
                  currentTime={currentTime}
                  onService={(v) => setSelectedVehicleForService(v)}
                  onJustify={(v) => setSelectedVehicleForJustify(v)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODALS */}
      {selectedVehicleForService && (
        <ServiceModal 
          vehicle={selectedVehicleForService} 
          employees={state.employees.filter(e => e.unitId === currentUnitId && e.active)}
          onConfirm={(empId, photos) => {
            onServiceVehicle(selectedVehicleForService.id, empId, photos);
            setSelectedVehicleForService(null);
          }}
          onClose={() => setSelectedVehicleForService(null)}
        />
      )}

      {selectedVehicleForJustify && (
        <JustificationModal
          vehicle={selectedVehicleForJustify}
          onConfirm={(category, text) => {
            onJustifyVehicle(selectedVehicleForJustify.id, category, text);
            setSelectedVehicleForJustify(null);
          }}
          onClose={() => setSelectedVehicleForJustify(null)}
        />
      )}

      {showNewTripModal && onAddVehicle && (
          <NewTripModal 
            units={state.units} 
            onClose={() => setShowNewTripModal(false)} 
            onSave={(data) => {
                onAddVehicle(data);
                setShowNewTripModal(false);
            }} 
          />
      )}
    </div>
  );
};