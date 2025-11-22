import React, { useState, useEffect, useRef } from 'react';
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

// Helper to compress images for smoother upload
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleSize = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
       resolve(base64Str); // Fallback if fails
    }
  });
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  
  // Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const isRemoteUpdate = useRef(false); // Prevents echo-loop (save -> load -> save)

  // Load State on Mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setIsLoading(false);
    document.documentElement.classList.remove('dark');
  }, []);

  // Cloud Sync: Load from Google Sheets on Startup
  useEffect(() => {
    const fetchCloudState = async () => {
      if (!state.googleSheetsUrl || isLoading) return;
      
      setSyncStatus('syncing');
      try {
        // Append timestamp to avoid caching
        const response = await fetch(`${state.googleSheetsUrl}?t=${Date.now()}`);
        if (!response.ok) throw new Error('Network error');
        
        const cloudData = await response.json();
        
        // Validate if it's a valid state object
        if (cloudData && cloudData.vehicles && Array.isArray(cloudData.vehicles)) {
           console.log("Cloud state loaded successfully");
           isRemoteUpdate.current = true;
           
           setState(prev => ({
             ...prev,
             ...cloudData, // Overwrite with cloud data
             currentUser: prev.currentUser, // Preserve local session
             googleSheetsUrl: prev.googleSheetsUrl // Preserve URL
           }));
           
           setSyncStatus('idle');
        } else {
           // If cloud is empty, it might be the first sync
           setSyncStatus('idle');
        }
      } catch (e) {
        console.error("Failed to load cloud state:", e);
        // Silent fail on load is ok, user will work locally
        setSyncStatus('error');
      }
    };

    fetchCloudState();
    
    // Optional: Polling every 60 seconds to keep devices in sync
    const pollInterval = setInterval(fetchCloudState, 60000);
    return () => clearInterval(pollInterval);

  }, [state.googleSheetsUrl, isLoading]);

  // Cloud Sync: Auto-Save to Google Sheets on Change
  useEffect(() => {
    if (isLoading || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    
    // Save to LocalStorage always
    saveState(state);

    // Save to Cloud if configured
    if (state.googleSheetsUrl) {
      const debouncedSave = setTimeout(async () => {
        setSyncStatus('syncing');
        try {
          // Prepare state for sync
          const stateToSave = JSON.parse(JSON.stringify(state));
          delete stateToSave.currentUser; // Don't sync session
          
          // IMPORTANT: Strip base64 photos from the state to avoid hitting Google Sheets cell limit (50k chars)
          // The photos are logged separately via the 'log' action to Drive.
          if (stateToSave.vehicles) {
            stateToSave.vehicles.forEach((v: any) => {
              if (v.stops) {
                v.stops.forEach((s: any) => {
                   if (s.servicePhotos) s.servicePhotos = []; // Remove photo content from state sync
                });
              }
            });
          }

          await fetch(state.googleSheetsUrl!, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveState', state: stateToSave })
          });
          
          setSyncStatus('saved');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (e) {
          console.error("Cloud save failed", e);
          setSyncStatus('error');
        }
      }, 2000); // 2 seconds debounce

      return () => clearTimeout(debouncedSave);
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
           // Process Photos Compression if needed
           if (payload.photos && payload.photos.length > 0) {
               const compressedPhotos = await Promise.all(
                   payload.photos.map((p: string) => compressImage(p))
               );
               payload.photos = compressedPhotos;
           }

           // Ensure action is 'log' for this payload
           const finalPayload = { ...payload, action: 'log' };

           await fetch(state.googleSheetsUrl, {
             method: 'POST',
             mode: 'no-cors', 
             redirect: 'follow',
             headers: {
               'Content-Type': 'text/plain;charset=utf-8', 
             },
             body: JSON.stringify(finalPayload)
           });
           console.log("Enviado para Sheets (Log):", payload.vehicle);
      } catch (err) {
          console.error("Falha no envio para Sheets", err);
      }
  };

  const handleTestSettings = async (url: string) => {
      if (!url) return;
      try {
           const payload = { 
               action: 'log',
               timestamp: new Date().toLocaleString('pt-BR'),
               vehicle: 'TESTE-CONEXAO',
               route: 'SISTEMA',
               unit: 'ADMIN',
               stopType: 'TESTE',
               employee: 'SÃO LUIZ ADMIN',
               status: 'OK',
               photos: []
           };

           await fetch(url, {
             method: 'POST',
             mode: 'no-cors', 
             redirect: 'follow',
             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
             body: JSON.stringify(payload)
           });
           
           alert("Solicitação enviada! Verifique se uma nova linha apareceu na sua planilha.\n\nIMPORTANTE: Para que a sincronização funcione, você DEVE atualizar o Script no Apps Script com a nova versão fornecida no painel.");
      } catch (e) {
           alert("Erro de rede ao tentar enviar: " + e);
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

    // 2. Send to Google Sheets (Log)
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
            stopType: stop.type,
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
    setState(prev => ({ 
        ...prev, 
        vehicles: prev.vehicles.map(v => v.id === id ? { ...v, status: VehicleStatus.CANCELLED } : v)
    }));
  };

  const handleDeleteVehicle = (id: string) => {
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
            syncStatus={state.googleSheetsUrl ? syncStatus : undefined}
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