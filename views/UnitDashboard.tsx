
import React, { useState, useEffect } from 'react';
import { AppState, Vehicle, VehicleStatus, Unit } from '../types';
import { ServiceModal } from '../components/ServiceModal';
import { JustificationModal } from '../components/JustificationModal';
import { AlertOctagon, MapPin, AlertTriangle, CheckCircle2, FileText, Zap, MoreHorizontal, Timer, Plus, Save, Truck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

interface UnitDashboardProps {
  state: AppState;
  onServiceVehicle: (vehicleId: string, employeeId: string, photos: string[]) => void;
  onJustifyVehicle: (vehicleId: string, category: string, text: string) => void;
  onSilenceAlarm: (vehicleId: string) => void;
  onAddVehicle?: (data: any) => void; // Made optional to avoid breaking tests if not passed immediately
}

// Minimalist Stat Card
const StatCard: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode; isActive?: boolean }> = ({ label, value, color, icon, isActive }) => (
  <div className={`flex flex-col justify-between p-4 rounded-2xl min-w-[140px] h-28 transition-all duration-300 border backdrop-blur-sm
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

// Ticket Style Vehicle Card
const VehicleTicket: React.FC<{
  vehicle: Vehicle;
  currentUnitId: string;
  currentTime: Date;
  onService: (v: Vehicle) => void;
  onJustify: (v: Vehicle) => void;
}> = ({ vehicle, currentUnitId, currentTime, onService, onJustify }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Find the stop data for this dashboard's unit
  const currentStop = vehicle.stops.find(s => s.unitId === currentUnitId);
  if (!currentStop) return null;

  const etaDate = new Date(currentStop.eta);
  const isLate = currentTime > etaDate && currentStop.status === VehicleStatus.PENDING;
  const timeString = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateString = etaDate.toLocaleDateString('pt-BR');
  const minutesDiff = Math.floor((currentTime.getTime() - etaDate.getTime()) / 60000);

  const config = (() => {
    if (currentStop.status === VehicleStatus.COMPLETED) return { color: 'green', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500', icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />, text: 'Atendido' };
    if (currentStop.status === VehicleStatus.LATE_JUSTIFIED) return { color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500', icon: <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />, text: 'Justificado' };
    if (isLate) return { color: 'red', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-sle-red', icon: <AlertTriangle className="w-5 h-5 text-sle-red dark:text-red-400 animate-pulse" />, text: `Atrasado (${minutesDiff}m)` };
    return { color: 'blue', bg: 'bg-white dark:bg-slate-800', border: 'border-sle-blue', icon: <Timer className="w-5 h-5 text-sle-blue dark:text-blue-400" />, text: 'No Horário' };
  })();

  return (
    <div 
      className={`group relative bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-md dark:shadow-black/20 transition-all duration-300 overflow-hidden mb-4 border border-slate-100 dark:border-slate-800 ${isOpen ? 'ring-2 ring-offset-2 ring-sle-blue/10 dark:ring-offset-slate-950' : ''}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLate ? 'bg-sle-red' : (currentStop.status === 'COMPLETED' ? 'bg-green-500' : 'bg-sle-blue')}`} />

      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 pl-6 flex items-center justify-between cursor-pointer active:bg-slate-50/50 dark:active:bg-slate-800/50 active:scale-[0.99] transition-transform"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h4 className="text-2xl font-bold text-sle-navy dark:text-white tracking-tight">{vehicle.number}</h4>
            {isLate && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {vehicle.route}
          </span>
        </div>

        <div className="text-right">
          <div className={`flex items-center justify-end gap-1.5 mb-1 ${isLate ? 'text-sle-red dark:text-red-400' : 'text-sle-navy dark:text-slate-200'}`}>
             {config.icon}
             <span className="text-xl font-bold">{timeString}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mb-1">{dateString}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${config.bg} text-${config.color}-700 dark:text-${config.color}-300`}>
            {config.text}
          </span>
        </div>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-5 pt-0 pl-6 pb-6 space-y-4">
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mb-4" />
            {currentStop.status === VehicleStatus.PENDING ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onService(vehicle); }}
                  className="flex flex-col items-center justify-center gap-2 bg-sle-navy dark:bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-sle-navy/20 active:scale-95 transition-all hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold text-sm">
                     {currentStop.type === 'ORIGIN' ? 'Confirmar Saída' : 'Confirmar Chegada'}
                  </span>
                </button>

                {isLate ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onJustify(vehicle); }}
                    className="flex flex-col items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl active:scale-95 transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <FileText className="w-6 h-6" />
                    <span className="font-bold text-sm">Justificar</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl cursor-not-allowed">
                    <MoreHorizontal className="w-6 h-6" />
                    <span className="font-bold text-xs">Mais Ações</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Processo finalizado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW TRIP FORM MODAL ---
const NewTripModal: React.FC<{ units: Unit[]; onClose: () => void; onSave: (data: any) => void }> = ({ units, onClose, onSave }) => {
  const [form, setForm] = useState({
     number: '',
     route: '',
     // Stops
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
    
    // Origin
    stops.push({
        unitId: form.originId,
        type: 'ORIGIN',
        eta: new Date(`${form.originDate}T${form.originTime}:00`).toISOString()
    });

    // Intermediate
    if (form.hasIntermediate) {
        stops.push({
            unitId: form.intId,
            type: 'INTERMEDIATE',
            eta: new Date(`${form.intDate}T${form.intTime}:00`).toISOString()
        });
    }

    // Dest
    stops.push({
        unitId: form.destId,
        type: 'DESTINATION',
        eta: new Date(`${form.destDate}T${form.destTime}:00`).toISOString()
    });

    onSave({
        number: form.number,
        route: form.route,
        stops
    });
  };

  const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase mb-1";

  return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
           <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-950 z-10">
              <h3 className="font-bold text-lg text-sle-navy dark:text-white">Nova Viagem</h3>
              <button onClick={onClose}><Plus className="rotate-45" /></button>
           </div>
           <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                 <label className={labelClass}>Veículo / Frota</label>
                 <input required type="text" className={inputClass} value={form.number} onChange={e => setForm({...form, number: e.target.value})} placeholder="Ex: V-100" />
              </div>
              <div>
                 <label className={labelClass}>Nome da Viagem</label>
                 <input required type="text" className={inputClass} value={form.route} onChange={e => setForm({...form, route: e.target.value})} placeholder="Ex: Rota Extra" />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                 <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ORIGEM</span>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="col-span-2">
                        <select className={inputClass} value={form.originId} onChange={e => setForm({...form, originId: e.target.value})}>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <input type="date" className={inputClass} value={form.originDate} onChange={e => setForm({...form, originDate: e.target.value})} />
                    <input type="time" className={inputClass} value={form.originTime} onChange={e => setForm({...form, originTime: e.target.value})} />
                 </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                 <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={form.hasIntermediate} onChange={e => setForm({...form, hasIntermediate: e.target.checked})} />
                    <span className="text-sm font-bold">Adicionar Parada Intermediária (Opcional)</span>
                 </label>
                 {form.hasIntermediate && (
                     <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                        <div className="col-span-2">
                            <select className={inputClass} value={form.intId} onChange={e => setForm({...form, intId: e.target.value})}>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <input type="date" className={inputClass} value={form.intDate} onChange={e => setForm({...form, intDate: e.target.value})} />
                        <input type="time" className={inputClass} value={form.intTime} onChange={e => setForm({...form, intTime: e.target.value})} />
                     </div>
                 )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                 <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">DESTINO</span>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="col-span-2">
                        <select className={inputClass} value={form.destId} onChange={e => setForm({...form, destId: e.target.value})}>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <input type="date" className={inputClass} value={form.destDate} onChange={e => setForm({...form, destDate: e.target.value})} />
                    <input type="time" className={inputClass} value={form.destTime} onChange={e => setForm({...form, destTime: e.target.value})} />
                 </div>
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
  const [filter, setFilter] = useState<'all' | 'late' | 'done'>('all');
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  
  const currentUnitId = state.currentUser?.unitId || '';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter vehicles that have a stop at this unit
  const relevantVehicles = state.vehicles.filter(v => 
      v.status !== VehicleStatus.CANCELLED && 
      v.stops.some(s => s.unitId === currentUnitId)
  );

  const unitConfig = state.units.find(u => u.id === currentUnitId);

  // Helper to get stop data
  const getStop = (v: Vehicle) => v.stops.find(s => s.unitId === currentUnitId);

  // Counts
  const pendingCount = relevantVehicles.filter(v => getStop(v)?.status === VehicleStatus.PENDING).length;
  const doneCount = relevantVehicles.filter(v => {
      const s = getStop(v);
      return s?.status === VehicleStatus.COMPLETED || s?.status === VehicleStatus.LATE_JUSTIFIED;
  }).length;
  
  const lateVehicles = relevantVehicles.filter(v => {
    const s = getStop(v);
    return s?.status === VehicleStatus.PENDING && new Date() > new Date(s.eta);
  });
  const lateCount = lateVehicles.length;

  // Filtering & Sorting Logic
  const filteredVehicles = relevantVehicles.filter(v => {
    const stop = getStop(v);
    if (!stop) return false;
    
    const isPending = stop.status === VehicleStatus.PENDING;
    const isLate = new Date() > new Date(stop.eta);
    
    if (filter === 'late') return isPending && isLate;
    if (filter === 'done') return !isPending;
    // 'all' means ALL PENDING (Late + Future)
    return isPending; 
  }).sort((a, b) => {
     const stopA = getStop(a);
     const stopB = getStop(b);
     if (!stopA || !stopB) return 0;
     
     // Sort by ETA ascending (earliest first)
     return new Date(stopA.eta).getTime() - new Date(stopB.eta).getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-safe transition-colors duration-300">
      
      {/* Header Minimalista */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-16 z-30 pt-4 pb-2 px-4 shadow-sm border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-end mb-4 container mx-auto max-w-2xl">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Operação</p>
            <h2 className="text-xl font-bold text-sle-navy dark:text-white leading-none">{unitConfig?.name}</h2>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
             <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{currentTime.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
        </div>

        {/* Scrollable Stats (KPIs) */}
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar container mx-auto max-w-2xl">
          <div onClick={() => setFilter('all')} className="cursor-pointer transition-transform active:scale-95">
             <StatCard 
                label="Na Fila" 
                value={pendingCount} 
                color="blue" 
                icon={<Zap className="w-5 h-5" />} 
                isActive={filter === 'all'} 
             />
          </div>
          <div onClick={() => setFilter('late')} className="cursor-pointer transition-transform active:scale-95">
             <StatCard 
                label="Atrasados" 
                value={lateCount} 
                color="red" 
                icon={<AlertTriangle className="w-5 h-5" />} 
                isActive={filter === 'late'} 
             />
          </div>
          <div onClick={() => setFilter('done')} className="cursor-pointer transition-transform active:scale-95">
             <StatCard 
                label="Finalizados" 
                value={doneCount} 
                color="green" 
                icon={<CheckCircle2 className="w-5 h-5" />} 
                isActive={filter === 'done'} 
             />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'all' ? 'bg-sle-navy text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
                    Pendentes
                </button>
                <button onClick={() => setFilter('late')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'late' ? 'bg-red-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
                    Atrasados
                </button>
                <button onClick={() => setFilter('done')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'done' ? 'bg-green-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
                    Histórico
                </button>
            </div>
            
            {onAddVehicle && (
                <button 
                    onClick={() => setShowNewTripModal(true)}
                    className="bg-white dark:bg-slate-800 p-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm text-sle-blue dark:text-blue-400 hover:scale-110 transition-transform"
                    title="Registrar Viagem Extra"
                >
                    <Plus className="w-5 h-5" />
                </button>
            )}
        </div>

        {/* Vehicles List */}
        <div className="space-y-4 min-h-[50vh]">
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700 opacity-50">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4 transition-colors">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <p className="font-bold text-lg">Nenhuma viagem listada.</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="animate-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                <VehicleTicket 
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

      {/* Modals */}
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
