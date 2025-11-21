import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Vehicle, VehicleStatus } from '../types';
import { ServiceModal } from '../components/ServiceModal';
import { JustificationModal } from '../components/JustificationModal';
import { Volume2, VolumeX, AlertOctagon, MapPin, AlertTriangle, CheckCircle2, FileText, Zap, MoreHorizontal, Timer } from 'lucide-react';

interface UnitDashboardProps {
  state: AppState;
  onServiceVehicle: (vehicleId: string, employeeId: string, photos: string[]) => void;
  onJustifyVehicle: (vehicleId: string, category: string, text: string) => void;
  onSilenceAlarm: (vehicleId: string) => void;
}

// Componente de Cartão Estatístico Minimalista
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

// Componente de Cartão de Veículo "Ticket Style"
const VehicleTicket: React.FC<{
  vehicle: Vehicle;
  currentTime: Date;
  onService: (v: Vehicle) => void;
  onJustify: (v: Vehicle) => void;
}> = ({ vehicle, currentTime, onService, onJustify }) => {
  const [isOpen, setIsOpen] = useState(false);

  const etaDate = new Date(vehicle.eta);
  const isLate = currentTime > etaDate && vehicle.status === VehicleStatus.PENDING;
  const timeString = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const minutesDiff = Math.floor((currentTime.getTime() - etaDate.getTime()) / 60000);

  // Configuração de Cores e Ícones baseada no status
  const config = useMemo(() => {
    if (vehicle.status === VehicleStatus.COMPLETED) return { color: 'green', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500', icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />, text: 'Atendido' };
    if (vehicle.status === VehicleStatus.LATE_JUSTIFIED) return { color: 'yellow', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500', icon: <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />, text: 'Justificado' };
    if (isLate) return { color: 'red', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-sle-red', icon: <AlertTriangle className="w-5 h-5 text-sle-red dark:text-red-400 animate-pulse" />, text: `Atrasado (${minutesDiff}m)` };
    return { color: 'blue', bg: 'bg-white dark:bg-slate-800', border: 'border-sle-blue', icon: <Timer className="w-5 h-5 text-sle-blue dark:text-blue-400" />, text: 'No Horário' };
  }, [vehicle.status, isLate, minutesDiff]);

  return (
    <div 
      className={`group relative bg-white dark:bg-slate-900 rounded-3xl shadow-sm hover:shadow-md dark:shadow-black/20 transition-all duration-300 overflow-hidden mb-4 border border-slate-100 dark:border-slate-800 ${isOpen ? 'ring-2 ring-offset-2 ring-sle-blue/10 dark:ring-offset-slate-950' : ''}`}
    >
      {/* Faixa lateral indicadora de status */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLate ? 'bg-sle-red' : (vehicle.status === 'COMPLETED' ? 'bg-green-500' : 'bg-sle-blue')}`} />

      {/* Cabeçalho Clicável */}
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
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${config.bg} text-${config.color}-700 dark:text-${config.color}-300`}>
            {config.text}
          </span>
        </div>
      </div>

      {/* Área Expandida (Detalhes e Ações) */}
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-5 pt-0 pl-6 pb-6 space-y-4">
            
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mb-4" />

            {vehicle.status === VehicleStatus.PENDING ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onService(vehicle); }}
                  className="flex flex-col items-center justify-center gap-2 bg-sle-navy dark:bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-sle-navy/20 active:scale-95 transition-all hover:bg-slate-800 dark:hover:bg-blue-700"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold text-sm">Atender</span>
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

export const UnitDashboard: React.FC<UnitDashboardProps> = ({ state, onServiceVehicle, onJustifyVehicle, onSilenceAlarm }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedVehicleForService, setSelectedVehicleForService] = useState<Vehicle | null>(null);
  const [selectedVehicleForJustify, setSelectedVehicleForJustify] = useState<Vehicle | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'late' | 'done'>('pending');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unitVehicles = state.vehicles.filter(v => v.unitId === state.currentUser?.unitId && v.status !== VehicleStatus.CANCELLED);
  const unitEmployees = state.employees.filter(e => e.unitId === state.currentUser?.unitId && e.active);
  const unitConfig = state.units.find(u => u.id === state.currentUser?.unitId);

  // Counts
  const pendingCount = unitVehicles.filter(v => v.status === VehicleStatus.PENDING).length;
  const doneCount = unitVehicles.filter(v => v.status === VehicleStatus.COMPLETED || v.status === VehicleStatus.LATE_JUSTIFIED).length;
  
  // Alarm Logic
  const lateVehicles = unitVehicles.filter(v => {
    const isPending = v.status === VehicleStatus.PENDING;
    const isLate = new Date() > new Date(v.eta);
    return isPending && isLate;
  });
  const lateCount = lateVehicles.length;

  const isModalOpen = !!selectedVehicleForService || !!selectedVehicleForJustify;

  useEffect(() => {
    if (lateVehicles.length > 0 && !isMuted && !isModalOpen) {
      playAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [lateVehicles.length, isMuted, isModalOpen]);

  const playAlarm = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (!oscillatorRef.current) {
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;
    }
  };

  const stopAlarm = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
  };

  const handleSilence = () => {
    setIsMuted(true);
    stopAlarm();
    lateVehicles.forEach(v => onSilenceAlarm(v.id));
  };

  // Filtering Logic
  const filteredVehicles = unitVehicles.filter(v => {
    const isPending = v.status === VehicleStatus.PENDING;
    const isLate = new Date() > new Date(v.eta);
    
    if (filter === 'pending') return isPending && !isLate;
    if (filter === 'late') return isPending && isLate;
    if (filter === 'done') return !isPending;
    // 'all' combines Pending + Late (Operational View)
    return isPending; 
  }).sort((a, b) => {
     // Sort logic: Lates first, then by time
     const isLateA = new Date() > new Date(a.eta) && a.status === 'PENDING';
     const isLateB = new Date() > new Date(b.eta) && b.status === 'PENDING';
     if (isLateA && !isLateB) return -1;
     if (!isLateA && isLateB) return 1;
     return new Date(a.eta).getTime() - new Date(b.eta).getTime();
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
                isActive={filter === 'all' || filter === 'pending'} 
             />
          </div>
          <div onClick={() => setFilter('late')} className="cursor-pointer transition-transform active:scale-95">
             <StatCard 
                label="Atrasados" 
                value={lateCount} 
                color="red" 
                icon={<AlertTriangle className="w-5 h-5" />} 
                isActive={filter === 'late' || (filter === 'all' && lateCount > 0)} 
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
        
        {/* Alarm Banner (Floating) */}
        {lateVehicles.length > 0 && (
          <div className="mb-6 bg-red-600 dark:bg-red-700 text-white rounded-2xl p-5 shadow-xl shadow-red-200 dark:shadow-none flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <AlertOctagon className={`w-6 h-6 ${!isMuted ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Atraso Crítico</h3>
                <p className="text-red-100 text-xs font-medium opacity-90">
                  {lateVehicles.length} veículo(s) requer(em) atenção.
                </p>
              </div>
            </div>
            <button 
              onClick={handleSilence}
              className="bg-white text-red-600 w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Filter Tabs (Visual Only - Functional via Stats) */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button onClick={() => setFilter('all')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'all' ? 'bg-sle-navy text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
            Todos
          </button>
          <button onClick={() => setFilter('late')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'late' ? 'bg-red-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
            Críticos
          </button>
          <button onClick={() => setFilter('done')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${filter === 'done' ? 'bg-green-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>
            Histórico
          </button>
        </div>

        {/* Vehicles List */}
        <div className="space-y-4 min-h-[50vh]">
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700 opacity-50">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4 transition-colors">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <p className="font-bold text-lg">Tudo tranquilo por aqui.</p>
              <p className="text-sm">Nenhum veículo nesta categoria.</p>
            </div>
          ) : (
            filteredVehicles.map((vehicle, index) => (
              <div key={vehicle.id} className="animate-in slide-in-from-bottom-4 duration-500" style={{animationDelay: `${index * 50}ms`}}>
                <VehicleTicket 
                  vehicle={vehicle} 
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
          employees={unitEmployees}
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
    </div>
  );
};