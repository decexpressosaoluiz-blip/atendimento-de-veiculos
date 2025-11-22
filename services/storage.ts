
import { AppState, VehicleStatus } from '../types';
import { INITIAL_STATE } from '../constants';

const DATA_KEY = 'sle_app_data_v3'; // Incremented version to reset bad states if needed
const SESSION_KEY = 'sle_user_session_v1';
const PREFS_KEY = 'sle_user_prefs_v1';

export const loadState = (): AppState => {
  let state = { ...INITIAL_STATE };

  try {
    // 1. Load Main Data
    const serializedData = localStorage.getItem(DATA_KEY);
    if (serializedData) {
      const data = JSON.parse(serializedData);
      
      // Critical: If stored data has empty arrays, we assume it's intentional (user deleted them),
      // UNLESS it's a fresh load where we expect at least some structure.
      // However, for "persistence", the loaded data must override INITIAL_STATE completely for data arrays.
      
      if (data.users && data.users.length > 0) state.users = data.users;
      // If users exists in storage but is empty, we might want to keep initial admin? 
      // For now, lets trust storage IF it has the 'admin' user.
      if (data.users && !data.users.find((u: any) => u.username === 'admin')) {
         // Restore default admin if missing
         state.users = [...data.users, ...INITIAL_STATE.users.filter(u => u.username === 'admin')];
      }

      if (data.units) state.units = data.units;
      if (data.employees) state.employees = data.employees;
      
      // Vehicles: trust storage completely
      if (data.vehicles) state.vehicles = data.vehicles;
      
      // Justifications
      if (data.justifications) state.justifications = data.justifications;
      
      // Settings
      if (data.googleSheetsUrl) state.googleSheetsUrl = data.googleSheetsUrl;
    }
  } catch (e) {
    console.error("Failed to load main app data", e);
  }

  try {
    // 2. Load Session (Critical: Overwrites any stale user data from main state)
    const serializedSession = localStorage.getItem(SESSION_KEY);
    if (serializedSession) {
      const currentUser = JSON.parse(serializedSession);
      state.currentUser = currentUser;
    }
  } catch (e) {
    console.error("Failed to load user session", e);
  }

  return state;
};

// --- Storage Cleaning Logic ---
const cleanOldPhotos = (state: AppState): AppState => {
  // Finds COMPLETED stops with photos and removes them to save space
  const vehicles = JSON.parse(JSON.stringify(state.vehicles));
  let photoFoundAndRemoved = false;

  for (const v of vehicles) {
      if (photoFoundAndRemoved) break;
      if (!v.stops) continue;
      
      for (const stop of v.stops) {
          if (stop.status === VehicleStatus.COMPLETED && stop.servicePhotos && stop.servicePhotos.length > 0) {
              stop.servicePhotos = [];
              console.log(`Cleaning storage: Removing photos from vehicle ${v.number} stop ${stop.unitId}`);
              photoFoundAndRemoved = true;
              break;
          }
      }
  }

  if (!photoFoundAndRemoved) return state;

  return {
    ...state,
    vehicles: vehicles
  };
};

export const saveState = (state: AppState) => {
  // 1. Save Session Separately (Small & Critical)
  try {
    if (state.currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error("Failed to save session", e);
  }

  // 2. Save Main Data (Heavy)
  // We save everything EXCEPT currentUser to the main blob
  const dataToSave = { ...state };
  delete (dataToSave as any).currentUser;

  const trySave = (data: AppState, attempt = 1): void => {
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
           console.warn(`Storage Quota Exceeded (Attempt ${attempt}). Cleaning old data...`);
           if (attempt > 10) {
               console.error("CRÍTICO: Armazenamento cheio. Não é possível salvar mais dados.");
               return;
           }
           const cleanedState = cleanOldPhotos(data);
           // If cleaning didn't change anything, stop loop
           if (JSON.stringify(cleanedState) === JSON.stringify(data)) {
               return;
           }
           trySave(cleanedState, attempt + 1);
        } else {
            console.error("Failed to save app data", e);
        }
      }
  };

  trySave(dataToSave);
};

export const savePreference = (key: string, value: any) => {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    prefs[key] = value;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save preference", e);
  }
};

export const getPreference = (key: string, defaultValue: any = null) => {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return prefs[key] !== undefined ? prefs[key] : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
