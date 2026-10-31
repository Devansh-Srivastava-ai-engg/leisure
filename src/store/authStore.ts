import { create } from 'zustand';
import { db, clearLocalDatabase, setupUserDefaults } from '../db/db';
import { pullFromServer } from '../db/operations';
import { useAppStore } from './useAppStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isRestoringSession: boolean;

  // Actions
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'dukaankhata_token';
const BACKEND_URL =
  (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) ||
  (import.meta as any).env?.VITE_BACKEND_URL ||
  ((import.meta as any).env?.DEV ? 'http://localhost:5000' : '');

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isRestoringSession: true,

  login: async (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user, isAuthenticated: true, isRestoringSession: false });

    try {
      // 1. Wipe previous account data from Dexie to ensure complete isolation
      await clearLocalDatabase();

      // 2. Pull this user's records from the cloud
      await pullFromServer();

      // 3. Set baseline defaults (inventory presets, today's register, shop name)
      await setupUserDefaults(user.name);

      // 4. Reload UI settings & counts into the app store
      await useAppStore.getState().loadInitialSettings();
    } catch (err) {
      console.warn('[AuthStore] Error populating user cache on login:', err);
    }
  },

  logout: async () => {
    // 1. Remove auth token from localStorage to prevent token reuse
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');

    try {
      // 2. Clear all local Dexie tables to prevent offline data leaks between accounts on shared devices
      await Promise.all([
        db.customers.clear(),
        db.transactions.clear(),
        db.inventory.clear(),
        db.vendors.clear(),
        db.vendorTransactions.clear(),
        db.dailyRegisters.clear(),
        db.syncOutbox.clear(),
        db.settings.clear(),
      ]);
    } catch (err) {
      console.warn('[AuthStore] Failed to clear local database tables on logout:', err);
      try {
        await clearLocalDatabase();
      } catch {}
    }

    // 3. Reset in-memory app state (cart, active tab, modals)
    useAppStore.getState().resetAppState();

    // 4. Reset auth state
    set({ token: null, user: null, isAuthenticated: false, isRestoringSession: false });
  },

  checkAuth: async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      set({ isRestoringSession: false });
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const { user } = await res.json();
        set({ token: storedToken, user, isAuthenticated: true, isRestoringSession: false });

        // Populate / refresh Dexie with user's cloud data
        try {
          await pullFromServer();
          await setupUserDefaults(user.name);
          await useAppStore.getState().loadInitialSettings();
        } catch (syncErr) {
          console.warn('[AuthStore] Sync on checkAuth notice:', syncErr);
        }
      } else {
        // Token expired or invalid — clear it and wipe local cache
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('token');
        try {
          await Promise.all([
            db.customers.clear(),
            db.transactions.clear(),
            db.inventory.clear(),
            db.vendors.clear(),
            db.vendorTransactions.clear(),
            db.dailyRegisters.clear(),
            db.syncOutbox.clear(),
            db.settings.clear(),
          ]);
        } catch {
          try {
            await clearLocalDatabase();
          } catch {}
        }
        useAppStore.getState().resetAppState();
        set({ token: null, user: null, isAuthenticated: false, isRestoringSession: false });
      }
    } catch {
      // Network unavailable: keep the token for offline access
      set({ token: storedToken, isAuthenticated: true, isRestoringSession: false });
    }
  },
}));

// ---------------------------------------------------------------------------
// Convenience accessor (for use outside React components, e.g. in operations.ts)
// ---------------------------------------------------------------------------
export const getAuthToken = (): string | null =>
  useAuthStore.getState().token ?? localStorage.getItem(TOKEN_KEY);

