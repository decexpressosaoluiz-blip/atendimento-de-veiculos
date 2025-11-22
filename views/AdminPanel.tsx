
import React, { useState } from 'react';
import { AppState, JustificationStatus, Employee, Vehicle, VehicleStatus, UserAccount } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Check, X, Download, Sparkles, Plus, Truck, Users, Clock, Power, Edit, Save, Ban, Trash2, Lock, AlertTriangle, Search, Filter, Activity, Key, ShieldCheck, CheckCircle2, Settings, Link } from 'lucide-react';

interface AdminPanelProps {
  state: AppState;
  onReviewJustification: (justificationId: string, status: JustificationStatus, comment: string) => void;
  onAddVehicle: (data: { number: string; route: string; eta: string; unitId: string }) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onCancelVehicle: (id: string) => void;
  onDeleteVehicle: (id: string) => void;
  onAddEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onToggleEmployeeStatus: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
  onAddUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateSettings: (settings: { googleSheetsUrl: string }) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  state, 
  onReviewJustification, 
  onAddVehicle, 
  onEditVehicle,
  onCancelVehicle,
  onDeleteVehicle,
  onAddEmployee, 
  onEditEmployee,
  onToggleEmployeeStatus,
  onDeleteEmployee,
  onAddUser,
  onDeleteUser,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'validations' | 'fleet' | 'team' | 'access' | 'settings'>('dashboard');
  
  // --- FEEDBACK STATE ---
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- DELETE MODAL STATE ---
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'vehicle' | 'employee' | 'user', id: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // --- VEHICLE FORM STATE ---
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    number: '',
    route: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    unitId: state.units[0]?.id || ''
  });

  // --- EMPLOYEE FORM STATE ---
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    unitId: state.units[0]?.id || '',
    workDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    startTime: '08:00',
    endTime: '18:00'
  });

  // --- USER FORM STATE ---
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'unit' as 'admin' | 'unit',
    unitId: state.units[0]?.id || ''
  });

  // --- SETTINGS FORM STATE ---
  const [settingsForm, setSettingsForm] = useState({
    googleSheetsUrl: state.googleSheetsUrl || ''
  });

  // Analytics Data
  const totalVehicles = state.vehicles.length;
  const serviced = state.vehicles.filter(v => v.status === 'COMPLETED').length;
  const delayed = state.vehicles.filter(v => v.status !== 'COMPLETED' && v.status !== 'PENDING' && v.status !== 'CANCELLED').length;
  const cancelled = state.vehicles.filter(v => v.status === 'CANCELLED').length;
  const pending = state.vehicles.filter(v => v.status === 'PENDING').length;

  // Calculate Delay Percentage
  const delayPercentage = totalVehicles > 0 ? Math.round((delayed / totalVehicles) * 100) : 0;

  // Calculate Justification Reasons Breakdown
  const justificationReasons = state.justifications.reduce((acc, curr) => {
    const reason = curr.category || "Não especificado";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const justificationChartData = Object.entries(justificationReasons)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value); // Sort descending

  // CORES DO GRÁFICO
  const efficiencyData = [
    { name: 'Atendidos', value: serviced, color: '#22c55e' },
    { name: 'Atrasados', value: delayed, color: '#ef4444' },
    { name: 'Pendentes', value: pending, color: '#3b82f6' },
    { name: 'Cancelados', value: cancelled, color: '#94a3b8' },
  ];

  const pendingJustifications = state.justifications.filter(j => j.status === JustificationStatus.PENDING);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
     const header = ['Data/Hora', 'Veículo', 'Rota', 'Status', 'Chegada Prevista', 'Categoria Justificativa', 'Detalhes'];
     const rows = state.vehicles.map(v => {
        const j = state.justifications.find(j => j.vehicleId === v.id);
        return [
           v.serviceTimestamp ? new Date(v.serviceTimestamp).toLocaleString() : '-',
           v.number,
           v.route,
           v.status,
           new Date(v.eta).toLocaleString(),
           j ? j.category : '-',
           j ? j.text : '-'
        ].map(cell => `"${cell}"`).join(',');
     });
     
     const csvContent = "data:text/csv;charset=utf-8," + [header.join(','), ...rows].join('\n');
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `relatorio_frota_${new Date().toISOString().split('T')[0]}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  // --- DELETE LOGIC ---
  
  const initiateDeleteVehicle = (v: Vehicle) => {
    if (v.status === VehicleStatus.COMPLETED || v.status === VehicleStatus.LATE_JUSTIFIED) {
      alert("AÇÃO NEGADA: Não é possível apagar veículos que já foram atendidos ou justificados, pois eles compõem a base de dados do dashboard.");
      return;
    }
    setDeleteTarget({ type: 'vehicle', id: v.id });
    setDeletePassword('');
    setDeleteError('');
  };

  const initiateDeleteEmployee = (e: Employee) => {
    setDeleteTarget({ type: 'employee', id: e.id });
    setDeletePassword('');
    setDeleteError('');
  };

  const initiateDeleteUser = (u: UserAccount) => {
    if (u.username === 'admin') {
      alert("AÇÃO NEGADA: O usuário admin principal não pode ser excluído.");
      return;
    }
    setDeleteTarget({ type: 'user', id: u.id });
    setDeletePassword('');
    setDeleteError('');
  };

  const confirmDelete = () => {
    if (deletePassword !== '02965740155') {
      setDeleteError('Senha administrativa incorreta.');
      return;
    }

    if (deleteTarget?.type === 'vehicle') {
      onDeleteVehicle(deleteTarget.id);
      showToast("Veículo removido.");
    } else if (deleteTarget?.type === 'employee') {
      onDeleteEmployee(deleteTarget.id);
      showToast("Funcionário removido.");
    } else if (deleteTarget?.type === 'user') {
      onDeleteUser(deleteTarget.id);
      showToast("Usuário removido.");
    }

    setDeleteTarget(null);
    setDeletePassword('');
    setDeleteError('');
  };

  // --- SETTINGS HANDLER ---
  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ googleSheetsUrl: settingsForm.googleSheetsUrl });
    showToast("Configurações salvas!");
  };

  // --- VEHICLE HANDLERS ---

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eta = new Date(`${vehicleForm.date}T${vehicleForm.time}:00`).toISOString();
    
    if (editingVehicleId) {
      const original = state.vehicles.find(v => v.id === editingVehicleId);
      if (original) {
        onEditVehicle({
          ...original,
          number: vehicleForm.number,
          route: vehicleForm.route,
          eta,
          unitId: vehicleForm.unitId
        });
      }
      setEditingVehicleId(null);
      showToast("Veículo atualizado com sucesso!");
    } else {
      onAddVehicle({
        number: vehicleForm.number,
        route: vehicleForm.route,
        eta,
        unitId: vehicleForm.unitId
      });
      showToast("Veículo adicionado à frota!");
    }
    
    setVehicleForm({ number: '', route: '', date: new Date().toISOString().split('T')[0], time: '12:00', unitId: state.units[0].id });
  };

  const startEditingVehicle = (v: Vehicle) => {
    const dateObj = new Date(v.eta);
    setEditingVehicleId(v.id);
    setVehicleForm({
      number: v.number,
      route: v.route,
      date: dateObj.toISOString().split('T')[0],
      time: dateObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
      unitId: v.unitId
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditVehicle = () => {
    setEditingVehicleId(null);
    setVehicleForm({ number: '', route: '', date: new Date().toISOString().split('T')[0], time: '12:00', unitId: state.units[0].id });
  };

  // --- EMPLOYEE HANDLERS ---

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const schedule = {
      days: employeeForm.workDays,
      startTime: employeeForm.startTime,
      endTime: employeeForm.endTime
    };

    if (editingEmployeeId) {
      const original = state.employees.find(e => e.id === editingEmployeeId);
      if (original) {
        onEditEmployee({
          ...original,
          name: employeeForm.name,
          unitId: employeeForm.unitId,
          workSchedule: schedule
        });
      }
      setEditingEmployeeId(null);
      showToast("Cadastro atualizado!");
    } else {
      const newEmp: Employee = {
        id: `e-${Date.now()}`,
        name: employeeForm.name,
        unitId: employeeForm.unitId,
        active: true,
        workSchedule: schedule
      };
      onAddEmployee(newEmp);
      showToast("Funcionário cadastrado!");
    }
    
    setEmployeeForm({ name: '', unitId: state.units[0].id, workDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' });
  };

  const startEditingEmployee = (e: Employee) => {
    setEditingEmployeeId(e.id);
    setEmployeeForm({
      name: e.name,
      unitId: e.unitId,
      workDays: e.workSchedule?.days || [],
      startTime: e.workSchedule?.startTime || '08:00',
      endTime: e.workSchedule?.endTime || '18:00'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm({ name: '', unitId: state.units[0].id, workDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], startTime: '08:00', endTime: '18:00' });
  };

  const toggleDay = (day: string) => {
    setEmployeeForm(prev => {
      const days = prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day];
      return { ...prev, workDays: days };
    });
  };

  // --- USER HANDLERS ---
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (state.users.some(u => u.username === userForm.username)) {
        showToast("Este nome de usuário já existe!", 'error');
        return;
    }

    const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        username: userForm.username,
        password: userForm.password,
        role: userForm.role,
        unitId: userForm.role === 'unit' ? userForm.unitId : undefined
    };

    onAddUser(newUser);
    showToast("Usuário de acesso criado!");
    setUserForm({ username: '', password: '', role: 'unit', unitId: state.units[0]?.id || '' });
  };


  const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

  const inputClassName = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sle-navy dark:text-white p-3.5 focus:ring-2 focus:ring-sle-blue/20 focus:border-sle-blue outline-none transition-all duration-200 shadow-sm placeholder-slate-300 dark:placeholder-slate-600 font-medium";
  const labelClassName = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1";

  return (
    <div className="min-h-screen bg-sle-bg dark:bg-slate-950 transition-colors duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-4 z-50 animate-in slide-in-from-right-10 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${toast.type === 'success' ? 'bg-green-600 border-green-500' : 'bg-red-600 border-red-500'} text-white`}>
            <div className="bg-white/20 p-1 rounded-full">
              {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </div>
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* DELETE CONFIRMATION MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
              <div className="bg-sle-red text-white p-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">Confirmar Exclusão</h3>
              </div>
              <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Você está prestes a apagar permanentemente este registro. <br/>
                  <span className="font-bold text-sle-red dark:text-red-400">Esta ação não pode ser desfeita.</span>
                </p>
                
                <div className="space-y-2">
                  <label className={labelClassName}>Senha Administrativa</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-sle-red dark:group-focus-within:text-red-400 transition-colors" />
                    <input 
                      type="password" 
                      autoFocus
                      className={`${inputClassName} pl-10 focus:ring-sle-red/20 focus:border-sle-red`}
                      placeholder="Digite a senha para confirmar"
                      value={deletePassword}
                      onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                    />
                  </div>
                  {deleteError && <p className="text-red-500 dark:text-red-400 text-xs font-bold animate-pulse mt-1">{deleteError}</p>}
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => { setDeleteTarget(null); setDeletePassword(''); }}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    disabled={!deletePassword}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-sle-red hover:bg-sle-redDark shadow-lg shadow-sle-red/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div>
            <h2 className="text-4xl font-light text-sle-navy dark:text-white tracking-tight">
              Painel <span className="font-semibold text-sle-blue dark:text-blue-400">Administrativo</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestão estratégica da frota e equipe.</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto max-w-full hide-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Activity className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('validations')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'validations' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Check className="w-4 h-4" /> Validações
              {pendingJustifications.length > 0 && <span className="bg-sle-red text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{pendingJustifications.length}</span>}
            </button>
            <button onClick={() => setActiveTab('fleet')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'fleet' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Truck className="w-4 h-4" /> Frota
            </button>
            <button onClick={() => setActiveTab('team')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'team' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Users className="w-4 h-4" /> Equipe
            </button>
            <button onClick={() => setActiveTab('access')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'access' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Key className="w-4 h-4" /> Acessos
            </button>
            <button onClick={() => setActiveTab('settings')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${activeTab === 'settings' ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-sle-blue dark:hover:text-blue-400'}`}>
              <Settings className="w-4 h-4" /> Config
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <Card className="border-l-4 border-l-sle-blue hover:shadow-elevated transition-shadow cursor-default dark:bg-slate-900 dark:border-l-blue-500">
                <div className="flex items-center justify-between">
                   <div>
                     <span className="text-slate-400 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">Total Veículos</span>
                     <p className="text-4xl font-bold text-sle-navy dark:text-white mt-2">{totalVehicles}</p>
                   </div>
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full text-sle-blue dark:text-blue-400">
                     <Truck className="w-6 h-6" />
                   </div>
                </div>
              </Card>
              <Card className="border-l-4 border-l-green-500 hover:shadow-elevated transition-shadow cursor-default dark:bg-slate-900">
                <div className="flex items-center justify-between">
                   <div>
                     <span className="text-slate-400 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">Eficiência</span>
                     <p className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                       {totalVehicles > 0 ? Math.round((serviced / totalVehicles) * 100) : 0}%
                     </p>
                   </div>
                   <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-full text-green-600 dark:text-green-400">
                     <Activity className="w-6 h-6" />
                   </div>
                </div>
              </Card>
              <Card className="border-l-4 border-l-sle-red hover:shadow-elevated transition-shadow cursor-default dark:bg-slate-900">
                 <div className="flex items-center justify-between">
                   <div>
                     <span className="text-slate-400 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">Atrasos</span>
                     <p className="text-4xl font-bold text-sle-red dark:text-red-400 mt-2">{delayPercentage}%</p>
                   </div>
                   <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-full text-sle-red dark:text-red-400">
                     <AlertTriangle className="w-6 h-6" />
                   </div>
                </div>
              </Card>
              <Card className="flex flex-col justify-center items-center bg-slate-900 dark:bg-black text-white border-none shadow-lg shadow-slate-900/20">
                <Button variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20 border-white/10" onClick={handleExport} icon={<Download className="w-4 h-4"/>}>
                  Exportar Relatório
                </Button>
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  Salvar na conta:<br/>
                  <span className="font-bold text-white">dec.expressosaoluiz@gmail.com</span>
                </p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="dark:bg-slate-900">
                <h3 className="text-lg font-bold text-sle-navy dark:text-white mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-sle-blue dark:bg-blue-500 rounded-full"></div>
                  Status da Frota
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={efficiencyData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                        {efficiencyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)'}} 
                        itemStyle={{color: '#1e293b', fontWeight: 'bold'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-sm flex-wrap mt-4">
                  {efficiencyData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: d.color}}></div>
                      <span className="font-medium">{d.name}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="dark:bg-slate-900">
                <h3 className="text-lg font-bold text-sle-navy dark:text-white mb-6 flex items-center gap-2">
                  <div className="w-2 h-6 bg-sle-red dark:bg-red-500 rounded-full"></div>
                  Motivos de Atraso
                </h3>
                {justificationChartData.length > 0 ? (
                   <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={justificationChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={150} tick={{fontSize: 11, fill: '#94a3b8'}} interval={0} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none'}} />
                        <Bar dataKey="value" fill="#EC1B23" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                   </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950">
                     <Activity className="w-10 h-10 mb-2 opacity-50" />
                     <p className="font-medium">Sem dados de justificativas.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
             <div className="space-y-6">
                <Card className="shadow-lg border-t-4 border-t-sle-blue dark:bg-slate-900">
                  <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-2 mb-6">
                    <Link className="w-6 h-6 text-sle-blue dark:text-blue-400" />
                    Integração Google Sheets
                  </h3>
                  
                  <form onSubmit={handleSettingsSubmit} className="space-y-4">
                     <div>
                       <label className={labelClassName}>URL do Web App (Google Apps Script)</label>
                       <input 
                         type="url"
                         placeholder="https://script.google.com/macros/s/..."
                         value={settingsForm.googleSheetsUrl}
                         onChange={(e) => setSettingsForm({ googleSheetsUrl: e.target.value })}
                         className={inputClassName}
                       />
                       <p className="text-[10px] text-slate-400 mt-2">
                         Cole aqui a URL gerada após implantar o script como "App da Web" na sua planilha Google.
                       </p>
                     </div>
                     <Button 
                        type="submit" 
                        className="w-full bg-sle-blue hover:bg-sle-navy text-white"
                        icon={<Save className="w-4 h-4" />}
                     >
                       Salvar Configuração
                     </Button>
                  </form>
                </Card>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
                   <h4 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2 mb-2">
                     <AlertTriangle className="w-5 h-5" />
                     Importante
                   </h4>
                   <p className="text-sm text-yellow-700 dark:text-yellow-300">
                     Para que as imagens sejam salvas corretamente na planilha, certifique-se de implantar o script com permissão de acesso para <strong>"Qualquer pessoa" (Anyone)</strong>.
                   </p>
                </div>
             </div>

             <div className="space-y-6 text-slate-600 dark:text-slate-300">
                <h4 className="font-bold uppercase tracking-wider text-xs text-slate-400">Como configurar?</h4>
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                   <li>Crie uma nova Planilha Google.</li>
                   <li>Vá em <strong>Extensões {'>'} Apps Script</strong>.</li>
                   <li>Cole o código de integração fornecido pelo desenvolvedor.</li>
                   <li>Clique em <strong>Implantar {'>'} Nova implantação</strong>.</li>
                   <li>Escolha o tipo "App da Web".</li>
                   <li>Em "Quem pode acessar", selecione <strong>"Qualquer pessoa"</strong>.</li>
                   <li>Clique em Implantar, copie a URL gerada e cole no campo ao lado.</li>
                </ol>
             </div>
          </div>
        )}

        {/* ... Rest of existing tabs (validations, fleet, team, access) ... */}
        {activeTab === 'validations' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {pendingJustifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-full mb-6">
                  <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-sle-navy dark:text-white">Tudo limpo!</h3>
                <p className="text-slate-500 dark:text-slate-400">Nenhuma justificativa pendente de análise.</p>
              </div>
            ) : (
              pendingJustifications.map(justification => {
                const vehicle = state.vehicles.find(v => v.id === justification.vehicleId);
                return (
                  <Card key={justification.id} className="flex flex-col md:flex-row gap-6 border-l-4 border-l-sle-red dark:bg-slate-900">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Veículo</span>
                        <span className="font-bold text-xl text-sle-blue dark:text-blue-400">{vehicle?.number}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-bold text-sle-navy dark:text-white mb-1">Motivo Principal:</h4>
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-bold text-sm mb-2">
                                {justification.category || "Não classificado"}
                            </span>
                            
                            {justification.text && (
                              <>
                                <h4 className="text-sm font-bold text-sle-navy dark:text-white mb-1 mt-2">Observações:</h4>
                                <p className="text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-700 italic leading-relaxed">
                                    "{justification.text}"
                                </p>
                              </>
                            )}
                        </div>
                        
                        {justification.aiAnalysis && (
                            <div className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-800 border border-purple-100 dark:border-purple-900/30 p-4 rounded-xl flex gap-4 shadow-sm">
                            <div className="bg-white dark:bg-purple-900/50 p-2 rounded-lg h-fit shadow-sm">
                                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Análise IA (Gemini)</span>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-snug">{justification.aiAnalysis}</p>
                            </div>
                            </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-700 pt-6 md:pt-0 md:pl-6 md:w-56">
                      <p className="text-xs font-bold text-center text-slate-400 uppercase tracking-wider mb-1">Decisão</p>
                      <Button className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none border-none" icon={<Check className="w-4 h-4" />} onClick={() => onReviewJustification(justification.id, JustificationStatus.APPROVED, "Aprovado pelo Admin")}>
                        Procedente
                      </Button>
                      <Button className="w-full bg-sle-red hover:bg-sle-redDark shadow-lg shadow-red-200 dark:shadow-none border-none" icon={<X className="w-4 h-4" />} onClick={() => onReviewJustification(justification.id, JustificationStatus.REJECTED, "Recusado pelo Admin")}>
                        Improcedente
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            {/* Vehicle Form - Col 4 */}
            <div className="lg:col-span-4">
               <div className="sticky top-24">
                  <Card className="border-t-4 border-t-sle-red shadow-lg dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-2">
                            {editingVehicleId ? <Edit className="w-6 h-6 text-sle-blue dark:text-blue-400" /> : <Plus className="w-6 h-6 text-sle-red dark:text-red-400" />}
                            {editingVehicleId ? "Editar Veículo" : "Novo Veículo"}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">Preencha os dados do agendamento</p>
                        </div>
                        {editingVehicleId && (
                            <button onClick={cancelEditVehicle} className="text-xs font-bold text-slate-400 hover:text-sle-red dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">Cancelar</button>
                        )}
                      </div>
                      
                      <form onSubmit={handleVehicleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className={labelClassName}>Identificação (Placa/Frota)</label>
                                <input 
                                    required type="text" 
                                    placeholder="Ex: V-5050" 
                                    value={vehicleForm.number} 
                                    onChange={e => setVehicleForm({...vehicleForm, number: e.target.value})} 
                                    className={inputClassName} 
                                />
                            </div>
                            <div>
                                <label className={labelClassName}>Rota / Itinerário</label>
                                <input 
                                    required type="text" 
                                    placeholder="Ex: Rota Sul - Expresso" 
                                    value={vehicleForm.route} 
                                    onChange={e => setVehicleForm({...vehicleForm, route: e.target.value})} 
                                    className={inputClassName} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClassName}>Data</label>
                                    <input 
                                        required type="date" 
                                        value={vehicleForm.date} 
                                        onChange={e => setVehicleForm({...vehicleForm, date: e.target.value})} 
                                        className={inputClassName} 
                                    />
                                </div>
                                <div>
                                    <label className={labelClassName}>Hora Prevista</label>
                                    <input 
                                        required type="time" 
                                        value={vehicleForm.time} 
                                        onChange={e => setVehicleForm({...vehicleForm, time: e.target.value})} 
                                        className={inputClassName} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClassName}>Unidade de Destino</label>
                                <select 
                                    required 
                                    value={vehicleForm.unitId} 
                                    onChange={e => setVehicleForm({...vehicleForm, unitId: e.target.value})} 
                                    className={inputClassName}
                                >
                                    {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <Button 
                            type="submit" 
                            className={`w-full py-4 text-base shadow-lg transition-transform active:scale-95 bg-sle-red hover:bg-sle-redDark shadow-sle-red/20`} 
                            icon={editingVehicleId ? <Save className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                        >
                            {editingVehicleId ? "Salvar Alterações" : "Adicionar à Frota"}
                        </Button>
                      </form>
                  </Card>
               </div>
            </div>

            {/* Vehicle List - Col 8 */}
            <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-3">
                    <div className="bg-sle-blue/10 dark:bg-blue-900/20 p-2 rounded-lg">
                        <Truck className="w-5 h-5 text-sle-blue dark:text-blue-400" />
                    </div>
                    Frota Ativa ({state.vehicles.length})
                  </h3>
                  
                  <div className="relative hidden md:block">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" placeholder="Buscar veículo..." className="pl-9 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-sle-blue/20 transition-all text-sle-navy dark:text-white" />
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                        <tr>
                          <th className="p-5">Veículo</th>
                          <th className="p-5 hidden sm:table-cell">Rota</th>
                          <th className="p-5">Chegada</th>
                          <th className="p-5 hidden sm:table-cell">Unidade</th>
                          <th className="p-5">Status</th>
                          <th className="p-5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {state.vehicles.slice().reverse().map(v => {
                          const unitName = state.units.find(u => u.id === v.unitId)?.name || 'N/A';
                          const isEditable = v.status === VehicleStatus.PENDING;
                          const isCancelled = v.status === VehicleStatus.CANCELLED;
                          
                          return (
                            <tr key={v.id} className={`group hover:bg-blue-50/50 dark:hover:bg-slate-800/30 transition-colors ${isCancelled ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                              <td className="p-5">
                                <span className="font-bold text-base text-sle-blue dark:text-blue-400 block">{v.number}</span>
                              </td>
                              <td className="p-5 hidden sm:table-cell text-slate-500 dark:text-slate-400">{v.route}</td>
                              <td className="p-5 font-medium text-sle-navy dark:text-slate-200">{new Date(v.eta).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td>
                              <td className="p-5 hidden sm:table-cell text-xs font-medium text-slate-500 dark:text-slate-400">{unitName}</td>
                              <td className="p-5">
                                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                                  v.status === VehicleStatus.PENDING ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                                  v.status === VehicleStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                                  v.status === VehicleStatus.LATE_JUSTIFIED ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' :
                                  'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}>
                                  {v.status === VehicleStatus.CANCELLED ? 'Cancelado' : v.status === 'LATE_JUSTIFIED' ? 'Justificado' : v.status === 'PENDING' ? 'Pendente' : 'Finalizado'}
                                </span>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => startEditingVehicle(v)}
                                    disabled={!isEditable}
                                    className={`p-2 rounded-lg transition-all ${isEditable ? 'bg-white dark:bg-slate-800 hover:bg-sle-blue hover:text-white text-sle-blue dark:text-blue-400 dark:hover:text-white shadow-sm' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if(confirm("Tem certeza que deseja cancelar este agendamento? Os dados serão mantidos como cancelados.")) {
                                        onCancelVehicle(v.id);
                                        showToast("Veículo cancelado.", 'error');
                                      }
                                    }}
                                    disabled={!isEditable}
                                    className={`p-2 rounded-lg transition-all ${isEditable ? 'bg-white dark:bg-slate-800 hover:bg-orange-500 hover:text-white text-orange-500 shadow-sm' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                                    title="Cancelar"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => initiateDeleteVehicle(v)}
                                    className="p-2 rounded-lg transition-all bg-white dark:bg-slate-800 hover:bg-sle-red hover:text-white text-sle-red dark:text-red-400 dark:hover:text-white shadow-sm"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
             {/* Form Funcionário - Col 4 */}
             <div className="lg:col-span-4">
               <div className="sticky top-24">
                  <Card className="border-t-4 border-t-sle-red shadow-lg dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-2">
                            {editingEmployeeId ? <Edit className="w-6 h-6 text-sle-blue dark:text-blue-400" /> : <Users className="w-6 h-6 text-sle-red dark:text-red-400" />}
                            {editingEmployeeId ? "Editar Cadastro" : "Novo Membro"}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">Gerencie o quadro de colaboradores</p>
                        </div>
                        {editingEmployeeId && (
                          <button onClick={cancelEditEmployee} className="text-xs font-bold text-slate-400 hover:text-sle-red dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">Cancelar</button>
                        )}
                      </div>

                      <form onSubmit={handleEmployeeSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className={labelClassName}>Nome Completo</label>
                                <input 
                                    required type="text" 
                                    placeholder="Ex: Maria Oliveira" 
                                    value={employeeForm.name} 
                                    onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} 
                                    className={inputClassName} 
                                />
                            </div>
                            <div>
                                <label className={labelClassName}>Unidade de Lotação</label>
                                <select 
                                    required 
                                    value={employeeForm.unitId} 
                                    onChange={e => setEmployeeForm({...employeeForm, unitId: e.target.value})} 
                                    className={inputClassName}
                                >
                                    {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className={labelClassName}>Escala de Trabalho</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {daysOfWeek.map(day => (
                                    <button 
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${employeeForm.workDays.includes(day) ? 'bg-sle-blue text-white border-sle-blue shadow-md shadow-sle-blue/20 dark:bg-blue-600 dark:border-blue-600' : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sle-blue/50'}`}
                                    >
                                        {day}
                                    </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClassName}>Entrada</label>
                                    <input 
                                        required type="time" 
                                        value={employeeForm.startTime} 
                                        onChange={e => setEmployeeForm({...employeeForm, startTime: e.target.value})} 
                                        className={inputClassName} 
                                    />
                                </div>
                                <div>
                                    <label className={labelClassName}>Saída</label>
                                    <input 
                                        required type="time" 
                                        value={employeeForm.endTime} 
                                        onChange={e => setEmployeeForm({...employeeForm, endTime: e.target.value})} 
                                        className={inputClassName} 
                                    />
                                </div>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className={`w-full py-4 text-base shadow-lg transition-transform active:scale-95 bg-sle-red hover:bg-sle-redDark shadow-sle-red/20`} 
                            icon={editingEmployeeId ? <Save className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                        >
                            {editingEmployeeId ? "Salvar Alterações" : "Cadastrar Membro"}
                        </Button>
                      </form>
                  </Card>
               </div>
             </div>

             {/* Lista Funcionários - Col 8 */}
             <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-3">
                        <div className="bg-sle-blue/10 dark:bg-blue-900/20 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-sle-blue dark:text-blue-400" />
                        </div>
                        Equipe ({state.employees.length})
                    </h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {state.employees.map(emp => {
                    const unitName = state.units.find(u => u.id === emp.unitId)?.name || 'N/A';
                    return (
                      <div key={emp.id} className={`relative bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex justify-between items-start group overflow-hidden ${emp.active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-75 grayscale-[0.5]'}`}>
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${emp.active ? 'from-sle-blue/5 dark:from-blue-500/10 to-transparent' : 'from-slate-200/20 dark:from-white/5 to-transparent'} rounded-bl-full pointer-events-none`} />

                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${emp.active ? 'bg-sle-blue text-white dark:bg-blue-600' : 'bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {emp.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className={`font-bold leading-tight ${emp.active ? 'text-sle-navy dark:text-white' : 'text-slate-500 dark:text-slate-400 line-through'}`}>{emp.name}</h4>
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">{unitName}</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg w-fit">
                                <Clock className="w-3.5 h-3.5 text-sle-blue dark:text-blue-400" />
                                {emp.workSchedule ? `${emp.workSchedule.startTime} - ${emp.workSchedule.endTime}` : '--:--'}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {emp.workSchedule?.days.map(d => (
                                <span key={d} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${emp.active ? 'text-sle-blue border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-300' : 'text-slate-400 border-slate-200 bg-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>{d}</span>
                                ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 relative z-10">
                          <button 
                            onClick={() => startEditingEmployee(emp)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-sle-blue hover:border-sle-blue dark:hover:text-blue-400 p-2 rounded-xl transition-colors shadow-sm"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onToggleEmployeeStatus(emp.id)}
                            className={`p-2 rounded-xl transition-colors border shadow-sm ${emp.active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-green-500 hover:text-red-500 hover:border-red-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-green-500 hover:border-green-200'}`}
                            title={emp.active ? "Desativar" : "Ativar"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => initiateDeleteEmployee(emp)}
                             className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 p-2 rounded-xl transition-colors shadow-sm"
                             title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
          </div>
        )}

        {activeTab === 'access' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
                {/* Form Creation */}
                <div className="lg:col-span-4">
                    <div className="sticky top-24">
                        <Card className="border-t-4 border-t-sle-red shadow-lg dark:bg-slate-900">
                             <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-2">
                                      <ShieldCheck className="w-6 h-6 text-sle-red dark:text-red-400" />
                                      Acesso de Unidade
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Crie logins para que as unidades acessem o sistema.</p>
                                </div>
                             </div>

                             <form onSubmit={handleUserSubmit} className="space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClassName}>Usuário (Login)</label>
                                        <input 
                                            required type="text" 
                                            placeholder="Ex: matriz" 
                                            value={userForm.username} 
                                            onChange={e => setUserForm({...userForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})} 
                                            className={inputClassName} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClassName}>Senha de Acesso</label>
                                        <input 
                                            required type="text" 
                                            placeholder="Senha simples (Ex: 123)" 
                                            value={userForm.password} 
                                            onChange={e => setUserForm({...userForm, password: e.target.value})} 
                                            className={inputClassName} 
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className={labelClassName}>Tipo de Acesso</label>
                                        <div className="flex gap-2 mt-1">
                                            <button 
                                                type="button"
                                                onClick={() => setUserForm({...userForm, role: 'unit'})}
                                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${userForm.role === 'unit' ? 'bg-sle-blue text-white border-sle-blue shadow-md shadow-sle-blue/30 dark:bg-blue-600 dark:border-blue-600' : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                            >
                                                Unidade
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setUserForm({...userForm, role: 'admin'})}
                                                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${userForm.role === 'admin' ? 'bg-sle-navy text-white border-sle-navy shadow-md shadow-sle-navy/30 dark:bg-slate-700 dark:border-slate-600' : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                            >
                                                Admin
                                            </button>
                                        </div>
                                    </div>

                                    {userForm.role === 'unit' && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className={labelClassName}>Vincular à Unidade</label>
                                            <select 
                                                required 
                                                value={userForm.unitId} 
                                                onChange={e => setUserForm({...userForm, unitId: e.target.value})} 
                                                className={inputClassName}
                                            >
                                                {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                
                                <Button 
                                    type="submit" 
                                    className="w-full py-4 text-base shadow-lg transition-transform active:scale-95 bg-sle-red hover:bg-sle-redDark shadow-sle-red/20" 
                                    icon={<Plus className="w-5 h-5"/>}
                                >
                                    Criar Acesso
                                </Button>
                             </form>
                        </Card>
                    </div>
                </div>

                {/* User List */}
                <div className="lg:col-span-8 space-y-6">
                    <h3 className="text-xl font-bold text-sle-navy dark:text-white flex items-center gap-3">
                        <div className="bg-sle-blue/10 dark:bg-blue-900/20 p-2 rounded-lg">
                            <Key className="w-5 h-5 text-sle-blue dark:text-blue-400" />
                        </div>
                        Usuários do Sistema
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {state.users.map(user => {
                            const unit = state.units.find(u => u.id === user.unitId);
                            return (
                                <div key={user.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${user.role === 'admin' ? 'bg-sle-navy dark:bg-slate-700' : 'bg-sle-blue dark:bg-blue-600'}`}>
                                            {user.role === 'admin' ? <Lock className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-sle-navy dark:text-white">{user.username}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                                {user.role === 'admin' ? 'Administrador Global' : `Unidade: ${unit?.name || 'N/A'}`}
                                            </p>
                                            <div className="mt-1 flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded w-fit text-slate-500 dark:text-slate-400">
                                                <Key className="w-3 h-3" />
                                                Senha: {user.password}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => initiateDeleteUser(user)}
                                        className="p-2 text-slate-300 hover:text-sle-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                        disabled={user.username === 'admin'}
                                        title={user.username === 'admin' ? "Admin não pode ser excluído" : "Excluir usuário"}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
