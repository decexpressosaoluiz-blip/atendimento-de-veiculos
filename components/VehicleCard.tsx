import React, { useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { Clock, MapPin, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface VehicleCardProps {
  vehicle: Vehicle;
  currentTime: Date;
  onService: (v: Vehicle) => void;
  onJustify: (v: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, currentTime, onService, onJustify }) => {
  const etaDate = new Date(vehicle.eta);
  const isLate = currentTime > etaDate && vehicle.status === VehicleStatus.PENDING;
  
  // Format time
  const timeString = etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const statusBadge = useMemo(() => {
    if (vehicle.status === VehicleStatus.COMPLETED) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Atendido</span>;
    }
    if (vehicle.status === VehicleStatus.LATE_JUSTIFIED) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><FileText className="w-3 h-3 mr-1"/> Justificado</span>;
    }
    if (isLate) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse"><AlertTriangle className="w-3 h-3 mr-1"/> Atrasado</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/> Aguardando</span>;
  }, [vehicle.status, isLate]);

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
          <span className="text-xs text-slate-400 uppercase font-bold">Chegada Prevista</span>
          <p className={`text-lg font-semibold ${isLate ? 'text-sle-red' : 'text-sle-blue'}`}>
            {timeString}
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
           <span className="text-xs text-slate-400 uppercase font-bold">Status Atual</span>
           <p className="text-sm font-medium text-slate-700 mt-1">
             {isLate ? `Atrasado ${Math.floor((currentTime.getTime() - etaDate.getTime()) / 60000)} min` : 'No horário'}
           </p>
        </div>
      </div>

      {vehicle.status === VehicleStatus.PENDING && (
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={() => onService(vehicle)}
            icon={<CheckCircle className="w-4 h-4"/>}
          >
            Atender
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
      
      {vehicle.status === VehicleStatus.COMPLETED && (
        <div className="text-center text-sm text-green-600 font-medium py-2 bg-green-50 rounded-lg border border-green-100">
          Atendimento registrado às {new Date(vehicle.serviceTimestamp!).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
        </div>
      )}
    </Card>
  );
};