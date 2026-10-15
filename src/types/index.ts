export type Language = 'hi' | 'en';

export type TransactionType =
  | 'UDHAR_GIVEN'       // Credit given to customer (Balance increases)
  | 'JAMA_RECEIVED'     // Payment received from customer (Balance decreases)
  | 'CASH_SALE'         // Quick Counter direct cash sale
  | 'UPI_SALE'          // Quick Counter direct UPI sale
  | 'EXPENSE'           // Shop cash expense (milk, lemon, ice, etc.)
  | 'VENDOR_PAYMENT';   // Paid to wholesale vendor

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number; // Positive = Customer owes shop
  creditLimit: number;
  isPinned: boolean;
  avatarColor: string;
  notes?: string;
  lastTransactionAt: string;
  createdAt: string;
}

export interface TransactionItem {
  itemId: string;
  name: string;
  quantity: number; // in unitType
  unitPrice: number;
  total: number;
  unitType: 'loose' | 'sub' | 'parent';
  looseUnitsDeducted: number;
}

export interface Transaction {
  id: string;
  customerId?: string;
  customerName?: string;
  type: TransactionType;
  amount: number;
  note: string;
  items?: TransactionItem[];
  paymentMethod?: 'CASH' | 'UPI' | 'CREDIT';
  timestamp: string;
  synced: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  nameHi: string;
  category: 'chai' | 'cigarette' | 'pan_masala' | 'beverage' | 'snacks' | 'other';
  parentUnitName: string; // e.g., "Box" / "डिब्बा"
  subUnitName: string;    // e.g., "Pack" / "पैकेट"
  looseUnitName: string;  // e.g., "Stick" / "पीस" / "Cup" / "कप"
  unitsPerParent: number; // e.g., 10 packs in 1 box
  unitsPerSub: number;    // e.g., 10 sticks in 1 pack (100 sticks in 1 box)
  stockInLooseUnits: number;
  looseSellingPrice: number;
  subSellingPrice?: number;
  parentCostPrice: number; // Cost to buy 1 parent unit
  lowStockThresholdLoose: number;
  quickPreset: boolean;
  color: string;
  icon: string;
}

export interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  balanceOwed: number; // What merchant owes supplier
  lastPaymentAt: string;
  createdAt: string;
}

export interface VendorTransaction {
  id: string;
  vendorId: string;
  type: 'BILL_RECEIVED' | 'PAYMENT_MADE';
  amount: number;
  note: string;
  timestamp: string;
}

export interface Denominations {
  500: number;
  200: number;
  100: number;
  50: number;
  20: number;
  10: number;
  coins: number;
}

export interface DailyRegister {
  id: string; // "YYYY-MM-DD"
  date: string;
  startingCash: number;
  denominations: Denominations;
  countedCash: number;
  expectedCash: number;
  discrepancy: number; // countedCash - expectedCash (positive = surplus, negative = deficit)
  cashSales: number;
  jamaCash: number;
  cashExpenses: number;
  upiSales: number;
  udharGiven: number;
  isClosed: boolean;
  closedAt?: string;
  notes?: string;
}

export interface SyncOutboxItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'transaction' | 'customer' | 'inventory' | 'register' | 'vendor' | 'vendor_tx';
  payload: any;
  createdAt: string;
  status: 'pending' | 'synced' | 'failed';
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  merchantUpi: string;
  phone: string;
  language: Language;
  defaultCreditLimit: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  sunlightMode: boolean;
}

export type ActiveTab = 'ledger' | 'counter' | 'drawer' | 'summary' | 'vendors';
