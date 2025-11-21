import React, { useState } from 'react';
import { Unit, UserAccount } from '../types';
import { Button } from '../components/Button';
import { Truck, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  users: UserAccount[];
  onLogin: (role: 'admin' | 'unit', username: string, unitId?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular um pequeno delay de rede para UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // Verificar credenciais
    let user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    // Fallback para a senha mestra antiga caso tente logar como "admin" sem estar na lista (segurança legada)
    if (!user && username === 'admin' && password === '02965740155') {
        user = { id: 'master', username: 'admin', password: '', role: 'admin' };
    }

    if (user) {
      onLogin(user.role, user.username, user.unitId);
    } else {
      setError('Usuário ou senha incorretos.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sle-bg relative flex items-center justify-center p-4 overflow-hidden font-sans transition-colors duration-500">
      
      {/* Ambient Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] bg-sle-blue/10 rounded-full blur-[120px] animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[60vw] h-[60vw] bg-sle-red/10 rounded-full blur-[100px] animate-pulse duration-[10000ms]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="mb-10 text-center animate-in slide-in-from-top-10 fade-in duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-white/80 border border-white/50 rounded-3xl shadow-xl shadow-sle-blue/5 mb-6 backdrop-blur-sm">
            <Truck className="w-10 h-10 text-sle-blue" />
          </div>
          <h1 className="text-3xl font-light text-sle-navy tracking-tight mb-2">
            São Luiz <span className="font-bold text-sle-red">Express</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold tracking-[0.2em] uppercase">Acesso ao Sistema</p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-black/10 border border-white/50 animate-in zoom-in-95 duration-500 relative overflow-hidden">
          
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sle-red via-sle-blue to-sle-red opacity-80"></div>

          <form onSubmit={handleLogin} className="space-y-6 mt-2">
            
            {/* Username Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Usuário
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-4 pl-12 pr-4 font-medium text-sle-navy placeholder:text-slate-300 focus:outline-none focus:border-sle-blue focus:ring-4 focus:ring-sle-blue/10 transition-all"
                  placeholder="Digite seu usuário"
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sle-blue transition-colors">
                   <User className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Senha
              </label>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-4 pl-12 pr-12 font-medium text-sle-navy placeholder:text-slate-300 focus:outline-none focus:border-sle-blue focus:ring-4 focus:ring-sle-blue/10 transition-all"
                  placeholder="••••••••"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sle-blue transition-colors">
                   <Lock className="w-5 h-5" />
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sle-blue transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <div className="h-6">
              {error && (
                <p className="text-red-500 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-1">
                  {error}
                </p>
              )}
            </div>

            <Button 
              type="submit"
              isLoading={isLoading}
              className="w-full h-14 text-base rounded-xl bg-sle-red hover:bg-sle-redDark shadow-xl shadow-sle-red/20 text-white border-none transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" 
            >
              <span>Entrar no Sistema</span>
              {!isLoading && <ArrowRight className="w-5 h-5 opacity-80" />}
            </Button>

          </form>
        </div>
      </div>
      
      {/* Footer Credit */}
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase opacity-50">
          São Luiz Express Logistics © 2025
        </p>
      </div>

    </div>
  );
};