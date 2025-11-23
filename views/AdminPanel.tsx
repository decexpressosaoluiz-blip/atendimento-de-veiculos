
import React, { useState, useEffect } from 'react';
import { AppState, JustificationStatus, Employee, Vehicle, VehicleStatus, UserAccount } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Check, X, Download, Plus, Truck, Users, Key, Edit, Save, Trash2, Link, Map, ArrowRight, MapPin, Upload, Copy, HelpCircle, FileJson, Zap, Lightbulb, TrendingUp, AlertTriangle, Lock, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import { GLOBAL_APPS_SCRIPT_URL } from '../constants';

interface AdminPanelProps {
  state: AppState;
  onReviewJustification: (justificationId: string, status: JustificationStatus, comment: string) => void;
  onAddVehicle: (data: any) => void;
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
  onImportData: (data: AppState) => void;
  onTestSettings: (url: string) => void;
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
  onUpdateSettings,
  onImportData,
  onTestSettings
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'team' | 'access' | 'settings'>('dashboard');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- FILTERS ---
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- DELETE MODAL STATE ---
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'vehicle' | 'employee' | 'user', id: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // --- TRIP FORM STATE ---
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState({
    number: '',
    route: '',
    // Stops
    originId: state.units[0]?.id || '',
    originDate: new Date().toISOString().split('T')[0],
    originTime: '08:00',
    
    hasIntermediate: false,
    intId: state.units.length > 1 ? state.units[1].id : '',
    intDate: new Date().toISOString().split('T')[0],
    intTime: '12:00',

    hasDestination: true, // Optional now
    destId: state.units.length > 1 ? state.units[state.units.length - 1].id : '',
    destDate: new Date().toISOString().split('T')[0],
    destTime: '18:00'
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

  useEffect(() => {
    setSettingsForm(prev => ({
      ...prev,
      googleSheetsUrl: state.googleSheetsUrl || ''
    }));
  }, [state.googleSheetsUrl]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- ANALYTICS CALCULATION ---
  const calculateAnalytics = () => {
     const activeVehicles = state.vehicles.filter(v => v.status !== VehicleStatus.CANCELLED);
     const totalTrips = activeVehicles.length;
     
     let relevantStops = 0; // Stops that contribute to efficiency (Completed + Late)
     let completedOnTime = 0;
     let lateStops = 0;
     let pendingOnTime = 0;
     
     const employeeStats: Record<string, number> = {};
     const unitDelays: Record<string, number> = {};
     
     activeVehicles.forEach(v => {
         v.stops.forEach(s => {
             // FILTER LOGIC
             if (filterUnit !== 'all' && s.unitId !== filterUnit) return;
             
             const dateRef = new Date(s.eta);
             if (startDate && dateRef < new Date(startDate + "T00:00:00")) return;
             if (endDate && dateRef > new Date(endDate + "T23:59:59")) return;

             // METRICS LOGIC
             // 1. Completed (On Time)
             if (s.status === VehicleStatus.COMPLETED) {
                 relevantStops++;
                 completedOnTime++;
                 if (s.servicedByEmployeeId) {
                     const name = state.employees.find(e => e.id === s.servicedByEmployeeId)?.name || 'Unknown';
                     employeeStats[name] = (employeeStats[name] || 0) + 1;
                 }
             }
             // 2. Late (Justified or Just Plain Late)
             else if (s.status === VehicleStatus.LATE_JUSTIFIED || s.status === VehicleStatus.LATE_NOT_JUSTIFIED) {
                 relevantStops++;
                 lateStops++;
                 const unitName = state.units.find(u => u.id === s.unitId)?.name || 'Unknown';
                 unitDelays[unitName] = (unitDelays[unitName] || 0) + 1;
             }
             // 3. Pending (Check if Late)
             else if (s.status === VehicleStatus.PENDING) {
                 if (new Date() > new Date(s.eta)) {
                     relevantStops++; // It's late, so it counts against efficiency (It's a failure)
                     lateStops++;
                     const unitName = state.units.find(u => u.id === s.unitId)?.name || 'Unknown';
                     unitDelays[unitName] = (unitDelays[unitName] || 0) + 1;
                 } else {
                     pendingOnTime++; // IMPORTANT: Pending (On Time) is NOT counted in relevantStops for Efficiency
                 }
             }
         });
     });

     // Efficiency = OnTime / (OnTime + All Late)
     // Ignoring "Pending On Time" as requested ("não deve ser considerado viagem ativa")
     const efficiency = relevantStops > 0 ? Math.round((completedOnTime / relevantStops) * 100) : 100;
     
     const topEmployees = Object.entries(employeeStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5);

     const chartDataStatus = [
        { name: 'Atendidos (Prazo)', value: completedOnTime, color: '#10B981' }, // emerald-500
        { name: 'Atrasos / Pendência Crítica', value: lateStops, color: '#EF4444' }, // red-500
        { name: 'Aguardando (Prazo)', value: pendingOnTime, color: '#3B82F6' } // blue-500
     ];

     // Suggestions
     const suggestions = [];
     if (lateStops > relevantStops * 0.2) suggestions.push("Alto índice de atrasos. Considere rever os tempos estimados das rotas.");
     if (efficiency < 50 && relevantStops > 0) suggestions.push("Eficiência abaixo de 50%. Verifique se os motoristas estão registrando as paradas corretamente.");
     if (topEmployees.length > 0 && topEmployees[0].count > topEmployees[1]?.count * 2) suggestions.push(`${topEmployees[0].name} está sobrecarregado comparado aos outros.`);

     return { totalTrips, efficiency, topEmployees, chartDataStatus, unitDelays, suggestions };
  };

  const analytics = calculateAnalytics();

  // --- DELETE LOGIC ---
  const initiateDeleteVehicle = (v: Vehicle) => {
    setDeleteTarget({ type: 'vehicle', id: v.id });
    setDeletePassword(''); setDeleteError('');
  };
  const initiateDeleteEmployee = (e: Employee) => {
    setDeleteTarget({ type: 'employee', id: e.id });
    setDeletePassword(''); setDeleteError('');
  };
  const initiateDeleteUser = (u: UserAccount) => {
    if (u.username === 'admin') { alert("Admin não pode ser excluído."); return; }
    setDeleteTarget({ type: 'user', id: u.id });
    setDeletePassword(''); setDeleteError('');
  };

  const confirmDelete = () => {
    if (deletePassword !== '02965740155') { setDeleteError('Senha incorreta.'); return; }
    if (deleteTarget?.type === 'vehicle') onDeleteVehicle(deleteTarget.id);
    else if (deleteTarget?.type === 'employee') onDeleteEmployee(deleteTarget.id);
    else if (deleteTarget?.type === 'user') onDeleteUser(deleteTarget.id);
    showToast("Registro removido.");
    setDeleteTarget(null);
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ googleSheetsUrl: settingsForm.googleSheetsUrl.trim() });
    showToast("Configurações salvas!");
  };

  // --- TRIP FORM SUBMIT ---
  const handleTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stops = [];
    // Origin
    stops.push({
        unitId: tripForm.originId,
        type: 'ORIGIN',
        eta: new Date(`${tripForm.originDate}T${tripForm.originTime}:00`).toISOString(),
        status: VehicleStatus.PENDING
    });
    // Intermediate
    if (tripForm.hasIntermediate) {
        stops.push({
            unitId: tripForm.intId,
            type: 'INTERMEDIATE',
            eta: new Date(`${tripForm.intDate}T${tripForm.intTime}:00`).toISOString(),
            status: VehicleStatus.PENDING
        });
    }
    // Dest
    if (tripForm.hasDestination) {
        stops.push({
            unitId: tripForm.destId,
            type: 'DESTINATION',
            eta: new Date(`${tripForm.destDate}T${tripForm.destTime}:00`).toISOString(),
            status: VehicleStatus.PENDING
        });
    }

    if (stops.length < 2 && !tripForm.hasDestination) {
        // If only origin is set, technically valid as a "Start only" task?
        // Let's allow it but maybe warn
    }

    if (editingVehicleId) {
        const original = state.vehicles.find(v => v.id === editingVehicleId);
        if (original) onEditVehicle({ ...original, number: tripForm.number, route: tripForm.route, stops: stops as any });
        setEditingVehicleId(null);
        showToast("Viagem atualizada!");
    } else {
        onAddVehicle({ number: tripForm.number, route: tripForm.route, stops });
        showToast("Nova viagem criada!");
    }
    
    setTripForm({ ...tripForm, number: '', route: '', hasIntermediate: false, hasDestination: true });
  };

  const startEditingTrip = (v: Vehicle) => {
     setEditingVehicleId(v.id);
     const origin = v.stops.find(s => s.type === 'ORIGIN');
     const intermediate = v.stops.find(s => s.type === 'INTERMEDIATE');
     const dest = v.stops.find(s => s.type === 'DESTINATION');

     const parseDate = (iso: string) => new Date(iso).toISOString().split('T')[0];
     const parseTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

     setTripForm({
         number: v.number,
         route: v.route,
         originId: origin?.unitId || state.units[0].id,
         originDate: origin ? parseDate(origin.eta) : '',
         originTime: origin ? parseTime(origin.eta) : '',
         
         hasIntermediate: !!intermediate,
         intId: intermediate?.unitId || state.units[0].id,
         intDate: intermediate ? parseDate(intermediate.eta) : '',
         intTime: intermediate ? parseTime(intermediate.eta) : '',

         hasDestination: !!dest,
         destId: dest?.unitId || state.units[0].id,
         destDate: dest ? parseDate(dest.eta) : '',
         destTime: dest ? parseTime(dest.eta) : ''
     });
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const schedule = { days: employeeForm.workDays, startTime: employeeForm.startTime, endTime: employeeForm.endTime };
    if(editingEmployeeId) {
        const org = state.employees.find(x=>x.id===editingEmployeeId);
        if(org) onEditEmployee({...org, name: employeeForm.name, unitId: employeeForm.unitId, workSchedule: schedule});
        showToast("Funcionário atualizado.");
        setEditingEmployeeId(null);
    } else {
        onAddEmployee({ id: `e-${Date.now()}`, name: employeeForm.name, unitId: employeeForm.unitId, active: true, workSchedule: schedule });
        showToast("Funcionário cadastrado.");
    }
    setEmployeeForm({ ...employeeForm, name: '' });
  };

  const handleUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (state.users.some(u => u.username === userForm.username)) { showToast("Usuário já existe", 'error'); return; }
      onAddUser({ id: `u-${Date.now()}`, username: userForm.username, password: userForm.password, role: userForm.role, unitId: userForm.role === 'unit' ? userForm.unitId : undefined });
      setUserForm({ ...userForm, username: '' });
      showToast("Usuário criado.");
  };

  // --- UPDATED APPS SCRIPT CODE v10.1 ---
  const appsScriptCode = `
/*
  VERSÃO 10.1 - CORREÇÃO FINAL E SETUP
  
  INSTRUÇÕES DE INSTALAÇÃO:
  1. Acesse https://script.google.com/home
  2. Crie um novo projeto ou abra o existente.
  3. Apague TODO o código que estiver no arquivo "Código.gs".
  4. Cole este código abaixo completo.
  5. Clique no ícone de Salvar (💾).
  6. Na barra superior, selecione a função 'setup' e clique em 'Executar'.
     - Se pedir permissão: Revisar Permissões > Escolher Conta > Avançado > Acessar Projeto (Não seguro) > Permitir.
  7. Após ver "SUCESSO" no log, clique em 'Implantar' > 'Nova Implantação'.
  8. Em 'Tipo', selecione 'App da Web'.
  9. Em 'Quem pode acessar', selecione 'Qualquer pessoa' (MUITO IMPORTANTE).
  10. Clique em 'Implantar', copie a URL e cole no painel do App.
*/

function setup() {
  var result = { status: "iniciado", steps: [] };
  console.log("🚀 INICIANDO SETUP (V10.1)...");
  
  try {
    // 1. Planilha (Database)
    var ss = getDB();
    console.log("✅ Planilha OK: " + ss.getUrl());
    result.steps.push("Planilha criada/encontrada: " + ss.getName());
    
    // 2. Pasta de Fotos (Drive)
    var folder = ensureFolder();
    console.log("✅ Pasta Drive OK: " + folder.getUrl());
    result.steps.push("Pasta criada/encontrada: " + folder.getName());
    
    console.log("🏁 SETUP CONCLUÍDO COM SUCESSO!");
    console.log("Agora faça a IMPLANTAÇÃO > NOVA VERSÃO e atualize a URL no app.");
    return "SUCESSO!\\nLink Planilha: " + ss.getUrl() + "\\nLink Pasta: " + folder.getUrl();
    
  } catch (e) {
    console.error("❌ ERRO FATAL NO SETUP: " + e.toString());
    throw e;
  }
}

function getDB() {
  // Nome fixo para garantir que sempre use a mesma planilha
  var fileName = "DB_SaoLuiz_System";
  var files = DriveApp.getFilesByName(fileName);
  
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  
  // Se não existir, cria
  var ss = SpreadsheetApp.create(fileName);
  var sheet = ss.getSheets()[0];
  sheet.setName("Logs");
  sheet.appendRow(["Data/Hora", "Veículo", "Rota", "Unidade", "Tipo", "Funcionário", "Status", "Links Fotos", "JSON Raw"]);
  return ss;
}

function ensureFolder() {
  var folderName = "SaoLuiz_Fotos";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  
  var folder = DriveApp.createFolder(folderName);
  try {
    // Tenta deixar público para facilitar visualização
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    console.log("Aviso: Não foi possível definir permissão pública na pasta (normal em contas corporativas).");
  }
  return folder;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    version: "10.1",
    message: "Servidor Operacional.",
    time: new Date().toString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); // Aguarda até 30s para evitar conflito

  try {
    var output = { result: "success", version: "10.1" };
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var ss = getDB();

    if (data.action === 'saveState') {
       // === MODO BACKUP DE ESTADO ===
       var sheet = ss.getSheetByName("DB_State");
       if (!sheet) { sheet = ss.insertSheet("DB_State"); }
       sheet.clear();
       sheet.getRange("A1").setValue(JSON.stringify(data.state));
       output.type = "state_saved";
    } else {
       // === MODO LOG OPERACIONAL ===
       var sheet = ss.getSheetByName("Logs");
       if (!sheet) { 
         sheet = ss.insertSheet("Logs");
         sheet.appendRow(["Data/Hora", "Veículo", "Rota", "Unidade", "Tipo", "Funcionário", "Status", "Links Fotos", "JSON Raw"]);
       }
       
       var photoLinks = [];
       if (data.photos && data.photos.length > 0) {
          var folder = ensureFolder();
          for (var i = 0; i < data.photos.length; i++) {
             try {
               var raw = data.photos[i];
               var b64 = raw.indexOf('base64,') > -1 ? raw.split('base64,')[1] : raw;
               var blob = Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", "FOTO_" + Date.now() + "_" + i + ".jpg");
               var file = folder.createFile(blob);
               try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
               photoLinks.push(file.getUrl());
             } catch (err) {
               photoLinks.push("Erro Upload: " + err.toString());
             }
          }
       }

       var r_time = data.timestamp || new Date().toString();
       sheet.appendRow([
         r_time, 
         data.vehicle || "", 
         data.route || "", 
         data.unit || "", 
         data.stopType || "", 
         data.employee || "", 
         data.status || "", 
         photoLinks.join("\\n"), 
         JSON.stringify(data)
       ]);
       output.type = "log_saved";
    }
    
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      error: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`.trim();

  const inputClassName = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sle-navy dark:text-white p-3.5 focus:ring-2 focus:ring-sle-blue/20 focus:border-sle-blue outline-none transition-all duration-200 shadow-sm text-sm";
  const labelClassName = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1";

  return (
    <div className="min-h-screen bg-sle-bg dark:bg-slate-950 transition-colors duration-300">
      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl border text-white ${toast.type === 'success' ? 'bg-green-600 border-green-500' : 'bg-red-600 border-red-500'}`}>
           {toast.message}
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
         {/* Header & Tabs */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
                <h2 className="text-4xl font-light text-sle-navy dark:text-white tracking-tight">Painel <span className="font-semibold text-sle-blue">Administrativo</span></h2>
            </div>
            <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
                {[
                    {id: 'dashboard', icon: TrendingUp, label: 'Analytics'},
                    {id: 'fleet', icon: Map, label: 'Viagens'},
                    {id: 'team', icon: Users, label: 'Equipe'},
                    {id: 'access', icon: Key, label: 'Acessos'},
                    {id: 'settings', icon: Link, label: 'Config'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-sle-navy text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>
         </div>

         {/* DELETE MODAL */}
         {deleteTarget && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                 <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full">
                     <h3 className="font-bold text-lg mb-4">Confirmar Exclusão</h3>
                     <input type="password" placeholder="Senha Admin" className={inputClassName} value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} />
                     {deleteError && <p className="text-red-500 text-xs mt-2">{deleteError}</p>}
                     <div className="flex gap-2 mt-4">
                         <Button onClick={()=>setDeleteTarget(null)} variant="secondary" className="flex-1">Cancelar</Button>
                         <Button onClick={confirmDelete} variant="danger" className="flex-1">Apagar</Button>
                     </div>
                 </div>
             </div>
         )}

         {/* DASHBOARD TAB */}
         {activeTab === 'dashboard' && (
             <div className="space-y-6 animate-in fade-in">
                 {/* FILTERS */}
                 <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                     <div className="w-full md:w-1/3">
                         <label className={labelClassName}>Filtrar Unidade</label>
                         <div className="relative">
                             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                             <select className={`${inputClassName} pl-10`} value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
                                 <option value="all">Todas as Unidades</option>
                                 {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                         </div>
                     </div>
                     <div className="w-full md:w-1/3">
                         <label className={labelClassName}>Data Inicial</label>
                         <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            <input type="date" className={`${inputClassName} pl-10`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                         </div>
                     </div>
                     <div className="w-full md:w-1/3">
                         <label className={labelClassName}>Data Final</label>
                         <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            <input type="date" className={`${inputClassName} pl-10`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                         </div>
                     </div>
                     {(startDate || endDate || filterUnit !== 'all') && (
                         <button onClick={() => { setStartDate(''); setEndDate(''); setFilterUnit('all'); }} className="text-xs text-red-500 hover:underline mb-4 md:mb-0">
                             Limpar
                         </button>
                     )}
                 </div>

                 {/* KPIs */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                     <Card className="border-l-4 border-l-sle-blue dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold">{analytics.totalTrips}</div>
                                <div className="text-xs uppercase text-slate-400">Viagens Cadastradas</div>
                             </div>
                             <Truck className="w-8 h-8 text-slate-200" />
                         </div>
                     </Card>
                     <Card className="border-l-4 border-l-green-500 dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold">{analytics.efficiency}%</div>
                                <div className="text-xs uppercase text-slate-400">Eficiência Global</div>
                                <div className="text-[10px] text-slate-400 mt-1">(Exclui pendentes no prazo)</div>
                             </div>
                             <TrendingUp className="w-8 h-8 text-green-100" />
                         </div>
                     </Card>
                     <Card className="border-l-4 border-l-red-500 dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold text-red-500">{analytics.chartDataStatus.find(x=>x.name.includes('Atrasos'))?.value || 0}</div>
                                <div className="text-xs uppercase text-slate-400">Ocorrências de Atraso</div>
                             </div>
                             <AlertTriangle className="w-8 h-8 text-red-100" />
                         </div>
                     </Card>
                 </div>

                 {/* Charts Row */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="dark:bg-slate-900 min-h-[300px]">
                        <h3 className="font-bold text-lg mb-4 text-sle-navy dark:text-white">Status da Frota</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={analytics.chartDataStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {analytics.chartDataStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card className="dark:bg-slate-900 min-h-[300px]">
                        <h3 className="font-bold text-lg mb-4 text-sle-navy dark:text-white">Top Funcionários (Atendimentos)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.topEmployees} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="count" fill="#2E31B4" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                 </div>

                 {/* Suggestions & Insights */}
                 <div className="grid grid-cols-1 gap-6">
                     <Card className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 border-blue-100">
                         <h3 className="font-bold text-lg mb-4 text-sle-navy dark:text-white flex items-center gap-2">
                             <Lightbulb className="w-5 h-5 text-yellow-500" /> Insights de Operação (IA)
                         </h3>
                         {analytics.suggestions.length > 0 ? (
                             <ul className="space-y-3">
                                 {analytics.suggestions.map((s, i) => (
                                     <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                         <span className="text-blue-500 font-bold mt-0.5">•</span>
                                         {s}
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <div className="text-sm text-slate-500 flex items-center gap-2">
                                 <CheckCircle2 className="w-4 h-4 text-green-500" />
                                 Operação estável. Nenhuma anomalia grave detectada.
                             </div>
                         )}
                     </Card>
                     
                     {/* Justification Queue */}
                     <Card className="dark:bg-slate-900">
                         <h3 className="font-bold text-lg mb-4 text-sle-navy dark:text-white flex items-center justify-between">
                             <span>Justificativas Pendentes</span>
                             <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                                 {state.justifications.filter(j => j.status === JustificationStatus.PENDING).length}
                             </span>
                         </h3>
                         <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                             {state.justifications.filter(j => j.status === JustificationStatus.PENDING).length === 0 ? (
                                 <p className="text-slate-400 text-sm italic">Nenhuma pendência.</p>
                             ) : (
                                 state.justifications.filter(j => j.status === JustificationStatus.PENDING).map(justification => {
                                     const vehicle = state.vehicles.find(v => v.id === justification.vehicleId);
                                     const unit = state.units.find(u => u.id === justification.unitId);
                                     return (
                                         <div key={justification.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                                             <div className="flex justify-between items-start mb-2">
                                                 <div>
                                                     <span className="font-bold text-sle-navy dark:text-white">{vehicle?.number}</span>
                                                     <span className="text-xs text-slate-400 ml-2">{unit?.name}</span>
                                                 </div>
                                                 <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                                     {new Date(justification.timestamp).toLocaleDateString()}
                                                 </span>
                                             </div>
                                             <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 mb-3">
                                                 <p className="text-xs font-bold text-red-500 mb-1">{justification.category}</p>
                                                 <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{justification.text}"</p>
                                             </div>
                                             
                                             {justification.aiAnalysis && (
                                                <div className="mb-3 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-900/50 text-slate-700 dark:text-slate-300">
                                                    <strong className="text-blue-600 block mb-1 flex items-center gap-1"><Zap className="w-3 h-3"/> Análise IA:</strong>
                                                    {justification.aiAnalysis}
                                                </div>
                                             )}

                                             <div className="flex gap-2">
                                                 <Button 
                                                     size="sm" 
                                                     variant="primary" 
                                                     className="flex-1 bg-green-600 hover:bg-green-700"
                                                     onClick={() => onReviewJustification(justification.id, JustificationStatus.APPROVED, 'Aprovado pelo Admin')}
                                                 >
                                                     Aceitar
                                                 </Button>
                                                 <Button 
                                                     size="sm" 
                                                     variant="secondary" 
                                                     className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                     onClick={() => onReviewJustification(justification.id, JustificationStatus.REJECTED, 'Rejeitado pelo Admin')}
                                                 >
                                                     Rejeitar
                                                 </Button>
                                             </div>
                                         </div>
                                     );
                                 })
                             )}
                         </div>
                     </Card>
                 </div>
             </div>
         )}

         {/* SETTINGS TAB */}
         {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                 <Card>
                     <div className="flex items-center gap-3 mb-6">
                         <div className="bg-green-100 p-2 rounded-full"><FileJson className="w-6 h-6 text-green-600" /></div>
                         <div>
                             <h3 className="text-lg font-bold text-sle-navy">Conexão Google Apps Script</h3>
                             <p className="text-xs text-slate-500">Integração com Planilha e Drive</p>
                         </div>
                     </div>

                     <form onSubmit={handleSettingsSubmit} className="space-y-4">
                         <div>
                             <label className={labelClassName}>URL do Web App (Exec)</label>
                             <input 
                                 type="text" 
                                 className={inputClassName}
                                 value={settingsForm.googleSheetsUrl}
                                 onChange={(e) => setSettingsForm({...settingsForm, googleSheetsUrl: e.target.value})}
                                 placeholder="https://script.google.com/macros/s/.../exec"
                             />
                             <p className="text-[10px] text-slate-400 mt-1">Certifique-se de que termina em <code className="bg-slate-100 px-1 rounded">/exec</code> e não <code className="bg-slate-100 px-1 rounded">/edit</code></p>
                         </div>
                         <div className="flex gap-3 pt-2">
                             <Button type="submit" icon={<Save className="w-4 h-4" />}>Salvar URL</Button>
                             <Button type="button" variant="secondary" icon={<Zap className="w-4 h-4 text-yellow-500"/>} onClick={() => onTestSettings(settingsForm.googleSheetsUrl)}>Testar Conexão</Button>
                         </div>
                     </form>
                 </Card>

                 <Card className="bg-slate-50 border-dashed border-2 border-slate-300">
                    <h3 className="font-bold text-slate-600 mb-2 flex items-center gap-2"><Copy className="w-4 h-4"/> Código do Script (v10.1)</h3>
                    <p className="text-xs text-slate-500 mb-4">Copie este código e cole no editor do Google Apps Script.</p>
                    
                    <div className="relative group">
                        <textarea 
                            className="w-full h-64 text-[10px] font-mono bg-white border border-slate-200 rounded-lg p-3 text-slate-600 resize-none outline-none"
                            readOnly
                            value={appsScriptCode}
                        />
                        <button 
                            onClick={() => { navigator.clipboard.writeText(appsScriptCode); showToast("Código copiado!"); }}
                            className="absolute top-2 right-2 bg-white shadow-sm border border-slate-200 px-3 py-1 rounded text-xs font-bold text-sle-blue opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            Copiar
                        </button>
                    </div>
                    
                    <div className="mt-4 bg-yellow-50 p-3 rounded border border-yellow-100 text-xs text-yellow-800">
                        <strong>Importante:</strong> Após colar, salve e execute a função <code>setup()</code> manualmente uma vez para criar a planilha e a pasta.
                    </div>
                 </Card>

                 <Card>
                     <h3 className="font-bold text-lg mb-4">Gestão de Dados</h3>
                     <div className="flex gap-4">
                         <Button variant="secondary" icon={<Download className="w-4 h-4"/>} onClick={() => {
                             const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                             const downloadAnchorNode = document.createElement('a');
                             downloadAnchorNode.setAttribute("href", dataStr);
                             downloadAnchorNode.setAttribute("download", "backup_sao_luiz.json");
                             document.body.appendChild(downloadAnchorNode);
                             downloadAnchorNode.click();
                             downloadAnchorNode.remove();
                         }}>Backup Local (JSON)</Button>
                         
                         <label className="cursor-pointer">
                             <input type="file" className="hidden" accept=".json" onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 const reader = new FileReader();
                                 reader.onload = (evt) => {
                                     try {
                                         const imported = JSON.parse(evt.target?.result as string);
                                         onImportData(imported);
                                         showToast("Dados importados com sucesso!");
                                     } catch (err) {
                                         showToast("Arquivo inválido.", "error");
                                     }
                                 };
                                 reader.readAsText(file);
                             }}/>
                             <span className="inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 px-5 py-2.5 text-sm bg-white border border-slate-200 text-sle-navy hover:bg-slate-50">
                                 <Upload className="mr-2 h-4 w-4" /> Restaurar Backup
                             </span>
                         </label>
                     </div>
                 </Card>
             </div>
         )}

         {/* OTHER TABS (FLEET, TEAM, ACCESS) KEPT SIMPLE FOR BREVITY IN THIS OUTPUT BUT FULLY FUNCTIONAL */}
         {activeTab === 'fleet' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="flex justify-between items-center">
                     <h3 className="font-bold text-xl">Gestão de Viagens</h3>
                     <Button onClick={() => {
                         setTripForm({ number: '', route: '', originId: state.units[0].id, originDate: '', originTime: '08:00', hasIntermediate: false, intId: '', intDate: '', intTime: '', hasDestination: true, destId: state.units[1]?.id, destDate: '', destTime: '18:00' });
                         setEditingVehicleId(null);
                         window.scrollTo({top: 0, behavior: 'smooth'});
                     }} icon={<Plus className="w-4 h-4"/>}>Nova Viagem</Button>
                 </div>

                 <Card className="border-t-4 border-t-sle-blue">
                     <h4 className="font-bold text-sm uppercase text-slate-400 mb-4">{editingVehicleId ? 'Editar Viagem' : 'Cadastrar Nova Viagem'}</h4>
                     <form onSubmit={handleTripSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <div><label className={labelClassName}>Nº Veículo</label><input required value={tripForm.number} onChange={e=>setTripForm({...tripForm, number: e.target.value})} className={inputClassName} placeholder="Ex: V-1020"/></div>
                             <div><label className={labelClassName}>Nome da Rota</label><input required value={tripForm.route} onChange={e=>setTripForm({...tripForm, route: e.target.value})} className={inputClassName} placeholder="Ex: Rota Expressa Sul"/></div>
                         </div>
                         
                         {/* ORIGIN */}
                         <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                             <span className="text-xs font-bold text-green-600 mb-2 block">ORIGEM</span>
                             <div className="space-y-2">
                                 <select className={inputClassName} value={tripForm.originId} onChange={e=>setTripForm({...tripForm, originId: e.target.value})}>
                                     {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                 </select>
                                 <div className="flex gap-2">
                                     <input type="date" required className={inputClassName} value={tripForm.originDate} onChange={e=>setTripForm({...tripForm, originDate: e.target.value})} />
                                     <input type="time" required className={inputClassName} value={tripForm.originTime} onChange={e=>setTripForm({...tripForm, originTime: e.target.value})} />
                                 </div>
                             </div>
                         </div>

                         {/* DESTINATION Toggle & Block */}
                         <div className="md:col-span-2 mt-2">
                             <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                                 <input 
                                    type="checkbox" 
                                    checked={tripForm.hasDestination} 
                                    onChange={e=>setTripForm({...tripForm, hasDestination: e.target.checked})} 
                                    className="w-4 h-4 text-sle-blue rounded focus:ring-sle-blue"
                                 />
                                 Definir Destino Final
                             </label>
                         </div>

                         {tripForm.hasDestination && (
                             <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                                 <span className="text-xs font-bold text-red-600 mb-2 block">DESTINO FINAL</span>
                                 <div className="space-y-2">
                                     <select className={inputClassName} value={tripForm.destId} onChange={e=>setTripForm({...tripForm, destId: e.target.value})}>
                                         {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                     </select>
                                     <div className="flex gap-2">
                                         <input type="date" required className={inputClassName} value={tripForm.destDate} onChange={e=>setTripForm({...tripForm, destDate: e.target.value})} />
                                         <input type="time" required className={inputClassName} value={tripForm.destTime} onChange={e=>setTripForm({...tripForm, destTime: e.target.value})} />
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* INTERMEDIATE TOGGLE */}
                         <div className="md:col-span-2">
                             <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                                 <input type="checkbox" checked={tripForm.hasIntermediate} onChange={e=>setTripForm({...tripForm, hasIntermediate: e.target.checked})} className="w-4 h-4 text-sle-blue rounded focus:ring-sle-blue"/>
                                 Adicionar Parada Intermediária
                             </label>
                         </div>

                         {tripForm.hasIntermediate && (
                             <div className="md:col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                                 <span className="text-xs font-bold text-blue-600 mb-2 block">PARADA INTERMEDIÁRIA</span>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <select className={inputClassName} value={tripForm.intId} onChange={e=>setTripForm({...tripForm, intId: e.target.value})}>
                                         {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                     </select>
                                     <div className="flex gap-2">
                                         <input type="date" className={inputClassName} value={tripForm.intDate} onChange={e=>setTripForm({...tripForm, intDate: e.target.value})} />
                                         <input type="time" className={inputClassName} value={tripForm.intTime} onChange={e=>setTripForm({...tripForm, intTime: e.target.value})} />
                                     </div>
                                 </div>
                             </div>
                         )}

                         <div className="md:col-span-2 flex gap-2 mt-2">
                             {editingVehicleId && <Button type="button" variant="secondary" onClick={() => { setEditingVehicleId(null); setTripForm({...tripForm, number: '', route: ''}); }}>Cancelar Edição</Button>}
                             <Button type="submit" className="flex-1">{editingVehicleId ? 'Salvar Alterações' : 'Cadastrar Viagem'}</Button>
                         </div>
                     </form>
                 </Card>

                 <div className="grid grid-cols-1 gap-4">
                     {state.vehicles.filter(v => v.status !== VehicleStatus.CANCELLED).map(v => (
                         <Card key={v.id} noPadding className="flex flex-col md:flex-row overflow-hidden">
                             <div className="bg-slate-100 p-4 flex flex-col justify-center items-center min-w-[100px] border-r border-slate-200">
                                 <Truck className="w-8 h-8 text-slate-400 mb-2"/>
                                 <span className="font-bold text-lg text-sle-navy">{v.number}</span>
                             </div>
                             <div className="p-4 flex-1">
                                 <div className="flex justify-between mb-2">
                                     <h4 className="font-bold text-slate-700">{v.route}</h4>
                                     <div className="flex gap-2">
                                         <button onClick={() => startEditingTrip(v)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit className="w-4 h-4"/></button>
                                         <button onClick={() => onCancelVehicle(v.id)} className="text-orange-500 hover:bg-orange-50 p-1 rounded" title="Arquivar"><X className="w-4 h-4"/></button>
                                         <button onClick={() => initiateDeleteVehicle(v)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir Permanentemente"><Trash2 className="w-4 h-4"/></button>
                                     </div>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-2 text-sm">
                                     {v.stops.map((s, idx) => (
                                         <div key={idx} className="flex items-center gap-2">
                                             <div className={`px-3 py-1 rounded-full border text-xs font-bold ${s.status === VehicleStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                 {state.units.find(u => u.id === s.unitId)?.name} 
                                                 <span className="ml-1 opacity-70">({new Date(s.eta).toLocaleTimeString().slice(0,5)})</span>
                                             </div>
                                             {idx < v.stops.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </Card>
                     ))}
                 </div>
             </div>
         )}

         {/* TEAM TAB */}
         {activeTab === 'team' && (
             <div className="space-y-6 animate-in fade-in">
                 <Card>
                     <h3 className="font-bold text-lg mb-4">Novo Colaborador</h3>
                     <form onSubmit={handleEmployeeSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                         <div className="flex-1 w-full">
                             <label className={labelClassName}>Nome Completo</label>
                             <input required className={inputClassName} value={employeeForm.name} onChange={e=>setEmployeeForm({...employeeForm, name: e.target.value})} placeholder="Ex: João da Silva" />
                         </div>
                         <div className="w-full md:w-1/3">
                             <label className={labelClassName}>Unidade Base</label>
                             <select className={inputClassName} value={employeeForm.unitId} onChange={e=>setEmployeeForm({...employeeForm, unitId: e.target.value})}>
                                 {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                         </div>
                         <Button type="submit" icon={<Plus className="w-4 h-4"/>}>{editingEmployeeId ? 'Atualizar' : 'Cadastrar'}</Button>
                     </form>
                 </Card>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {state.employees.map(emp => (
                         <div key={emp.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${emp.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                             <div className="flex justify-between items-start mb-3">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${emp.active ? 'bg-sle-blue' : 'bg-slate-300'}`}>
                                         {emp.name.charAt(0)}
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-sle-navy text-sm">{emp.name}</h4>
                                         <span className="text-xs text-slate-400">{state.units.find(u=>u.id===emp.unitId)?.name}</span>
                                     </div>
                                 </div>
                                 <div className="flex gap-1">
                                     <button onClick={() => { setEmployeeForm({ name: emp.name, unitId: emp.unitId, workDays: emp.workSchedule?.days || [], startTime: emp.workSchedule?.startTime || '08:00', endTime: emp.workSchedule?.endTime || '18:00' }); setEditingEmployeeId(emp.id); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-1.5 hover:bg-slate-100 rounded text-blue-500"><Edit className="w-3 h-3"/></button>
                                     <button onClick={() => onToggleEmployeeStatus(emp.id)} className={`p-1.5 hover:bg-slate-100 rounded ${emp.active ? 'text-green-500' : 'text-slate-400'}`} title={emp.active ? "Desativar" : "Ativar"}>
                                         <Zap className="w-3 h-3 fill-current" />
                                     </button>
                                     <button onClick={() => initiateDeleteEmployee(emp)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3"/></button>
                                 </div>
                             </div>
                             <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded flex justify-between">
                                 <span>{emp.workSchedule?.days.length} dias/sem</span>
                                 <span>{emp.workSchedule?.startTime} - {emp.workSchedule?.endTime}</span>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* ACCESS TAB */}
         {activeTab === 'access' && (
             <div className="space-y-6 animate-in fade-in">
                 <Card className="border-l-4 border-l-purple-500">
                     <h3 className="font-bold text-lg mb-4">Novo Usuário</h3>
                     <form onSubmit={handleUserSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                         <div>
                             <label className={labelClassName}>Usuário (Login)</label>
                             <input required className={inputClassName} value={userForm.username} onChange={e=>setUserForm({...userForm, username: e.target.value})} placeholder="usuario.unidade" />
                         </div>
                         <div>
                             <label className={labelClassName}>Senha</label>
                             <input required type="text" className={inputClassName} value={userForm.password} onChange={e=>setUserForm({...userForm, password: e.target.value})} placeholder="****" />
                         </div>
                         <div>
                             <label className={labelClassName}>Permissão</label>
                             <select className={inputClassName} value={userForm.role} onChange={e=>setUserForm({...userForm, role: e.target.value as any})}>
                                 <option value="unit">Unidade (Operacional)</option>
                                 <option value="admin">Administrador</option>
                             </select>
                         </div>
                         {userForm.role === 'unit' && (
                             <div>
                                 <label className={labelClassName}>Vincular Unidade</label>
                                 <select className={inputClassName} value={userForm.unitId} onChange={e=>setUserForm({...userForm, unitId: e.target.value})}>
                                     {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                 </select>
                             </div>
                         )}
                         <Button type="submit" icon={<Key className="w-4 h-4"/>}>Criar Acesso</Button>
                     </form>
                 </Card>

                 <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                             <tr>
                                 <th className="p-4">Usuário</th>
                                 <th className="p-4">Função</th>
                                 <th className="p-4">Unidade</th>
                                 <th className="p-4 text-right">Ações</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {state.users.map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50">
                                     <td className="p-4 font-medium text-sle-navy">{u.username}</td>
                                     <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role.toUpperCase()}</span></td>
                                     <td className="p-4 text-slate-500">{u.role === 'unit' ? state.units.find(un => un.id === u.unitId)?.name : 'Acesso Total'}</td>
                                     <td className="p-4 text-right">
                                         {u.username !== 'admin' && (
                                             <button onClick={() => initiateDeleteUser(u)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
