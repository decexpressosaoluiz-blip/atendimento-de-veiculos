
import React, { useState, useEffect } from 'react';
import { AppState, JustificationStatus, Employee, Vehicle, VehicleStatus, UserAccount } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Check, X, Download, Plus, Truck, Users, Key, Edit, Save, Trash2, Link, Map, ArrowRight, MapPin, Upload, Copy, HelpCircle, FileJson, Zap, Lightbulb, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
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
     
     let totalStops = 0;
     let completedStops = 0;
     let lateStops = 0;
     
     const employeeStats: Record<string, number> = {};
     const unitDelays: Record<string, number> = {};
     
     activeVehicles.forEach(v => {
         v.stops.forEach(s => {
             totalStops++;
             if (s.status === VehicleStatus.COMPLETED) {
                 completedStops++;
                 if (s.servicedByEmployeeId) {
                     const name = state.employees.find(e => e.id === s.servicedByEmployeeId)?.name || 'Unknown';
                     employeeStats[name] = (employeeStats[name] || 0) + 1;
                 }
             }
             
             // Check latency (Past pending or Late justified)
             const isLate = (s.status === VehicleStatus.PENDING && new Date() > new Date(s.eta)) || 
                            s.status === VehicleStatus.LATE_JUSTIFIED;
             if (isLate) {
                 lateStops++;
                 const unitName = state.units.find(u => u.id === s.unitId)?.name || 'Unknown';
                 unitDelays[unitName] = (unitDelays[unitName] || 0) + 1;
             }
         });
     });

     const efficiency = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
     const topEmployees = Object.entries(employeeStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5);

     const chartDataStatus = [
        { name: 'No Prazo', value: completedStops, color: '#10B981' }, // emerald-500
        { name: 'Atrasos', value: lateStops, color: '#EF4444' },       // red-500
        { name: 'Pendentes', value: totalStops - completedStops - lateStops, color: '#3B82F6' } // blue-500
     ];

     // Suggestions
     const suggestions = [];
     if (lateStops > completedStops * 0.2) suggestions.push("Alto índice de atrasos. Considere rever os tempos estimados das rotas.");
     if (efficiency < 50 && totalTrips > 0) suggestions.push("Eficiência abaixo de 50%. Verifique se os motoristas estão registrando as paradas corretamente.");
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

  // --- UPDATED APPS SCRIPT CODE WITH ROBUST DB HANDLING ---
  const appsScriptCode = `
/*
  INSTRUÇÕES IMPORTANTES PARA "FAILED TO FETCH":
  1. Publique como Web App.
  2. Executar como: "Eu" (Me).
  3. Quem pode acessar: "Qualquer pessoa" (Anyone) -> ESSENCIAL!
  4. DEPOIS DE SALVAR O CÓDIGO, CLIQUE EM 'EXECUTAR' NA FUNÇÃO 'doGet' DENTRO DO EDITOR.
     Isso forçará o Google a pedir permissão para acessar seu Drive e Planilhas.
     Sem isso, o script falha silenciosamente e retorna erro de rede.
*/

function getDB() {
  var ss;
  try {
    // Tenta pegar a planilha ativa (funciona se o script estiver vinculado)
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {}
  
  if (!ss) {
    // Modo Standalone: Procura arquivo pelo nome ou cria um novo
    try {
      var fileName = "DB_SaoLuiz_System";
      var files = DriveApp.getFilesByName(fileName);
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      } else {
        ss = SpreadsheetApp.create(fileName);
      }
    } catch (e) {
      throw new Error("ERRO PERMISSÃO DRIVE: " + e.toString());
    }
  }
  return ss;
}

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var ss = getDB();
    var sheet = ss.getSheetByName("DB_State");
    var data = "{}";
    if (sheet) {
       data = sheet.getRange("A1").getValue();
    }
    if (!data || data === "") data = "{}";
    return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    // Retorna JSON com erro explicito
    return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var output = { result: "success" };
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var ss = getDB();
    
    if (data.action === 'saveState') {
       var sheet = ss.getSheetByName("DB_State");
       if (!sheet) { sheet = ss.insertSheet("DB_State"); sheet.hideSheet(); }
       sheet.getRange("A1").setValue(JSON.stringify(data.state));
       output.type = "state_saved";
    } else {
       var sheet = ss.getSheetByName("Logs");
       if (!sheet) { 
         sheet = ss.insertSheet("Logs");
         sheet.appendRow(["Data/Hora", "Veículo", "Rota", "Unidade", "Tipo Parada", "Funcionário", "Status", "Link Foto", "JSON"]);
       }
       
       var photoLink = "";
       if (data.photos && data.photos.length > 0) {
          try {
            var folderName = "SaoLuiz_Fotos";
            var folders = DriveApp.getFoldersByName(folderName);
            var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

            var raw = data.photos[0];
            var cleanBase64 = raw.indexOf('base64,') > -1 ? raw.split('base64,')[1] : raw;
            
            var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), "image/jpeg", data.vehicle + "_" + new Date().getTime() + ".jpg");
            var file = folder.createFile(blob);
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            photoLink = file.getUrl();
          } catch(err) {
            photoLink = "Erro Foto: " + err.toString();
          }
       }

       sheet.appendRow([
          data.timestamp, 
          data.vehicle, 
          data.route, 
          data.unit, 
          data.stopType, 
          data.employee, 
          data.status, 
          photoLink, 
          JSON.stringify(data)
       ]);
       output.type = "log_saved";
    }
    
    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({"result":"error", "error": e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`.trim();

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
                 {/* KPIs */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                     <Card className="border-l-4 border-l-sle-blue dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold">{analytics.totalTrips}</div>
                                <div className="text-xs uppercase text-slate-400">Viagens Ativas</div>
                             </div>
                             <Truck className="w-8 h-8 text-slate-200" />
                         </div>
                     </Card>
                     <Card className="border-l-4 border-l-green-500 dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold">{analytics.efficiency}%</div>
                                <div className="text-xs uppercase text-slate-400">Eficiência Global</div>
                             </div>
                             <TrendingUp className="w-8 h-8 text-green-100" />
                         </div>
                     </Card>
                     <Card className="border-l-4 border-l-red-500 dark:bg-slate-900">
                         <div className="flex justify-between items-start">
                             <div>
                                <div className="text-4xl font-bold text-red-500">{analytics.chartDataStatus.find(x=>x.name === 'Atrasos')?.value || 0}</div>
                                <div className="text-xs uppercase text-slate-400">Atrasos Registrados</div>
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
                             <Lightbulb className="w-5 h-5 text-yellow-500" />
                             Insights & Sugestões Inteligentes
                         </h3>
                         {analytics.suggestions.length > 0 ? (
                             <ul className="space-y-2">
                                 {analytics.suggestions.map((s, i) => (
                                     <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                         <div className="min-w-[6px] h-[6px] rounded-full bg-sle-blue mt-1.5"></div>
                                         {s}
                                     </li>
                                 ))}
                             </ul>
                         ) : (
                             <p className="text-sm text-slate-500">Nenhum problema crítico detectado. A operação está fluindo bem!</p>
                         )}
                     </Card>
                 </div>
             </div>
         )}

         {/* FLEET (VIAGENS) TAB */}
         {activeTab === 'fleet' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                 {/* Form */}
                 <div className="lg:col-span-4">
                     <div className="sticky top-24">
                         <Card className="border-t-4 border-t-sle-red shadow-lg dark:bg-slate-900">
                             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                 {editingVehicleId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                 {editingVehicleId ? 'Editar Viagem' : 'Nova Viagem'}
                             </h3>
                             <form onSubmit={handleTripSubmit} className="space-y-4">
                                 <div>
                                     <label className={labelClassName}>Veículo / Frota</label>
                                     <input required className={inputClassName} value={tripForm.number} onChange={e => setTripForm({...tripForm, number: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className={labelClassName}>Nome da Rota</label>
                                     <input required className={inputClassName} value={tripForm.route} onChange={e => setTripForm({...tripForm, route: e.target.value})} />
                                 </div>
                                 
                                 {/* Origin */}
                                 <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                     <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded mb-2 inline-block">ORIGEM</span>
                                     <div className="space-y-2">
                                         <select className={inputClassName} value={tripForm.originId} onChange={e => setTripForm({...tripForm, originId: e.target.value})}>
                                             {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                         </select>
                                         <div className="grid grid-cols-2 gap-2">
                                             <input type="date" className={inputClassName} value={tripForm.originDate} onChange={e => setTripForm({...tripForm, originDate: e.target.value})} />
                                             <input type="time" className={inputClassName} value={tripForm.originTime} onChange={e => setTripForm({...tripForm, originTime: e.target.value})} />
                                         </div>
                                     </div>
                                 </div>

                                 {/* Intermediate Toggle */}
                                 <div>
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input type="checkbox" checked={tripForm.hasIntermediate} onChange={e => setTripForm({...tripForm, hasIntermediate: e.target.checked})} />
                                         <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Adicionar Unidade de Meio</span>
                                     </label>
                                 </div>

                                 {/* Intermediate */}
                                 {tripForm.hasIntermediate && (
                                     <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2">
                                         <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded mb-2 inline-block">PARADA INTERMEDIÁRIA</span>
                                         <div className="space-y-2">
                                             <select className={inputClassName} value={tripForm.intId} onChange={e => setTripForm({...tripForm, intId: e.target.value})}>
                                                 {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                             </select>
                                             <div className="grid grid-cols-2 gap-2">
                                                 <input type="date" className={inputClassName} value={tripForm.intDate} onChange={e => setTripForm({...tripForm, intDate: e.target.value})} />
                                                 <input type="time" className={inputClassName} value={tripForm.intTime} onChange={e => setTripForm({...tripForm, intTime: e.target.value})} />
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* Destination Toggle */}
                                 <div>
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input type="checkbox" checked={tripForm.hasDestination} onChange={e => setTripForm({...tripForm, hasDestination: e.target.checked})} />
                                         <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Definir Destino (Opcional)</span>
                                     </label>
                                 </div>

                                 {/* Dest */}
                                 {tripForm.hasDestination && (
                                     <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2">
                                         <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded mb-2 inline-block">DESTINO</span>
                                         <div className="space-y-2">
                                             <select className={inputClassName} value={tripForm.destId} onChange={e => setTripForm({...tripForm, destId: e.target.value})}>
                                                 {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                             </select>
                                             <div className="grid grid-cols-2 gap-2">
                                                 <input type="date" className={inputClassName} value={tripForm.destDate} onChange={e => setTripForm({...tripForm, destDate: e.target.value})} />
                                                 <input type="time" className={inputClassName} value={tripForm.destTime} onChange={e => setTripForm({...tripForm, destTime: e.target.value})} />
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 <Button type="submit" className="w-full" icon={<Save className="w-4 h-4"/>}>Salvar Viagem</Button>
                             </form>
                         </Card>
                     </div>
                 </div>

                 {/* List */}
                 <div className="lg:col-span-8">
                     <h3 className="text-xl font-bold mb-4 text-sle-navy dark:text-white">Viagens Programadas</h3>
                     <div className="space-y-3">
                         {state.vehicles.filter(v => v.status !== VehicleStatus.CANCELLED).slice().reverse().map(v => {
                             const origin = v.stops.find(s => s.type === 'ORIGIN');
                             const dest = v.stops.find(s => s.type === 'DESTINATION');
                             const stopsCount = v.stops.length;
                             
                             const getUnitName = (uid?: string) => state.units.find(u => u.id === uid)?.name || 'N/A';

                             return (
                                 <div key={v.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                     <div>
                                         <h4 className="font-bold text-lg text-sle-navy dark:text-white flex items-center gap-2">
                                             {v.number} 
                                             <span className="text-xs font-normal bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{v.route}</span>
                                         </h4>
                                         
                                         <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-slate-400">
                                             <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {getUnitName(origin?.unitId)}</span>
                                             
                                             {stopsCount > 2 && (
                                                <>
                                                    <ArrowRight className="w-3 h-3" />
                                                    <span className="bg-slate-100 px-1.5 rounded text-[10px]">MEIO</span>
                                                </>
                                             )}

                                             {dest && (
                                                 <>
                                                     <ArrowRight className="w-3 h-3" />
                                                     <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {getUnitName(dest?.unitId)}</span>
                                                 </>
                                             )}
                                         </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-2 self-end md:self-center">
                                         <button onClick={() => startEditingTrip(v)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:text-sle-blue"><Edit className="w-4 h-4" /></button>
                                         <button onClick={() => onCancelVehicle(v.id)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:text-sle-red" title="Cancelar Viagem"><Trash2 className="w-4 h-4" /></button>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             </div>
         )}

         {/* TEAM TAB */}
         {activeTab === 'team' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                 <div className="lg:col-span-4">
                    <Card className="shadow-lg dark:bg-slate-900">
                        <h3 className="text-xl font-bold mb-4">{editingEmployeeId ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                        <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                            <div>
                                <label className={labelClassName}>Nome Completo</label>
                                <input required className={inputClassName} value={employeeForm.name} onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelClassName}>Unidade</label>
                                <select className={inputClassName} value={employeeForm.unitId} onChange={e => setEmployeeForm({...employeeForm, unitId: e.target.value})}>
                                    {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <Button type="submit" className="w-full" icon={<Save className="w-4 h-4"/>}>Salvar</Button>
                        </form>
                    </Card>
                 </div>
                 <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.employees.map(emp => (
                            <Card key={emp.id} className="flex justify-between items-center dark:bg-slate-900">
                                <div>
                                    <h4 className="font-bold text-sle-navy dark:text-white">{emp.name}</h4>
                                    <p className="text-xs text-slate-500">{state.units.find(u => u.id === emp.unitId)?.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        setEmployeeForm({ name: emp.name, unitId: emp.unitId, workDays: emp.workSchedule?.days || [], startTime: emp.workSchedule?.startTime || '08:00', endTime: emp.workSchedule?.endTime || '18:00' });
                                        setEditingEmployeeId(emp.id);
                                    }} className="p-2 hover:bg-slate-100 rounded"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => initiateDeleteEmployee(emp)} className="p-2 hover:bg-red-100 text-red-500 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </Card>
                        ))}
                    </div>
                 </div>
             </div>
         )}

         {/* ACCESS TAB */}
         {activeTab === 'access' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                 <div className="lg:col-span-4">
                    <Card className="shadow-lg dark:bg-slate-900">
                        <h3 className="text-xl font-bold mb-4">Criar Usuário</h3>
                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div>
                                <label className={labelClassName}>Login</label>
                                <input required className={inputClassName} value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelClassName}>Senha</label>
                                <input required className={inputClassName} value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelClassName}>Tipo de Acesso</label>
                                <select className={inputClassName} value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})}>
                                    <option value="unit">Unidade Operacional</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            {userForm.role === 'unit' && (
                                <div>
                                    <label className={labelClassName}>Vincular Unidade</label>
                                    <select className={inputClassName} value={userForm.unitId} onChange={e => setUserForm({...userForm, unitId: e.target.value})}>
                                        {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <Button type="submit" className="w-full" icon={<Plus className="w-4 h-4"/>}>Criar Acesso</Button>
                        </form>
                    </Card>
                 </div>
                 <div className="lg:col-span-8">
                    <div className="space-y-2">
                        {state.users.map(u => (
                            <div key={u.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 p-2 rounded-full"><Users className="w-4 h-4" /></div>
                                    <div>
                                        <p className="font-bold text-sm">{u.username}</p>
                                        <p className="text-xs text-slate-500 uppercase">{u.role === 'admin' ? 'Administrador Total' : `Unidade: ${state.units.find(x=>x.id===u.unitId)?.name}`}</p>
                                    </div>
                                </div>
                                {u.username !== 'admin' && (
                                    <button onClick={() => initiateDeleteUser(u)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </div>
                        ))}
                    </div>
                 </div>
             </div>
         )}

         {/* SETTINGS TAB */}
         {activeTab === 'settings' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                 <div className="lg:col-span-6 space-y-6">
                    <Card className="dark:bg-slate-900">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Link className="w-5 h-5"/> Conexão Google Sheets</h3>
                        <form onSubmit={handleSettingsSubmit} className="space-y-4">
                             <div>
                                 <label className={labelClassName}>URL do Web App</label>
                                 <div className="relative">
                                    <input 
                                        placeholder="https://script.google.com/macros/s/.../exec" 
                                        className={`${inputClassName} ${GLOBAL_APPS_SCRIPT_URL ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                        value={settingsForm.googleSheetsUrl} 
                                        onChange={e => !GLOBAL_APPS_SCRIPT_URL && setSettingsForm({...settingsForm, googleSheetsUrl: e.target.value})}
                                        readOnly={!!GLOBAL_APPS_SCRIPT_URL}
                                    />
                                    {GLOBAL_APPS_SCRIPT_URL && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 flex items-center gap-1">
                                            <Lock className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">FIXADO</span>
                                        </div>
                                    )}
                                 </div>
                                 {GLOBAL_APPS_SCRIPT_URL && (
                                     <p className="text-[10px] text-green-600 mt-1 ml-1">
                                         ✓ A URL foi configurada via código para garantir sincronização automática em todos os dispositivos.
                                     </p>
                                 )}
                             </div>
                             <div className="flex gap-2">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => onTestSettings(settingsForm.googleSheetsUrl)} icon={<Zap className="w-4 h-4"/>}>
                                    Testar Integração
                                </Button>
                                <Button type="submit" className="flex-[2]" disabled={!!GLOBAL_APPS_SCRIPT_URL}>Salvar Conexão</Button>
                             </div>
                        </form>
                    </Card>

                    <Card className="dark:bg-slate-900 border-t-4 border-t-blue-500">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FileJson className="w-5 h-5"/> Backup e Persistência</h3>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                                const dl = document.createElement('a');
                                dl.setAttribute("href", dataStr);
                                dl.setAttribute("download", "sao_luiz_backup.json");
                                dl.click();
                            }} icon={<Download className="w-4 h-4"/>} className="flex-1">
                                Baixar Dados
                            </Button>
                            <div className="relative flex-1">
                                <input type="file" accept=".json" onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        const fr = new FileReader();
                                        fr.onload = (ev) => {
                                            if (ev.target?.result) onImportData(JSON.parse(ev.target.result as string));
                                        };
                                        fr.readAsText(e.target.files[0]);
                                    }
                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <Button variant="secondary" icon={<Upload className="w-4 h-4"/>} className="w-full">
                                    Restaurar
                                </Button>
                            </div>
                        </div>
                    </Card>
                 </div>

                 <div className="lg:col-span-6">
                    <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4"/> Script de Sincronização
                        </h3>
                        <p className="text-xs text-slate-500 mb-2">
                            Copie o código abaixo para o seu projeto do Google Apps Script.
                        </p>
                        <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg mb-3 border border-yellow-200 font-bold">
                           ⚠️ IMPORTANTE: Publique como Web App (Executar como: EU / Acesso: QUALQUER PESSOA).
                           <br/>
                           ⚠️ DEPOIS DE SALVAR, EXECUTE A FUNÇÃO 'doGet' NO EDITOR PARA AUTORIZAR.
                        </div>
                        <div className="relative group">
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap border border-slate-700 h-64">
                                {appsScriptCode}
                            </pre>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(appsScriptCode); showToast("Código copiado!"); }}
                                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded text-white"
                                title="Copiar Código"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </Card>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};
