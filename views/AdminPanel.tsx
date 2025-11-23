
import React, { useState, useEffect } from 'react';
import { AppState, JustificationStatus, Employee, Vehicle, VehicleStatus, UserAccount, Unit, RouteTemplate, TripStop } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Check, X, Download, Plus, Truck, Users, Key, Edit, Save, Trash2, Link, Map, ArrowRight, MapPin, Upload, Copy, HelpCircle, FileJson, Zap, Lightbulb, TrendingUp, AlertTriangle, Lock, Calendar, Filter, CheckCircle2, Search, Route as RouteIcon, Clock, Navigation } from 'lucide-react';
import { GLOBAL_APPS_SCRIPT_URL } from '../constants';
import { findLocationWithAI, calculateRouteLogistics } from '../services/geminiService';

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
  // New props for Units and Routes management (can reuse generic setters if you prefer, but specific is cleaner)
  onAddUnit?: (unit: Unit) => void;
  onDeleteUnit?: (id: string) => void;
  onAddRoute?: (route: RouteTemplate) => void;
  onDeleteRoute?: (id: string) => void;
}

// Temporary internal wrapper to avoid changing App.tsx signature too much for this demo, 
// in a real app these would be passed down from App.tsx
const AdminPanelWithLogic: React.FC<AdminPanelProps> = (props) => {
    // We need to mutate state for Units/Routes locally if the props aren't provided by App.tsx yet
    // For this implementation, we will assume the parent "state" is immutable and we emit changes via onImportData 
    // or we can hack it by using onUpdateSettings to trigger a save, OR better:
    // We will just allow the user to modify the 'state' via a direct update helper that calls onImportData with the new state.
    
    const updateGlobalState = (newState: AppState) => {
        props.onImportData(newState);
    };

    return <AdminPanelInternal {...props} updateGlobalState={updateGlobalState} />;
}

// Separate component to use hooks cleanly
const AdminPanelInternal: React.FC<AdminPanelProps & { updateGlobalState: (s: AppState) => void }> = ({ 
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
  onTestSettings,
  updateGlobalState
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'routes' | 'units' | 'team' | 'access' | 'settings'>('dashboard');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- FILTERS ---
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- DELETE MODAL STATE ---
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'vehicle' | 'employee' | 'user' | 'unit' | 'route', id: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // --- UNIT FORM STATE ---
  const [unitForm, setUnitForm] = useState({ name: '', location: '', addressSearch: '', lat: 0, lng: 0, foundAddress: '' });
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // --- ROUTE TEMPLATE FORM STATE ---
  const [routeForm, setRouteForm] = useState({ 
      name: '', 
      selectedUnits: [] as string[], // Sequence of Unit IDs
      isCalculating: false,
      calculatedSegments: [] as any[],
      totalTime: 0,
      totalDist: 0
  });

  // --- TRIP FORM STATE ---
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState({
    number: '',
    routeTemplateId: '', // If selecting a preset
    manualMode: false,
    
    // Manual Fields
    route: '',
    originId: state.units[0]?.id || '',
    originDate: new Date().toISOString().split('T')[0],
    originTime: '08:00',
    hasIntermediate: false,
    intId: '',
    intDate: '',
    intTime: '',
    hasDestination: true,
    destId: '',
    destDate: '',
    destTime: ''
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

  // --- ACTIONS ---
  const confirmDelete = () => {
    if (deletePassword !== '02965740155') { setDeleteError('Senha incorreta.'); return; }
    
    if (deleteTarget?.type === 'vehicle') onDeleteVehicle(deleteTarget.id);
    else if (deleteTarget?.type === 'employee') onDeleteEmployee(deleteTarget.id);
    else if (deleteTarget?.type === 'user') onDeleteUser(deleteTarget.id);
    else if (deleteTarget?.type === 'unit') {
        const newUnits = state.units.filter(u => u.id !== deleteTarget.id);
        updateGlobalState({ ...state, units: newUnits });
    }
    else if (deleteTarget?.type === 'route') {
        const newRoutes = (state.routes || []).filter(r => r.id !== deleteTarget.id);
        updateGlobalState({ ...state, routes: newRoutes });
    }

    showToast("Registro removido.");
    setDeleteTarget(null);
    setDeletePassword('');
  };

  // --- UNIT MANAGEMENT ---
  const handleSearchAddress = async () => {
      if (!unitForm.addressSearch) return;
      setIsSearchingAddress(true);
      const result = await findLocationWithAI(unitForm.addressSearch);
      setIsSearchingAddress(false);
      
      if (result.found) {
          setUnitForm(prev => ({ 
              ...prev, 
              location: result.address.split(',')[0], // Simple location name
              foundAddress: result.address,
              lat: result.lat || 0,
              lng: result.lng || 0
          }));
      } else {
          showToast("Endereço não encontrado.", "error");
      }
  };

  const handleAddUnit = () => {
      const newUnit: Unit = {
          id: `u-${Date.now()}`,
          name: unitForm.name,
          location: unitForm.location,
          alarmIntervalMinutes: 60,
          geo: unitForm.foundAddress ? {
              address: unitForm.foundAddress,
              lat: unitForm.lat,
              lng: unitForm.lng
          } : undefined
      };
      updateGlobalState({ ...state, units: [...state.units, newUnit] });
      setUnitForm({ name: '', location: '', addressSearch: '', lat: 0, lng: 0, foundAddress: '' });
      showToast("Unidade cadastrada com sucesso!");
  };

  // --- ROUTE MANAGEMENT ---
  const handleCalculateRoute = async () => {
      if (routeForm.selectedUnits.length < 2) return;
      setRouteForm(prev => ({ ...prev, isCalculating: true }));

      // Simulate segment calculation
      const segments = [];
      let totalTime = 0;
      let totalDist = 0;

      for (let i = 0; i < routeForm.selectedUnits.length - 1; i++) {
          const fromId = routeForm.selectedUnits[i];
          const toId = routeForm.selectedUnits[i+1];
          const fromUnit = state.units.find(u => u.id === fromId);
          const toUnit = state.units.find(u => u.id === toId);

          if (fromUnit && toUnit) {
              const fromName = fromUnit.geo?.address || fromUnit.location + ", Brazil";
              const toName = toUnit.geo?.address || toUnit.location + ", Brazil";
              
              const result = await calculateRouteLogistics(fromName, toName);
              
              segments.push({
                  fromUnitId: fromId,
                  toUnitId: toId,
                  durationMinutes: result.durationMinutes,
                  distanceKm: result.distanceKm
              });
              totalTime += result.durationMinutes;
              totalDist += result.distanceKm;
          }
      }

      setRouteForm(prev => ({ 
          ...prev, 
          isCalculating: false, 
          calculatedSegments: segments,
          totalTime,
          totalDist
      }));
  };

  const handleSaveRoute = () => {
      const newRoute: RouteTemplate = {
          id: `rt-${Date.now()}`,
          name: routeForm.name,
          unitSequence: routeForm.selectedUnits,
          segments: routeForm.calculatedSegments,
          totalDistanceKm: routeForm.totalDist,
          totalDurationMinutes: routeForm.totalTime
      };
      updateGlobalState({ ...state, routes: [...(state.routes || []), newRoute] });
      setRouteForm({ name: '', selectedUnits: [], isCalculating: false, calculatedSegments: [], totalTime: 0, totalDist: 0 });
      showToast("Rota salva com sucesso!");
  };

  // --- TRIP FORM (Modified) ---
  const handleTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let stops: TripStop[] = [];
    let routeName = tripForm.route;

    // AUTOMATED MODE VIA ROUTE TEMPLATE
    if (!tripForm.manualMode && tripForm.routeTemplateId) {
        const template = state.routes?.find(r => r.id === tripForm.routeTemplateId);
        if (template) {
            routeName = template.name;
            let currentEta = new Date(`${tripForm.originDate}T${tripForm.originTime}:00`);
            
            // Build stops
            template.unitSequence.forEach((unitId, index) => {
                const isOrigin = index === 0;
                const isDest = index === template.unitSequence.length - 1;
                
                // Add travel time from previous segment if not origin
                if (!isOrigin) {
                    const segment = template.segments.find(s => s.fromUnitId === template.unitSequence[index-1] && s.toUnitId === unitId);
                    if (segment) {
                        currentEta = new Date(currentEta.getTime() + segment.durationMinutes * 60000);
                        // Add some service buffer (e.g. 30 mins)
                        currentEta = new Date(currentEta.getTime() + 30 * 60000); 
                    }
                }

                stops.push({
                    unitId: unitId,
                    type: isOrigin ? 'ORIGIN' : isDest ? 'DESTINATION' : 'INTERMEDIATE',
                    eta: currentEta.toISOString(),
                    status: VehicleStatus.PENDING
                });
            });
        }
    } 
    // MANUAL MODE
    else {
        // Origin
        stops.push({
            unitId: tripForm.originId,
            type: 'ORIGIN',
            eta: new Date(`${tripForm.originDate}T${tripForm.originTime}:00`).toISOString(),
            status: VehicleStatus.PENDING
        });
        // Intermediate
        if (tripForm.hasIntermediate && tripForm.intId) {
            stops.push({
                unitId: tripForm.intId,
                type: 'INTERMEDIATE',
                eta: new Date(`${tripForm.intDate}T${tripForm.intTime}:00`).toISOString(),
                status: VehicleStatus.PENDING
            });
        }
        // Dest
        if (tripForm.hasDestination && tripForm.destId) {
            stops.push({
                unitId: tripForm.destId,
                type: 'DESTINATION',
                eta: new Date(`${tripForm.destDate}T${tripForm.destTime}:00`).toISOString(),
                status: VehicleStatus.PENDING
            });
        }
    }

    if (editingVehicleId) {
        const original = state.vehicles.find(v => v.id === editingVehicleId);
        if (original) onEditVehicle({ ...original, number: tripForm.number, route: routeName, stops: stops as any });
        setEditingVehicleId(null);
        showToast("Viagem atualizada!");
    } else {
        onAddVehicle({ number: tripForm.number, route: routeName, stops });
        showToast("Nova viagem criada!");
    }
    
    // Reset
    setTripForm({ 
        number: '', 
        routeTemplateId: '', 
        manualMode: false,
        route: '', 
        originId: state.units[0]?.id || '', originDate: '', originTime: '08:00',
        hasIntermediate: false, intId: '', intDate: '', intTime: '',
        hasDestination: true, destId: '', destDate: '', destTime: '' 
    });
  };

  // Standard Handlers
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
                    {id: 'units', icon: MapPin, label: 'Unidades'},
                    {id: 'routes', icon: RouteIcon, label: 'Rotas'},
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
                     <p className="text-sm text-slate-500 mb-4">Digite a senha administrativa para excluir este registro permanentemente.</p>
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
             </div>
         )}

         {/* UNITS TAB (NEW) */}
         {activeTab === 'units' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="md:col-span-1">
                         <Card>
                             <h3 className="font-bold text-lg mb-4 text-sle-navy">Nova Unidade</h3>
                             <div className="space-y-4">
                                 <div>
                                     <label className={labelClassName}>Nome (Identificação)</label>
                                     <input className={inputClassName} value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} placeholder="Ex: Filial Rio Verde" />
                                 </div>
                                 <div>
                                     <label className={labelClassName}>Pesquisa Google Maps (IA)</label>
                                     <div className="flex gap-2">
                                         <input 
                                            className={inputClassName} 
                                            value={unitForm.addressSearch} 
                                            onChange={e => setUnitForm({...unitForm, addressSearch: e.target.value})} 
                                            placeholder="Ex: DEC Anápolis, GO"
                                            onKeyDown={e => e.key === 'Enter' && handleSearchAddress()}
                                         />
                                         <Button onClick={handleSearchAddress} isLoading={isSearchingAddress} className="w-12 px-0 flex items-center justify-center"><Search className="w-4 h-4"/></Button>
                                     </div>
                                 </div>
                                 
                                 {unitForm.foundAddress && (
                                     <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-xs">
                                         <p className="font-bold text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Endereço Validado:</p>
                                         <p className="text-slate-600 mt-1">{unitForm.foundAddress}</p>
                                         <p className="text-slate-400 mt-1 font-mono">Lat: {unitForm.lat.toFixed(4)}, Lng: {unitForm.lng.toFixed(4)}</p>
                                     </div>
                                 )}

                                 <Button onClick={handleAddUnit} disabled={!unitForm.name || !unitForm.foundAddress} className="w-full" icon={<Plus className="w-4 h-4"/>}>Cadastrar Unidade</Button>
                             </div>
                         </Card>
                     </div>
                     <div className="md:col-span-2">
                         <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                     <tr>
                                         <th className="p-4">Nome</th>
                                         <th className="p-4">Localização (Maps)</th>
                                         <th className="p-4 text-right">Ações</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {state.units.map(u => (
                                         <tr key={u.id} className="hover:bg-slate-50">
                                             <td className="p-4 font-bold text-sle-navy">{u.name}</td>
                                             <td className="p-4">
                                                 <div className="flex flex-col">
                                                     <span className="text-slate-700">{u.geo?.address || u.location}</span>
                                                     {u.geo && <span className="text-[10px] text-blue-500 font-mono flex items-center gap-1"><MapPin className="w-3 h-3"/> Validado</span>}
                                                 </div>
                                             </td>
                                             <td className="p-4 text-right">
                                                 <button onClick={() => setDeleteTarget({ type: 'unit', id: u.id })} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>
             </div>
         )}

         {/* ROUTES TAB (NEW) */}
         {activeTab === 'routes' && (
             <div className="space-y-6 animate-in fade-in">
                 <Card>
                     <h3 className="font-bold text-lg mb-4 text-sle-navy flex items-center gap-2"><RouteIcon className="w-5 h-5"/> Criador de Rotas Inteligente</h3>
                     <p className="text-sm text-slate-500 mb-6">Selecione as unidades na ordem de passagem. A Inteligência Artificial calculará tempos e distâncias automaticamente.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                             <div>
                                 <label className={labelClassName}>Nome da Rota</label>
                                 <input className={inputClassName} value={routeForm.name} onChange={e=>setRouteForm({...routeForm, name: e.target.value})} placeholder="Ex: Rota Sul (Goiânia -> Itumbiara)" />
                             </div>
                             
                             <div>
                                 <label className={labelClassName}>Sequência de Paradas</label>
                                 <div className="flex flex-wrap gap-2 mb-2">
                                     {state.units.map(u => (
                                         <button 
                                            key={u.id} 
                                            onClick={() => setRouteForm(prev => ({...prev, selectedUnits: [...prev.selectedUnits, u.id]}))}
                                            className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors border border-slate-200"
                                         >
                                             + {u.name}
                                         </button>
                                     ))}
                                 </div>
                                 
                                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[100px]">
                                     {routeForm.selectedUnits.length === 0 ? (
                                         <p className="text-center text-slate-400 text-xs mt-4">Nenhuma unidade selecionada.</p>
                                     ) : (
                                         <div className="flex flex-col gap-2">
                                             {routeForm.selectedUnits.map((uid, idx) => (
                                                 <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-left-2">
                                                     <div className="bg-sle-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{idx + 1}</div>
                                                     <div className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-sm font-medium flex justify-between">
                                                         {state.units.find(u => u.id === uid)?.name}
                                                         <button onClick={() => setRouteForm(prev => ({...prev, selectedUnits: prev.selectedUnits.filter((_, i) => i !== idx)}))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                                                     </div>
                                                     {idx < routeForm.selectedUnits.length - 1 && <div className="h-4 w-px bg-slate-300 absolute left-3 top-8"></div>}
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             </div>

                             <Button onClick={handleCalculateRoute} isLoading={routeForm.isCalculating} disabled={routeForm.selectedUnits.length < 2} className="w-full" variant="secondary" icon={<Zap className="w-4 h-4 text-yellow-500"/>}>Calcular Tempos e Distâncias (IA)</Button>
                         </div>

                         <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
                             {routeForm.calculatedSegments.length > 0 ? (
                                 <div className="space-y-4">
                                     <h4 className="font-bold text-sle-navy border-b border-slate-200 pb-2">Resumo da Rota</h4>
                                     <div className="flex gap-4">
                                         <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex-1">
                                             <span className="text-xs text-slate-400 uppercase font-bold">Tempo Total</span>
                                             <p className="text-xl font-bold text-sle-blue">{(routeForm.totalTime / 60).toFixed(1)}h <span className="text-sm text-slate-400">({routeForm.totalTime} min)</span></p>
                                         </div>
                                         <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex-1">
                                             <span className="text-xs text-slate-400 uppercase font-bold">Distância</span>
                                             <p className="text-xl font-bold text-sle-blue">{routeForm.totalDist} <span className="text-sm text-slate-400">km</span></p>
                                         </div>
                                     </div>
                                     <div className="space-y-2 mt-4">
                                         <p className="text-xs font-bold uppercase text-slate-400">Segmentos:</p>
                                         {routeForm.calculatedSegments.map((seg, i) => (
                                             <div key={i} className="text-xs flex justify-between items-center bg-white p-2 rounded border border-slate-100">
                                                 <span>{state.units.find(u=>u.id===seg.fromUnitId)?.name} → {state.units.find(u=>u.id===seg.toUnitId)?.name}</span>
                                                 <span className="font-mono font-bold text-slate-600">{seg.durationMinutes} min / {seg.distanceKm} km</span>
                                             </div>
                                         ))}
                                     </div>
                                     <Button onClick={handleSaveRoute} className="w-full mt-4" icon={<Save className="w-4 h-4"/>}>Salvar Rota</Button>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                     <Navigation className="w-12 h-12 mb-2 opacity-20"/>
                                     <p className="text-sm">Configure a sequência e clique em Calcular.</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </Card>

                 {/* List of Routes */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {(state.routes || []).map(route => (
                         <Card key={route.id} className="relative group hover:border-sle-blue transition-colors">
                             <div className="flex justify-between items-start mb-3">
                                 <div>
                                     <h4 className="font-bold text-lg text-sle-navy">{route.name}</h4>
                                     <p className="text-xs text-slate-500 font-mono">{route.unitSequence.length} Paradas • {route.totalDistanceKm} km • {(route.totalDurationMinutes/60).toFixed(1)} horas</p>
                                 </div>
                                 <button onClick={() => setDeleteTarget({ type: 'route', id: route.id })} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                             </div>
                             <div className="flex items-center gap-1 text-xs text-slate-600 flex-wrap">
                                 {route.unitSequence.map((uid, i) => (
                                     <React.Fragment key={i}>
                                         <span className="bg-slate-100 px-2 py-1 rounded">{state.units.find(u => u.id === uid)?.name}</span>
                                         {i < route.unitSequence.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300"/>}
                                     </React.Fragment>
                                 ))}
                             </div>
                         </Card>
                     ))}
                 </div>
             </div>
         )}

         {/* FLEET TAB (Modified for Routes) */}
         {activeTab === 'fleet' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="flex justify-between items-center">
                     <h3 className="font-bold text-xl">Gestão de Viagens</h3>
                     <Button onClick={() => {
                         setTripForm({ number: '', routeTemplateId: '', manualMode: false, route: '', originId: state.units[0].id, originDate: '', originTime: '08:00', hasIntermediate: false, intId: '', intDate: '', intTime: '', hasDestination: true, destId: '', destDate: '', destTime: '' });
                         setEditingVehicleId(null);
                         window.scrollTo({top: 0, behavior: 'smooth'});
                     }} icon={<Plus className="w-4 h-4"/>}>Nova Viagem</Button>
                 </div>

                 <Card className="border-t-4 border-t-sle-blue">
                     <h4 className="font-bold text-sm uppercase text-slate-400 mb-4">{editingVehicleId ? 'Editar Viagem' : 'Cadastrar Nova Viagem'}</h4>
                     <form onSubmit={handleTripSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         
                         {/* BASIC INFO */}
                         <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <div><label className={labelClassName}>Nº Veículo</label><input required value={tripForm.number} onChange={e=>setTripForm({...tripForm, number: e.target.value})} className={inputClassName} placeholder="Ex: V-1020"/></div>
                             
                             {!tripForm.manualMode ? (
                                 <div>
                                     <label className={labelClassName}>Rota Pré-definida</label>
                                     <div className="flex gap-2">
                                         <select 
                                            className={inputClassName} 
                                            value={tripForm.routeTemplateId} 
                                            onChange={e => setTripForm({...tripForm, routeTemplateId: e.target.value})}
                                         >
                                             <option value="">Selecione uma rota...</option>
                                             {(state.routes || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                         </select>
                                         <button type="button" onClick={() => setTripForm({...tripForm, manualMode: true})} className="text-xs text-blue-500 underline whitespace-nowrap">Modo Manual</button>
                                     </div>
                                 </div>
                             ) : (
                                 <div>
                                     <label className={labelClassName}>Nome da Rota (Manual)</label>
                                     <div className="flex gap-2">
                                        <input required value={tripForm.route} onChange={e=>setTripForm({...tripForm, route: e.target.value})} className={inputClassName} placeholder="Ex: Extra"/>
                                        <button type="button" onClick={() => setTripForm({...tripForm, manualMode: false})} className="text-xs text-blue-500 underline whitespace-nowrap">Usar Rota</button>
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* AUTO MODE SETTINGS */}
                         {!tripForm.manualMode && tripForm.routeTemplateId && (
                             <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                 <div className="flex items-center gap-2 mb-3 text-blue-800 font-bold">
                                     <Sparkles className="w-4 h-4" /> Configuração Automática
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <label className={labelClassName}>Data de Início</label>
                                         <input type="date" required className={inputClassName} value={tripForm.originDate} onChange={e=>setTripForm({...tripForm, originDate: e.target.value})} />
                                     </div>
                                     <div>
                                         <label className={labelClassName}>Hora de Saída</label>
                                         <input type="time" required className={inputClassName} value={tripForm.originTime} onChange={e=>setTripForm({...tripForm, originTime: e.target.value})} />
                                     </div>
                                 </div>
                                 <p className="text-xs text-blue-600/70 mt-3">
                                     O sistema calculará automaticamente os horários de chegada em todas as unidades com base na inteligência artificial.
                                 </p>
                             </div>
                         )}

                         {/* MANUAL MODE SETTINGS (Legacy) */}
                         {tripForm.manualMode && (
                             <>
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

                                 <div className="md:col-span-2">
                                     <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                                         <input type="checkbox" checked={tripForm.hasIntermediate} onChange={e=>setTripForm({...tripForm, hasIntermediate: e.target.checked})} className="w-4 h-4 text-sle-blue rounded focus:ring-sle-blue"/>
                                         Adicionar Parada Intermediária
                                     </label>
                                 </div>
                                 {tripForm.hasIntermediate && (
                                     <div className="md:col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
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

                                 <div className="md:col-span-2 mt-2">
                                     <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                                         <input type="checkbox" checked={tripForm.hasDestination} onChange={e=>setTripForm({...tripForm, hasDestination: e.target.checked})} className="w-4 h-4 text-sle-blue rounded focus:ring-sle-blue"/>
                                         Definir Destino Final
                                     </label>
                                 </div>
                                 {tripForm.hasDestination && (
                                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                             </>
                         )}

                         <div className="md:col-span-2 flex gap-2 mt-2">
                             {editingVehicleId && <Button type="button" variant="secondary" onClick={() => { setEditingVehicleId(null); setTripForm({...tripForm, number: '', route: ''}); }}>Cancelar Edição</Button>}
                             <Button type="submit" className="flex-1">{editingVehicleId ? 'Salvar Alterações' : 'Cadastrar Viagem'}</Button>
                         </div>
                     </form>
                 </Card>

                 {/* Vehicle List */}
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
                                         <button onClick={() => onCancelVehicle(v.id)} className="text-orange-500 hover:bg-orange-50 p-1 rounded" title="Arquivar"><X className="w-4 h-4"/></button>
                                         <button onClick={() => setDeleteTarget({ type: 'vehicle', id: v.id })} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Excluir Permanentemente"><Trash2 className="w-4 h-4"/></button>
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
                                     <button onClick={() => setDeleteTarget({ type: 'employee', id: emp.id })} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3"/></button>
                                 </div>
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
                                             <button onClick={() => setDeleteTarget({ type: 'user', id: u.id })} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4"/></button>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
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
                             <h3 className="text-lg font-bold text-sle-navy">Conexão Google Apps Script (Banco de Dados)</h3>
                             <p className="text-xs text-slate-500">Seus dados são salvos na planilha abaixo.</p>
                         </div>
                     </div>

                     <form onSubmit={(e) => { e.preventDefault(); onUpdateSettings({ googleSheetsUrl: settingsForm.googleSheetsUrl.trim() }); showToast("Configurações salvas!"); }} className="space-y-4">
                         <div>
                             <label className={labelClassName}>URL do Web App (Exec)</label>
                             <input 
                                 type="text" 
                                 className={inputClassName}
                                 value={settingsForm.googleSheetsUrl}
                                 onChange={(e) => setSettingsForm({...settingsForm, googleSheetsUrl: e.target.value})}
                                 placeholder="https://script.google.com/macros/s/.../exec"
                             />
                         </div>
                         <div className="flex gap-3 pt-2">
                             <Button type="submit" icon={<Save className="w-4 h-4" />}>Salvar URL</Button>
                             <Button type="button" variant="secondary" icon={<Zap className="w-4 h-4 text-yellow-500"/>} onClick={() => onTestSettings(settingsForm.googleSheetsUrl)}>Testar Conexão</Button>
                         </div>
                     </form>
                 </Card>

                 <Card>
                     <h3 className="font-bold text-lg mb-4">Backup e Restauração</h3>
                     <p className="text-xs text-slate-500 mb-4">Utilize esta função antes de atualizações do sistema para garantir que seus cadastros não sejam perdidos.</p>
                     <div className="flex gap-4">
                         <Button variant="secondary" icon={<Download className="w-4 h-4"/>} onClick={() => {
                             const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
                             const downloadAnchorNode = document.createElement('a');
                             downloadAnchorNode.setAttribute("href", dataStr);
                             downloadAnchorNode.setAttribute("download", "backup_sao_luiz.json");
                             document.body.appendChild(downloadAnchorNode);
                             downloadAnchorNode.click();
                             downloadAnchorNode.remove();
                         }}>Baixar Backup (JSON)</Button>
                         
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
      </div>
    </div>
  );
};

// Also import Sparkles for the AI flair in routes
import { Sparkles } from 'lucide-react';

export const AdminPanel = AdminPanelWithLogic;
