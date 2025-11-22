
import React, { useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { Clock, MapPin, AlertTriangle, CheckCircle, FileText, CornerDownRight } from 'lucide-react';
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
  // Find the stop relevant to the current unit
  const currentStop = vehicle.stops.find(s => s.unitId === currentUnitId);

  // If no stop matches this unit, something is wrong with filtering, but handle gracefully
  if (!currentStop) return null;

  const etaDate = new Date(currentStop.eta);
  const isLate = currentTime > etaDate && currentStop.status === VehicleStatus.PENDING;
  
  // Format time
  const timeString = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
    <Card className={`transition-all duration-300 ${isLate ? 'border-l-4 border-l-sle-red shadow-red-100' : 'hover:shadow-elevated'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold text-sle-navy">{vehicle.number}</h3>
          <div className="flex items-center text-slate-500 text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            {vehicle.route}
          </div>
        </div>
        {statusBadge}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded-lg">
          <span className="text-xs text-slate-400 uppercase font-bold">
            {currentStop.type === 'ORIGIN' ? 'Saída Prevista' : 'Chegada Prevista'}
          </span>
          <p className={`text-lg font-semibold ${isLate ? 'text-sle-red' : 'text-sle-blue'}`}>
            {timeString}
          </p>
          <span className="text-[10px] text-slate-400">{etaDate.toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
           <span className="text-xs text-slate-400 uppercase font-bold">Etapa</span>
           <p className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-1">
             <CornerDownRight className="w-3 h-3" />
             {currentStop.type === 'ORIGIN' ? 'Origem' : currentStop.type === 'INTERMEDIATE' ? 'Parada Intermediária' : 'Destino Final'}
           </p>
        </div>
      </div>

      {currentStop.status === VehicleStatus.PENDING && (
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={() => onService(vehicle)}
            icon={<CheckCircle className="w-4 h-4"/>}
          >
            {currentStop.type === 'ORIGIN' ? 'Confirmar Saída' : 'Confirmar Chegada'}
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
        <div className="text-center text-sm text-green-600 font-medium py-2 bg-green-50 rounded-lg border border-green-100">
          Atendimento registrado às {new Date(currentStop.serviceTimestamp!).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
        </div>
      )}
    </Card>
  );
};
