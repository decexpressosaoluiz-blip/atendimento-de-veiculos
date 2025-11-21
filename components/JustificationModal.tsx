import React, { useState } from 'react';
import { Vehicle } from '../types';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { JUSTIFICATION_REASONS } from '../constants';

interface JustificationModalProps {
  vehicle: Vehicle;
  onConfirm: (category: string, text: string) => void;
  onClose: () => void;
}

export const JustificationModal: React.FC<JustificationModalProps> = ({ vehicle, onConfirm, onClose }) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (selectedReason) {
      onConfirm(selectedReason, details);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-bold">Justificar Atraso</h2>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-red-700 dark:hover:text-red-200"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              O veículo <span className="font-bold text-slate-900 dark:text-white">{vehicle.number}</span> está fora do horário.
            </p>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Selecione o motivo principal:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {JUSTIFICATION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`text-left text-xs sm:text-sm p-3 rounded-xl border transition-all flex items-center justify-between group ${
                    selectedReason === reason
                      ? 'bg-sle-red text-white border-sle-red shadow-md shadow-sle-red/20'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200'
                  }`}
                >
                  <span className="font-medium">{reason}</span>
                  {selectedReason === reason && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 block">
              Observações Adicionais (Opcional)
            </label>
            <textarea
              className="w-full h-20 p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sle-navy dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm"
              placeholder="Detalhes específicos..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <Button 
            variant="danger"
            className="w-full"
            disabled={!selectedReason}
            onClick={handleSubmit}
          >
            Confirmar Justificativa
          </Button>
        </div>
      </div>
    </div>
  );
};