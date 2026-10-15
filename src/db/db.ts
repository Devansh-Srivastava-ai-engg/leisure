import Dexie, { type EntityTable } from 'dexie';
import type {
  Customer,
  Transaction,
  InventoryItem,
  Vendor,
  VendorTransaction,
  DailyRegister,
  SyncOutboxItem,
  ShopSettings,
} from '../types';

export class DukaanDatabase extends Dexie {
  customers!: EntityTable<Customer, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  inventory!: EntityTable<InventoryItem, 'id'>;
  vendors!: EntityTable<Vendor, 'id'>;
  vendorTransactions!: EntityTable<VendorTransaction, 'id'>;
  dailyRegisters!: EntityTable<DailyRegister, 'id'>;
  syncOutbox!: EntityTable<SyncOutboxItem, 'id'>;
  settings!: EntityTable<{ key: string; value: any }, 'key'>;

  constructor() {
    super('DukaanKhataDB');
    this.version(1).stores({
      customers: 'id, name, phone, balance, isPinned, lastTransactionAt, createdAt',
      transactions: 'id, customerId, type, timestamp, synced',
      inventory: 'id, name, category, quickPreset',
      vendors: 'id, name, balanceOwed',
      vendorTransactions: 'id, vendorId, type, timestamp',
      dailyRegisters: 'id, date, isClosed',
      syncOutbox: 'id, action, entity, createdAt, status',
      settings: 'key',
    });
  }
}

export const db = new DukaanDatabase();

// Default seed data
export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'ओम साईं चाय & पान कार्नर',
  ownerName: 'राकेश भैया',
  merchantUpi: '9876543210@paytm',
  phone: '9876543210',
  language: 'hi',
  defaultCreditLimit: 500,
  soundEnabled: true,
  voiceEnabled: true,
  sunlightMode: false,
};

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'शर्मा जी (मास्टर साहब)',
    phone: '9812345671',
    balance: 320,
    creditLimit: 500,
    isPinned: true,
    avatarColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    notes: 'शाम को 5 बजे चाय व बिस्कुट',
    lastTransactionAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'cust-2',
    name: 'रमेश (ऑटो वाले)',
    phone: '9876543211',
    balance: 140,
    creditLimit: 500,
    isPinned: true,
    avatarColor: 'bg-blue-100 text-blue-800 border border-blue-200',
    notes: 'रोज सुबह 2 कटिंग चाय',
    lastTransactionAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: 'cust-3',
    name: 'गुप्ता जी (ठेकेदार)',
    phone: '9823456789',
    balance: 750, // Exceeds limit
    creditLimit: 500,
    isPinned: true,
    avatarColor: 'bg-rose-100 text-rose-800 border border-rose-200',
    notes: 'लेबर के लिए गुटखा व सिगरेट लेते हैं',
    lastTransactionAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'cust-4',
    name: 'बंटी (हेयर ड्रेसर)',
    phone: '9898989891',
    balance: 0,
    creditLimit: 500,
    isPinned: true,
    avatarColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    notes: 'हिसाब तुरंत चुकता करते हैं',
    lastTransactionAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'cust-5',
    name: 'विक्रम (कॉलेज)',
    phone: '9834567890',
    balance: 60,
    creditLimit: 300,
    isPinned: true,
    avatarColor: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    notes: 'कोल्ड ड्रिंक व चिप्स',
    lastTransactionAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'cust-6',
    name: 'मुन्ना इलेक्ट्रीशियन',
    phone: '9845678901',
    balance: 240,
    creditLimit: 500,
    isPinned: false,
    avatarColor: 'bg-teal-100 text-teal-800 border border-teal-200',
    notes: 'दुकान की वायरिंग भी की है',
    lastTransactionAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: 'cust-7',
    name: 'सुरेश पेंटर',
    phone: '9856789012',
    balance: 0,
    creditLimit: 400,
    isPinned: false,
    avatarColor: 'bg-purple-100 text-purple-800 border border-purple-200',
    notes: '',
    lastTransactionAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

export const SEED_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Classic Regular Cigarette',
    nameHi: 'क्लासिक सिगरेट',
    category: 'cigarette',
    parentUnitName: 'डिब्बा (Box)',
    subUnitName: 'पैकेट (Pack)',
    looseUnitName: 'पीस (Stick)',
    unitsPerParent: 10, // 10 packs per box
    unitsPerSub: 10,    // 10 sticks per pack => 100 sticks per box
    stockInLooseUnits: 280, // 2.8 boxes
    looseSellingPrice: 18,
    subSellingPrice: 175,
    parentCostPrice: 1450, // ₹14.50 per stick cost -> ₹18 sell => 24.1% margin
    lowStockThresholdLoose: 50,
    quickPreset: true,
    color: 'bg-red-500/20 text-red-300 border-red-500/50',
    icon: 'Cigarette',
  },
  {
    id: 'inv-2',
    name: 'Gold Flake Kings',
    nameHi: 'गोल्ड फ्लेक किंग्स',
    category: 'cigarette',
    parentUnitName: 'डिब्बा (Box)',
    subUnitName: 'पैकेट (Pack)',
    looseUnitName: 'पीस (Stick)',
    unitsPerParent: 10,
    unitsPerSub: 10,
    stockInLooseUnits: 140,
    looseSellingPrice: 19,
    subSellingPrice: 185,
    parentCostPrice: 1550,
    lowStockThresholdLoose: 40,
    quickPreset: true,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    icon: 'Flame',
  },
  {
    id: 'inv-3',
    name: 'Special Masala Cutting Chai',
    nameHi: 'स्पेशल कटिंग चाय',
    category: 'chai',
    parentUnitName: 'केतली (Kettle)',
    subUnitName: 'मग (Mug)',
    looseUnitName: 'कटिंग (Cup)',
    unitsPerParent: 5,  // 5 mugs
    unitsPerSub: 5,     // 5 cups per mug => 25 cutting cups per kettle
    stockInLooseUnits: 180,
    looseSellingPrice: 10,
    subSellingPrice: 50,
    parentCostPrice: 110, // ₹4.40 cost per cup -> ₹10 sell => 56% margin
    lowStockThresholdLoose: 30,
    quickPreset: true,
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    icon: 'Coffee',
  },
  {
    id: 'inv-4',
    name: 'Kulhad Ginger Tea',
    nameHi: 'कुल्हड़ अदरक चाय',
    category: 'chai',
    parentUnitName: 'केतली (Kettle)',
    subUnitName: 'मग (Mug)',
    looseUnitName: 'कुल्हड़ (Kulhad)',
    unitsPerParent: 4,
    unitsPerSub: 5,
    stockInLooseUnits: 90,
    looseSellingPrice: 15,
    parentCostPrice: 130, // ₹6.50 cost per cup -> ₹15 sell => 56.6% margin
    lowStockThresholdLoose: 20,
    quickPreset: true,
    color: 'bg-amber-600/20 text-amber-200 border-amber-600/50',
    icon: 'CupSoda',
  },
  {
    id: 'inv-5',
    name: 'Vimal Pan Masala',
    nameHi: 'विमल पान मसाला',
    category: 'pan_masala',
    parentUnitName: 'बड़ा पैकेट (Pkt)',
    subUnitName: 'लड़ी (Strip)',
    looseUnitName: 'पाउच (Pouch)',
    unitsPerParent: 3,  // 3 strips
    unitsPerSub: 10,    // 10 pouches per strip => 30 pouches per pkt
    stockInLooseUnits: 210,
    looseSellingPrice: 5,
    subSellingPrice: 48,
    parentCostPrice: 115, // ₹3.83 cost -> ₹5 sell => 30.5% margin
    lowStockThresholdLoose: 30,
    quickPreset: true,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    icon: 'Package',
  },
  {
    id: 'inv-6',
    name: 'Rajnigandha Silver Pearls & Masala',
    nameHi: 'रजनीगंधा',
    category: 'pan_masala',
    parentUnitName: 'डिब्बा (Box)',
    subUnitName: 'लड़ी (Strip)',
    looseUnitName: 'पाउच (Pouch)',
    unitsPerParent: 2,
    unitsPerSub: 10,
    stockInLooseUnits: 18, // LOW STOCK ALERT demo
    looseSellingPrice: 20,
    parentCostPrice: 330,
    lowStockThresholdLoose: 25,
    quickPreset: true,
    color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
    icon: 'Sparkles',
  },
  {
    id: 'inv-7',
    name: 'Thums Up Cold Drink 250ml',
    nameHi: 'थम्स अप 250ml',
    category: 'beverage',
    parentUnitName: 'क्रेट (Crate)',
    subUnitName: 'पैक (Pack of 6)',
    looseUnitName: 'बोतल (Bottle)',
    unitsPerParent: 4,
    unitsPerSub: 6, // 24 bottles per crate
    stockInLooseUnits: 42,
    looseSellingPrice: 20,
    parentCostPrice: 380, // ₹15.83 cost -> ₹20 sell => 26.3% margin
    lowStockThresholdLoose: 12,
    quickPreset: true,
    color: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
    icon: 'GlassWater',
  },
  {
    id: 'inv-8',
    name: 'Haldiram Aloo Bhujia 40g',
    nameHi: 'हल्दीराम आलू भुजिया',
    category: 'snacks',
    parentUnitName: 'कार्टन (Carton)',
    subUnitName: 'लड़ी (Strip)',
    looseUnitName: 'पैकेट (Pkt)',
    unitsPerParent: 4,
    unitsPerSub: 5, // 20 packets per carton
    stockInLooseUnits: 34,
    looseSellingPrice: 10,
    parentCostPrice: 160,
    lowStockThresholdLoose: 10,
    quickPreset: true,
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    icon: 'Utensils',
  },
  {
    id: 'inv-9',
    name: 'Matchbox / Lighter Fire',
    nameHi: 'माचिस / गैस लाइटर',
    category: 'other',
    parentUnitName: 'बंडल (Bundle)',
    subUnitName: 'पैक (Pack)',
    looseUnitName: 'पीस (Pcs)',
    unitsPerParent: 5,
    unitsPerSub: 10, // 50 matchboxes per bundle
    stockInLooseUnits: 85,
    looseSellingPrice: 2,
    parentCostPrice: 70,
    lowStockThresholdLoose: 20,
    quickPreset: true,
    color: 'bg-pink-500/20 text-pink-300 border-pink-500/50',
    icon: 'Zap',
  },
  {
    id: 'inv-10',
    name: 'Parle-G Biscuit',
    nameHi: 'पारले-जी बिस्कुट',
    category: 'snacks',
    parentUnitName: 'कार्टन (Carton)',
    subUnitName: 'पैकेट (Pack)',
    looseUnitName: 'पीस (Pkt)',
    unitsPerParent: 1,
    unitsPerSub: 24,
    stockInLooseUnits: 55,
    looseSellingPrice: 5,
    parentCostPrice: 98,
    lowStockThresholdLoose: 15,
    quickPreset: true,
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    icon: 'Cookie',
  },
];

export const SEED_VENDORS: Vendor[] = [
  {
    id: 'vend-1',
    name: 'आईटीसी थोक एजेंसी (ITC Wholesale)',
    company: 'ITC Distributors Ltd',
    phone: '9811122233',
    balanceOwed: 4200,
    lastPaymentAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 'vend-2',
    name: 'श्री गणेश बेवरेजेस (Coca-Cola Agency)',
    company: 'Ganesh Cold Drinks',
    phone: '9822233344',
    balanceOwed: 1650,
    lastPaymentAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: 'vend-3',
    name: 'अमूल डेयरी सप्लायर (ताज़ा दूध)',
    company: 'Amul Dairy Booth 14',
    phone: '9833344455',
    balanceOwed: 840,
    lastPaymentAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    customerId: 'cust-1',
    customerName: 'शर्मा जी (मास्टर साहब)',
    type: 'UDHAR_GIVEN',
    amount: 50,
    note: '2 चाय + 1 बिस्कुट',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    synced: true,
  },
  {
    id: 'tx-2',
    customerId: 'cust-2',
    customerName: 'रमेश (ऑटो वाले)',
    type: 'JAMA_RECEIVED',
    amount: 100,
    note: 'पुराना उधारी नकद जमा',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    synced: true,
  },
  {
    id: 'tx-3',
    type: 'CASH_SALE',
    amount: 40,
    note: '2 कटिंग चाय + 1 विमल (नकद)',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    synced: true,
  },
  {
    id: 'tx-4',
    type: 'UPI_SALE',
    amount: 80,
    note: '2 क्लासिक सिगरेट (क्यूआर स्कैन)',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    synced: true,
  },
  {
    id: 'tx-5',
    type: 'EXPENSE',
    amount: 60,
    note: 'नींबू व बर्फ लिया',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    synced: true,
  },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Database initialization function
export async function initializeDatabase(): Promise<void> {
  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    await db.customers.bulkAdd(SEED_CUSTOMERS);
  }

  const inventoryCount = await db.inventory.count();
  if (inventoryCount === 0) {
    await db.inventory.bulkAdd(SEED_INVENTORY);
  }

  const vendorCount = await db.vendors.count();
  if (vendorCount === 0) {
    await db.vendors.bulkAdd(SEED_VENDORS);
  }

  const txCount = await db.transactions.count();
  if (txCount === 0) {
    await db.transactions.bulkAdd(SEED_TRANSACTIONS);
  }

  // Check today's register
  const today = getTodayDateString();
  const existingRegister = await db.dailyRegisters.get(today);
  if (!existingRegister) {
    const newRegister: DailyRegister = {
      id: today,
      date: today,
      startingCash: 2000,
      denominations: {
        500: 2,
        200: 3,
        100: 4,
        50: 0,
        20: 0,
        10: 0,
        coins: 0,
      },
      countedCash: 2000,
      expectedCash: 2000,
      discrepancy: 0,
      cashSales: 40,
      jamaCash: 100,
      cashExpenses: 60,
      upiSales: 80,
      udharGiven: 50,
      isClosed: false,
    };
    await db.dailyRegisters.put(newRegister);
  }

  // Settings
  const existingSettings = await db.settings.get('config');
  if (!existingSettings) {
    await db.settings.put({ key: 'config', value: DEFAULT_SETTINGS });
  }
}
