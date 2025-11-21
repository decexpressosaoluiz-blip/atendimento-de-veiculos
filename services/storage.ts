import { AppState } from '../types';
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

export const saveState = (state: AppState) => {
  // 1. Save Session Separately (Small & Critical)
  // This ensures login persists even if the main data storage is full (e.g. too many photos)
  try {
    if (state.currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error("Failed to save session - Login might be lost on refresh", e);
  }

  // 2. Save Main Data (Heavy)
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state));
  } catch (e) {
    // Specific handling for QuotaExceededError would go here
    console.error("Failed to save app data (likely Storage Quota Exceeded)", e);
    console.warn("Data changes might not persist, but session is safe.");
  }
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