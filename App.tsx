
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppState, VehicleStatus, JustificationStatus, Employee, Vehicle, UserAccount, TripStop } from './types';
import { INITIAL_STATE } from './constants';
import { loadState, saveState } from './services/storage';
import { analyzeJustificationThinking } from './services/geminiService';

import { Header } from './components/Header';
import { AIChatWidget } from './components/AIChatWidget';
import { LoginView } from './views/LoginView';
import { UnitDashboard } from './views/UnitDashboard';
import { AdminPanel } from './views/AdminPanel';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Load State on Mount
  useEffect(() => {
    const loaded = loadState();
    setState(prev => ({
       ...loaded,
       users: loaded.users || INITIAL_STATE.users,
       employees: loaded.employees || INITIAL_STATE.employees
    }));
    setIsLoading(false);
    document.documentElement.classList.remove('dark');
  }, []);

  // Save State on Change
  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  // Actions
  const handleLogin = (role: 'admin' | 'unit', username: string, unitId?: string) => {
    setState(prev => ({ ...prev, currentUser: { role, unitId, username } }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const handleServiceVehicle = async (vehicleId: string, employeeId: string, photos: string[]) => {
    const timestamp = new Date().toISOString();
    const currentUserUnitId = state.currentUser?.unitId;
    
    // 1. Update Local State (Specific Stop)
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId 
          ? { 
              ...v, 
              stops: v.stops.map(s => 
                 s.unitId === currentUserUnitId 
                 ? { 
                     ...s, 
                     status: VehicleStatus.COMPLETED, 
                     serviceTimestamp: timestamp,
                     servicedByEmployeeId: employeeId,
                     servicePhotos: photos
                   } 
                 : s
              )
            } 
          : v
      )
    }));

    // 2. Send to Google Sheets
    if (state.googleSheetsUrl) {
       const vehicle = state.vehicles.find(v => v.id === vehicleId);
       const stop = vehicle?.stops.find(s => s.unitId === currentUserUnitId);
       const employee = state.employees.find(e => e.id === employeeId);
       const unit = state.units.find(u => u.id === currentUserUnitId);

       if (vehicle && employee && stop) {
         try {
           const payload = {
             timestamp: timestamp,
             vehicle: vehicle.number,
             route: vehicle.route,
             unit: unit?.name || 'N/A',
             stopType: stop.type, // Added stop type info
             employee: employee.name,
             status: 'COMPLETED',
             photos: photos
           };
           
           await fetch(state.googleSheetsUrl, {
             method: 'POST',
             mode: 'no-cors', 
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload)
           });
         } catch (err) { console.error(err); }
       }
    }
  };

  const handleJustifyVehicle = async (vehicleId: string, category: string, text: string) => {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    const currentUserUnitId = state.currentUser?.unitId || '';
    const stop = vehicle?.stops.find(s => s.unitId === currentUserUnitId);
    
    const justificationId = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId 
          ? { 
              ...v, 
              stops: v.stops.map(s => s.unitId === currentUserUnitId ? { ...s, status: VehicleStatus.LATE_JUSTIFIED } : s)
            } 
          : v
      ),
      justifications: [
        ...prev.justifications,
        {
          id: justificationId,
          vehicleId,
          unitId: currentUserUnitId,
          category,
          text,
          timestamp: timestamp,
          status: JustificationStatus.PENDING,
          aiAnalysis: 'Processando análise forense com Thinking Mode...'
        }
      ]
    }));

    if (state.googleSheetsUrl && vehicle && stop) {
       const unit = state.units.find(u => u.id === currentUserUnitId);
       try {
         await fetch(state.googleSheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: timestamp,
              vehicle: vehicle.number,
              route: vehicle.route,
              unit: unit?.name || 'N/A',
              stopType: stop.type,
              employee: 'JUSTIFICATIVA',
              status: `LATE: ${category} - ${text}`,
              photos: []
            })
         });
       } catch (e) { console.error(e); }
    }

    if (vehicle && stop) {
      const delayMinutes = Math.floor((Date.now() - new Date(stop.eta).getTime()) / 60000);
      const analysis = await analyzeJustificationThinking(vehicle.number, vehicle.route, delayMinutes, category, text);
      
      setState(prev => ({
        ...prev,
        justifications: prev.justifications.map(j => j.id === justificationId ? { ...j, aiAnalysis: analysis } : j)
      }));
    }
  };

  const handleReviewJustification = (justificationId: string, status: JustificationStatus, comment: string) => {
    setState(prev => ({
      ...prev,
      justifications: prev.justifications.map(j => j.id === justificationId ? { ...j, status, adminComment: comment } : j)
    }));
  };

  const handleSilenceAlarm = (vehicleId: string) => {
     // Not used anymore by UI but kept for API compatibility
  };

  const handleUpdateSettings = (settings: { googleSheetsUrl: string }) => {
    setState(prev => ({ ...prev, googleSheetsUrl: settings.googleSheetsUrl }));
  };

  const handleAddVehicle = (data: { number: string; route: string; stops: TripStop[] }) => {
    const newVehicle = {
      id: `v-${Date.now()}`,
      number: data.number,
      route: data.route,
      stops: data.stops
    };
    setState(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, vehicles: prev.vehicles.map(v => v.id === vehicle.id ? vehicle : v) }));
  };

  const handleCancelVehicle = (id: string) => {
    // Soft delete logic can be complex with stops, for now assume global cancel
    // Or remove vehicle entirely
  };

  const handleDeleteVehicle = (id: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
      justifications: prev.justifications.filter(j => j.vehicleId !== id)
    }));
  };

  // ... (Employee/User handlers unchanged) ...
  const handleAddEmployee = (employee: Employee) => {
    setState(prev => ({ ...prev, employees: [...prev.employees, { ...employee, active: true }] }));
  };
  const handleEditEmployee = (employee: Employee) => {
    setState(prev => ({ ...prev, employees: prev.employees.map(e => e.id === employee.id ? employee : e) }));
  };
  const handleToggleEmployeeStatus = (id: string) => {
    setState(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? { ...e, active: !e.active } : e) }));
  };
  const handleDeleteEmployee = (id: string) => {
    setState(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }));
  };
  const handleAddUser = (user: UserAccount) => {
    setState(prev => ({ ...prev, users: [...prev.users, user] }));
  };
  const handleDeleteUser = (userId: string) => {
     setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sle-blue">Carregando...</div>;

  return (
    <HashRouter>
      {state.currentUser && (
        <>
          <Header 
            unitName={state.units.find(u => u.id === state.currentUser?.unitId)?.name}
            isAdmin={state.currentUser.role === 'admin'}
            onLogout={handleLogout}
          />
          <AIChatWidget state={state} />
        </>
      )}
      
      <Routes>
        <Route path="/" element={
          !state.currentUser ? (
            <LoginView users={state.users} onLogin={handleLogin} />
          ) : state.currentUser.role === 'admin' ? (
            <Navigate to="/admin" />
          ) : (
            <Navigate to="/dashboard" />
          )
        } />

        <Route path="/dashboard" element={
          state.currentUser?.role === 'unit' ? (
            <UnitDashboard 
              state={state} 
              onServiceVehicle={handleServiceVehicle}
              onJustifyVehicle={handleJustifyVehicle}
              onSilenceAlarm={handleSilenceAlarm}
              onAddVehicle={handleAddVehicle}
            />
          ) : (
            <Navigate to="/" />
          )
        } />

        <Route path="/admin" element={
          state.currentUser?.role === 'admin' ? (
            <AdminPanel 
              state={state} 
              onReviewJustification={handleReviewJustification}
              onAddVehicle={handleAddVehicle}
              onEditVehicle={handleEditVehicle}
              onCancelVehicle={handleCancelVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              onAddEmployee={handleAddEmployee}
              onEditEmployee={handleEditEmployee}
              onToggleEmployeeStatus={handleToggleEmployeeStatus}
              onDeleteEmployee={handleDeleteEmployee}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onUpdateSettings={handleUpdateSettings}
            />
          ) : (
            <Navigate to="/" />
          )
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;
