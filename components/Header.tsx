import React from 'react';
import { Truck, LogOut, User } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  unitName?: string;
  isAdmin?: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ unitName, isAdmin, onLogout }) => {
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