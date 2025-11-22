import React from 'react';
import { Truck, LogOut, User, Cloud, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  unitName?: string;
  isAdmin?: boolean;
  onLogout: () => void;
  syncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
}

export const Header: React.FC<HeaderProps> = ({ unitName, isAdmin, onLogout, syncStatus }) => {
  return (
    <header className="glass sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-sle-red to-sle-blue p-2 rounded-xl shadow-md shadow-sle-blue/20">
            <Truck className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-sle-navy tracking-tight leading-none">
              São Luiz <span className="font-medium text-sle-red">Express</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Sync Indicator */}
          {syncStatus && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700" title="Status da Sincronização">
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="h-3 w-3 text-sle-blue animate-spin" />
                  <span className="text-[10px] font-bold text-sle-blue hidden sm:inline">Sync...</span>
                </>
              )}
              {syncStatus === 'saved' && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-[10px] font-bold text-green-600 hidden sm:inline">Salvo</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <Cloud className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] font-bold text-red-500 hidden sm:inline">Erro Sync</span>
                </>
              )}
              {syncStatus === 'idle' && (
                <Cloud className="h-3 w-3 text-slate-300" />
              )}
            </div>
          )}

          {unitName && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Unidade Operacional</span>
              <span className="text-sm font-medium text-sle-blue">{unitName}</span>
            </div>
          )}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-2 bg-sle-navy/5 px-3 py-1 rounded-full border border-sle-navy/10">
              <User className="h-3 w-3 text-sle-navy" />
              <span className="text-xs font-bold text-sle-navy tracking-wide">ADMIN</span>
            </div>
          )}
          
          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <Button variant="ghost" size="sm" onClick={onLogout} icon={<LogOut className="h-4 w-4" />}>
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};