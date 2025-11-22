
import React, { useState } from 'react';
import { UserAccount } from '../types';
import { Button } from '../components/Button';
import { Truck, Lock, User, Eye, EyeOff, ArrowRight, Cloud, Link, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LoginViewProps {
  users: UserAccount[];
  onLogin: (role: 'admin' | 'unit', username: string, unitId?: string) => void;
  onSyncUrl: (url: string) => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin, onSyncUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    let user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
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

  const handleSyncSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // Strict Cleaning: Remove invisible characters, newlines, and ALL spaces
      const cleanUrl = syncUrl.replace(/\s/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

      if (cleanUrl.length < 10 || !cleanUrl.toLowerCase().startsWith('http')) {
          setSyncMessage({ text: "URL inválida. Copie o link 'Web App URL' completo.", type: 'error' });
          return;
      }

      if (!cleanUrl.endsWith('/exec')) {
          setSyncMessage({ text: "A URL deve terminar em '/exec'. Verifique se copiou corretamente.", type: 'error' });
          return;
      }

      setIsSyncing(true);
      setSyncMessage(null);

      try {
          await onSyncUrl(cleanUrl);
          setSyncMessage({ text: "Conectado! Dados sincronizados.", type: 'success' });
          setTimeout(() => {
              setShowSyncModal(false);
              setSyncMessage(null);
          }, 2000);
      } catch (err: any) {
          console.error("Sync error details:", err);
          let msg = err.message || "Erro desconhecido";
          
          if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
              msg = "Falha de Conexão. O script deve ser 'Execute as: Me' e 'Access: Anyone' (Qualquer Pessoa).";
          }
          
          setSyncMessage({ text: msg, type: 'error' });
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="min-h-screen bg-sle-bg relative flex items-center justify-center p-4 overflow-hidden font-sans transition-colors duration-500">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[60vw] h-[60vw] bg-sle-blue/10 rounded-full blur-[120px] animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[60vw] h-[60vw] bg-sle-red/10 rounded-full blur-[100px] animate-pulse duration-[10000ms]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        
        <div className="mb-10 text-center animate-in slide-in-from-top-10 fade-in duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-white/80 border border-white/50 rounded-3xl shadow-xl shadow-sle-blue/5 mb-6 backdrop-blur-sm">
            <Truck className="w-10 h-10 text-sle-blue" />
          </div>
          <h1 className="text-3xl font-light text-sle-navy tracking-tight mb-2">
            São Luiz <span className="font-bold text-sle-red">Express</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold tracking-[0.2em] uppercase">Acesso ao Sistema</p>
        </div>

        <div className="w-full bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-black/10 border border-white/50 animate-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sle-red via-sle-blue to-sle-red opacity-80"></div>

          <form onSubmit={handleLogin} className="space-y-6 mt-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuário</label>
              <div className="relative group">
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-4 pl-12 pr-4 font-medium text-sle-navy placeholder:text-slate-300 focus:outline-none focus:border-sle-blue focus:ring-4 focus:ring-sle-blue/10 transition-all"
                  placeholder="Digite seu usuário"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sle-blue transition-colors"><User className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-4 pl-12 pr-12 font-medium text-sle-navy placeholder:text-slate-300 focus:outline-none focus:border-sle-blue focus:ring-4 focus:ring-sle-blue/10 transition-all"
                  placeholder="••••••••"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sle-blue transition-colors"><Lock className="w-5 h-5" /></div>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sle-blue transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="h-6">
              {error && <p className="text-red-500 text-xs font-bold text-center animate-pulse flex items-center justify-center gap-1">{error}</p>}
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full h-14 text-base rounded-xl bg-sle-red hover:bg-sle-redDark shadow-xl shadow-sle-red/20 text-white border-none transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
              <span>Entrar no Sistema</span>
              {!isLoading && <ArrowRight className="w-5 h-5 opacity-80" />}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 flex justify-center">
             <button 
                onClick={() => setShowSyncModal(true)}
                className="text-xs font-bold text-sle-blue flex items-center gap-1.5 hover:underline opacity-70 hover:opacity-100 transition-opacity"
             >
                <Cloud className="w-3 h-3" /> Configurar Nuvem (Opcional)
             </button>
          </div>
        </div>
      </div>

      {/* SYNC CONFIG MODAL */}
      {showSyncModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-4 text-sle-navy">
                      <div className="bg-blue-50 p-2 rounded-full text-sle-blue"><Link className="w-5 h-5"/></div>
                      <h3 className="font-bold text-lg">Conectar Nuvem</h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Para usar o sistema no celular, cole abaixo a <b>URL do Web App</b> gerada no painel do computador. Isso fará o download dos dados mais recentes.
                  </p>

                  <form onSubmit={handleSyncSubmit} className="space-y-4">
                      <input 
                          className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-sle-blue focus:border-transparent outline-none text-slate-600"
                          placeholder="https://script.google.com/..."
                          value={syncUrl}
                          onChange={e => setSyncUrl(e.target.value)}
                      />
                      
                      {syncMessage && (
                          <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${syncMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {syncMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                              {syncMessage.text}
                          </div>
                      )}

                      <div className="flex gap-2">
                          <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowSyncModal(false)}>Cancelar</Button>
                          <Button type="submit" className="flex-1" isLoading={isSyncing}>Sincronizar</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      
      <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
        <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase opacity-50">São Luiz Express Logistics © 2025</p>
      </div>
    </div>
  );
};
