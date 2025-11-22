
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
    setState(loaded);
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

  const handleImportData = (newData: AppState) => {
      setState(prev => ({
          ...newData,
          currentUser: prev.currentUser // Keep current session active
      }));
      saveState(newData);
  };

  const sendToGoogleSheets = async (payload: any) => {
      if (!state.googleSheetsUrl) return;
      
      try {
           // Use 'no-cors' mode which is standard for calling Google Apps Script Web Apps from client-side JS
           // The Payload must be stringified in the body.
           // NOTE: The Apps Script must have doPost(e) { ... JSON.parse(e.postData.contents) ... }
           await fetch(state.googleSheetsUrl, {
             method: 'POST',
             mode: 'no-cors', 
             headers: {
               'Content-Type': 'text/plain;charset=utf-8', // Important for avoiding preflight
             },
             body: JSON.stringify(payload)
           });
           console.log("Sent to Sheets:", payload);
      } catch (err) {
          console.error("Failed to send to sheets", err);
      }
  };

  const handleTestSettings = async (url: string) => {
      if (!url) return;
      try {
           // Send a test ping
           await fetch(url, {
             method: 'POST',
             mode: 'no-cors', 
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify({ 
                 timestamp: new Date().toLocaleString('pt-BR'),
                 vehicle: 'TESTE',
                 route: 'CONEXÃO',
                 unit: 'ADMIN',
                 stopType: '-',
                 employee: 'SISTEMA',
                 status: 'CONEXÃO OK',
                 photos: []
             })
           });
           alert("Dados de teste enviados para a planilha! Verifique se uma nova linha apareceu.");
      } catch (e) {
           alert("Erro ao tentar enviar: " + e);
      }
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
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    const stop = vehicle?.stops.find(s => s.unitId === currentUserUnitId);
    const employee = state.employees.find(e => e.id === employeeId);
    const unit = state.units.find(u => u.id === currentUserUnitId);

    if (vehicle && employee && stop && unit) {
        const payload = {
            timestamp: new Date().toLocaleString('pt-BR'),
            vehicle: vehicle.number,
            route: vehicle.route,
            unit: unit.name,
            stopType: stop.type, // 'ORIGIN', 'INTERMEDIATE', 'DESTINATION'
            employee: employee.name,
            status: 'ATENDIDO',
            photos: photos
        };
        await sendToGoogleSheets(payload);
    }
  };

  const handleJustifyVehicle = async (vehicleId: string, category: string, text: string) => {
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    const currentUserUnitId = state.currentUser?.unitId || '';
    const stop = vehicle?.stops.find(s => s.unitId === currentUserUnitId);
    const unit = state.units.find(u => u.id === currentUserUnitId);
    
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

    if (vehicle && stop && unit) {
       await sendToGoogleSheets({
          timestamp: new Date().toLocaleString('pt-BR'),
          vehicle: vehicle.number,
          route: vehicle.route,
          unit: unit.name,
          stopType: stop.type,
          employee: 'JUSTIFICATIVA',
          status: `ATRASADO: ${category} - ${text}`,
          photos: []
       });
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
    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      number: data.number,
      route: data.route,
      stops: data.stops,
      status: VehicleStatus.PENDING // Default status
    };
    setState(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, vehicles: prev.vehicles.map(v => v.id === vehicle.id ? vehicle : v) }));
  };

  const handleCancelVehicle = (id: string) => {
    // Soft delete logic: Update status to CANCELLED instead of removing from array
    setState(prev => ({ 
        ...prev, 
        vehicles: prev.vehicles.map(v => v.id === id ? { ...v, status: VehicleStatus.CANCELLED } : v)
    }));
  };

  const handleDeleteVehicle = (id: string) => {
    // Hard delete (for administrative cleanup)
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id),
      justifications: prev.justifications.filter(j => j.vehicleId !== id)
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
              onImportData={handleImportData}
              onTestSettings={handleTestSettings}
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
