
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppState, VehicleStatus, JustificationStatus, Employee, Vehicle, UserAccount } from './types';
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
       // Merge units if needed, but prioritize saved state if exists
       employees: loaded.employees || INITIAL_STATE.employees
    }));
    setIsLoading(false);

    // Ensure light mode by removing 'dark' class if present
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
    
    // 1. Update Local State
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId 
          ? { 
              ...v, 
              status: VehicleStatus.COMPLETED, 
              serviceTimestamp: timestamp,
              servicedByEmployeeId: employeeId,
              servicePhotos: photos
            } 
          : v
      )
    }));

    // 2. Send to Google Sheets (Fire and Forget)
    if (state.googleSheetsUrl) {
       const vehicle = state.vehicles.find(v => v.id === vehicleId);
       const employee = state.employees.find(e => e.id === employeeId);
       const unit = state.units.find(u => u.id === vehicle?.unitId);

       if (vehicle && employee) {
         try {
           const payload = {
             timestamp: timestamp,
             vehicle: vehicle.number,
             route: vehicle.route,
             unit: unit?.name || 'N/A',
             employee: employee.name,
             status: 'COMPLETED',
             photos: photos
           };
           
           // Use no-cors mode to avoid CORS errors, although we won't get a response content back
           await fetch(state.googleSheetsUrl, {
             method: 'POST',
             mode: 'no-cors', 
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload)
           });
           console.log("Data sent to Google Sheets");
         } catch (err) {
           console.error("Failed to send data to Google Sheets", err);
         }
       }
    }
  };

  const handleJustifyVehicle = async (vehicleId: string, category: string, text: string) => {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    
    // Optimistic Update
    const justificationId = Date.now().toString();
    const timestamp = new Date().toISOString();
    
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => 
        v.id === vehicleId 
          ? { ...v, status: VehicleStatus.LATE_JUSTIFIED } 
          : v
      ),
      justifications: [
        ...prev.justifications,
        {
          id: justificationId,
          vehicleId,
          unitId: prev.currentUser?.unitId || '',
          category,
          text,
          timestamp: timestamp,
          status: JustificationStatus.PENDING,
          aiAnalysis: 'Processando análise forense com Thinking Mode...'
        }
      ]
    }));

    // Send Justification to Google Sheets
    if (state.googleSheetsUrl && vehicle) {
       const unit = state.units.find(u => u.id === vehicle.unitId);
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
              employee: 'JUSTIFICATIVA',
              status: `LATE: ${category} - ${text}`,
              photos: []
            })
         });
       } catch (e) { console.error(e); }
    }

    // Call Gemini API for enhanced thinking analysis
    if (vehicle) {
      const delayMinutes = Math.floor((Date.now() - new Date(vehicle.eta).getTime()) / 60000);
      const analysis = await analyzeJustificationThinking(vehicle.number, vehicle.route, delayMinutes, category, text);
      
      setState(prev => ({
        ...prev,
        justifications: prev.justifications.map(j => 
          j.id === justificationId ? { ...j, aiAnalysis: analysis } : j
        )
      }));
    }
  };

  const handleReviewJustification = (justificationId: string, status: JustificationStatus, comment: string) => {
    setState(prev => {
      return {
        ...prev,
        justifications: prev.justifications.map(j => 
          j.id === justificationId 
            ? { ...j, status, adminComment: comment } 
            : j
        )
      };
    });
  };

  const handleSilenceAlarm = (vehicleId: string) => {
    setState(prev => ({
      ...prev,
      alarms: [
        ...prev.alarms,
        {
          id: Date.now().toString(),
          vehicleId,
          unitId: prev.currentUser?.unitId || '',
          triggeredAt: new Date().toISOString(),
          silencedBy: 'Operador',
          silencedAt: new Date().toISOString()
        }
      ]
    }));
  };

  // --- MANAGEMENT ACTIONS ---
  const handleUpdateSettings = (settings: { googleSheetsUrl: string }) => {
    setState(prev => ({ ...prev, googleSheetsUrl: settings.googleSheetsUrl }));
  };

  const handleAddVehicle = (data: { number: string; route: string; eta: string; unitId: string }) => {
    const newVehicle = {
      id: `v-${Date.now()}`,
      number: data.number,
      route: data.route,
      eta: data.eta,
      unitId: data.unitId,
      status: VehicleStatus.PENDING
    };
    setState(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, vehicles: prev.vehicles.map(v => v.id === vehicle.id ? vehicle : v) }));
  };

  const handleCancelVehicle = (id: string) => {
    setState(prev => ({ ...prev, vehicles: prev.vehicles.map(v => v.id === id ? { ...v, status: VehicleStatus.CANCELLED } : v) }));
  };

  const handleDeleteVehicle = (id: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
      justifications: prev.justifications.filter(j => j.vehicleId !== id),
      alarms: prev.alarms.filter(a => a.vehicleId !== id)
    }));
  };

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
          {/* AI Chat Widget is global for logged in users */}
          <AIChatWidget state={state} />
        </>
      )}
      
      <Routes>
        <Route path="/" element={
          !state.currentUser ? (
            <LoginView 
              users={state.users} 
              onLogin={handleLogin} 
            />
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
