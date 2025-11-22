
import { AppState, VehicleStatus } from '../types';
import { INITIAL_STATE } from '../constants';

const DATA_KEY = 'sle_app_data_v2';
const SESSION_KEY = 'sle_user_session_v1';
const PREFS_KEY = 'sle_user_prefs_v1';

export const loadState = (): AppState => {
  let state = { ...INITIAL_STATE };

  try {
    // 1. Load Main Data
    const serializedData = localStorage.getItem(DATA_KEY);
    if (serializedData) {
      const data = JSON.parse(serializedData);
      // Merge ensuring we don't break structure
      state = { ...state, ...data };
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
  // Finds COMPLETED stops with photos and removes them
  // We need to deep clone to avoid mutation during search
  const vehicles = JSON.parse(JSON.stringify(state.vehicles));
  let photoFoundAndRemoved = false;

  for (const v of vehicles) {
      if (photoFoundAndRemoved) break;
      if (!v.stops) continue;
      
      for (const stop of v.stops) {
          if (stop.status === VehicleStatus.COMPLETED && stop.servicePhotos && stop.servicePhotos.length > 0) {
              // Check age? For now, just clean the first one found if quota is full
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
  const trySave = (dataToSave: AppState, attempt = 1): void => {
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify(dataToSave));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
           console.warn(`Storage Quota Exceeded (Attempt ${attempt}). Cleaning old data...`);
           if (attempt > 20) {
               alert("CRÍTICO: Armazenamento cheio. Não é possível salvar mais dados. Contate o suporte.");
               return;
           }
           // Recursive cleanup
           const cleanedState = cleanOldPhotos(dataToSave);
           // If cleaning didn't change anything, we can't save. Stop to avoid infinite loop.
           if (JSON.stringify(cleanedState) === JSON.stringify(dataToSave)) {
               console.error("Storage full and no photos left to clean.");
               return;
           }
           trySave(cleanedState, attempt + 1);
        } else {
            console.error("Failed to save app data", e);
        }
      }
  };

  trySave(state);
};

// Helpers for User Preferences (e.g. Camera Mode)
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

// Helper to simulate delay
export const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
