import { create } from 'zustand';
import type { ActiveTab, Customer, InventoryItem, Language, ShopSettings } from '../types';
import { db, DEFAULT_SETTINGS } from '../db/db';

interface CartItem {
  item: InventoryItem;
  quantity: number;
  unitType: 'loose' | 'sub' | 'parent';
}

interface AppState {
  // Localization & Theme
  language: Language;
  sunlightMode: boolean;
  soundEnabled: boolean;
  settings: ShopSettings;

  // Navigation
  activeTab: ActiveTab;

  // Network & Sync
  isOnline: boolean;
  pendingSyncCount: number;

  // Voice Modal
  isVoiceModalOpen: boolean;

  // Quick Customer Tx Modal
  selectedCustomer: Customer | null;
  isTxModalOpen: boolean;
  txModalType: 'UDHAR_GIVEN' | 'JAMA_RECEIVED';

  // Quick Counter Cart
  cart: CartItem[];

  // Actions
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  toggleSunlightMode: () => void;
  toggleSound: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setIsOnline: (online: boolean) => void;
  setPendingSyncCount: (count: number) => void;

  openVoiceModal: () => void;
  closeVoiceModal: () => void;

  openTxModal: (customer: Customer, type?: 'UDHAR_GIVEN' | 'JAMA_RECEIVED') => void;
  closeTxModal: () => void;

  // Cart actions
  addToCart: (item: InventoryItem, unitType?: 'loose' | 'sub' | 'parent') => void;
  decrementCartItem: (itemId: string, unitType?: 'loose' | 'sub' | 'parent') => void;
  clearCart: () => void;

  // App init
  loadInitialSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'hi',
  sunlightMode: false,
  soundEnabled: true,
  settings: DEFAULT_SETTINGS,

  activeTab: 'ledger',

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSyncCount: 0,

  isVoiceModalOpen: false,

  selectedCustomer: null,
  isTxModalOpen: false,
  txModalType: 'UDHAR_GIVEN',

  cart: [],

  toggleLanguage: () => {
    const nextLang: Language = get().language === 'hi' ? 'en' : 'hi';
    set({ language: nextLang });
    get().updateSettings({ language: nextLang });
  },

  setLanguage: (lang: Language) => {
    set({ language: lang });
    get().updateSettings({ language: lang });
  },

  toggleSunlightMode: () => {
    const next = !get().sunlightMode;
    set({ sunlightMode: next });
    get().updateSettings({ sunlightMode: next });
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    set({ soundEnabled: next });
    get().updateSettings({ soundEnabled: next });
  },

  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),

  setIsOnline: (online: boolean) => set({ isOnline: online }),

  setPendingSyncCount: (count: number) => set({ pendingSyncCount: count }),

  openVoiceModal: () => set({ isVoiceModalOpen: true }),
  closeVoiceModal: () => set({ isVoiceModalOpen: false }),

  openTxModal: (customer: Customer, type = 'UDHAR_GIVEN') =>
    set({
      selectedCustomer: customer,
      txModalType: type,
      isTxModalOpen: true,
    }),

  closeTxModal: () =>
    set({
      selectedCustomer: null,
      isTxModalOpen: false,
    }),

  addToCart: (item: InventoryItem, unitType = 'loose') => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (c) => c.item.id === item.id && c.unitType === unitType
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      set({ cart: updated });
    } else {
      set({ cart: [...cart, { item, quantity: 1, unitType }] });
    }
  },

  decrementCartItem: (itemId: string, unitType = 'loose') => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (c) => c.item.id === itemId && c.unitType === unitType
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      if (updated[existingIndex].quantity > 1) {
        updated[existingIndex].quantity -= 1;
        set({ cart: updated });
      } else {
        set({
          cart: cart.filter(
            (c) => !(c.item.id === itemId && c.unitType === unitType)
          ),
        });
      }
    }
  },

  clearCart: () => set({ cart: [] }),

  loadInitialSettings: async () => {
    try {
      const stored = await db.settings.get('config');
      if (stored?.value) {
        set({
          settings: stored.value,
          language: stored.value.language || 'hi',
          sunlightMode: !!stored.value.sunlightMode,
          soundEnabled: stored.value.soundEnabled ?? true,
        });
      }
      const pendingCount = await db.syncOutbox.where('status').equals('pending').count();
      set({ pendingSyncCount: pendingCount });
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
  },

  updateSettings: async (newSettings: Partial<ShopSettings>) => {
    try {
      const merged = { ...get().settings, ...newSettings };
      set({ settings: merged });
      await db.settings.put({ key: 'config', value: merged });
    } catch (err) {
      console.warn('Failed to persist settings:', err);
    }
  },
}));
