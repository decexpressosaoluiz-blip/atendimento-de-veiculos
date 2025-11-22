
import React, { useMemo, useState } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { Clock, MapPin, AlertTriangle, CheckCircle, FileText, CornerDownRight, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface VehicleCardProps {
  vehicle: Vehicle;
  currentUnitId: string;
  currentTime: Date;
  onService: (v: Vehicle) => void;
  onJustify: (v: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, currentUnitId, currentTime, onService, onJustify }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Find the stop relevant to the current unit
  const currentStop = vehicle.stops.find(s => s.unitId === currentUnitId);

  // If no stop matches this unit, something is wrong with filtering, but handle gracefully
  if (!currentStop) return null;

  const etaDate = new Date(currentStop.eta);
  const isPending = currentStop.status === VehicleStatus.PENDING;
  const isLate = currentTime > etaDate && isPending;
  
  // Calculate Minutes Diff
  const diffMs = currentTime.getTime() - etaDate.getTime();
  const diffMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const diffLabel = diffMs > 0 ? 'atrasado' : 'adiantado';
  
  // Format time
  const timeString = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateString = etaDate.toLocaleDateString('pt-BR');

  const statusBadge = useMemo(() => {
    if (currentStop.status === VehicleStatus.COMPLETED) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Atendido</span>;
    }
    if (currentStop.status === VehicleStatus.LATE_JUSTIFIED) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><FileText className="w-3 h-3 mr-1"/> Justificado</span>;
    }
    if (isLate) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Atrasado</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/> Aguardando</span>;
  }, [currentStop.status, isLate]);

  return (
    <Card className={`transition-all duration-300 relative overflow-hidden ${isLate ? 'border-l-4 border-l-sle-red shadow-red-100' : 'hover:shadow-elevated'}`}>
      {/* Indicador Lateral para Status (Visual rápido) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLate ? 'bg-sle-red' : isPending ? 'bg-sle-blue' : 'bg-green-500'}`}></div>

      <div className="flex justify-between items-start mb-4 pl-2">
        <div>
          <h3 className="text-2xl font-bold text-sle-navy flex items-center gap-2">
            {vehicle.number}
            {isLate && diffMinutes > 30 && <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping" title="Atraso Crítico"></span>}
          </h3>
          <div className="flex items-center text-slate-500 text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            {vehicle.route}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
           {statusBadge}
           <button 
             onClick={() => setShowDetails(!showDetails)} 
             className="text-xs flex items-center gap-1 text-slate-400 hover:text-sle-blue transition-colors mt-1"
           >
             {showDetails ? 'Menos' : 'Detalhes'}
             {showDetails ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 pl-2">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
            {currentStop.type === 'ORIGIN' ? 'Saída Prevista' : 'Chegada Prevista'}
          </span>
          <div className="flex items-baseline gap-1">
            <p className={`text-lg font-semibold leading-none ${isLate ? 'text-sle-red' : 'text-sle-blue'}`}>
                {timeString}
            </p>
            <span className="text-[10px] text-slate-400">{dateString}</span>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
           <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Etapa Atual</span>
           <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
             <CornerDownRight className="w-3 h-3 text-slate-400" />
             {currentStop.type === 'ORIGIN' ? 'Origem' : currentStop.type === 'INTERMEDIATE' ? 'Parada' : 'Destino'}
           </p>
        </div>
      </div>

      {/* Seção Expansível de Detalhes */}
      {showDetails && (
        <div className="mb-4 pl-2 animate-in slide-in-from-top-2 fade-in">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-sle-navy border border-blue-100">
            <div className="flex items-center gap-2 mb-2 font-bold text-sle-blue">
              <Info className="w-4 h-4" />
              Status Detalhado
            </div>
            <ul className="space-y-1 text-xs sm:text-sm">
              <li className="flex justify-between">
                <span>Horário Atual:</span>
                <span className="font-mono">{currentTime.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
              </li>
              <li className="flex justify-between">
                <span>Status Cronológico:</span>
                <span className={`font-bold ${isLate ? 'text-red-600' : 'text-green-600'}`}>
                  {isPending ? `${diffMinutes} min ${diffLabel}` : 'Concluído'}
                </span>
              </li>
              {currentStop.serviceTimestamp && (
                <li className="flex justify-between text-slate-500 border-t border-blue-200 pt-1 mt-1">
                  <span>Atendido em:</span>
                  <span>{new Date(currentStop.serviceTimestamp).toLocaleString('pt-BR')}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="flex gap-2 pl-2">
          <Button 
            className="flex-1 shadow-sm" 
            onClick={() => onService(vehicle)}
            icon={<CheckCircle className="w-4 h-4"/>}
          >
            {currentStop.type === 'ORIGIN' ? 'Saída' : 'Chegada'}
          </Button>
          {isLate && (
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50" 
              onClick={() => onJustify(vehicle)}
              icon={<AlertTriangle className="w-4 h-4"/>}
            >
              Justificar
            </Button>
          )}
        </div>
      )}
      
      {currentStop.status === VehicleStatus.COMPLETED && (
        <div className="pl-2">
            <div className="text-center text-xs text-green-700 font-bold py-2 bg-green-50 rounded-lg border border-green-100 flex items-center justify-center gap-2">
            <CheckCircle className="w-3 h-3"/>
            Processo Finalizado
            </div>
        </div>
      )}
    </Card>
  );
};
