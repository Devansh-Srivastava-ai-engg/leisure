import { db, getTodayDateString } from './db';
import type {
  Customer,
  Transaction,
  TransactionType,
  InventoryItem,
  VendorTransaction,
  DailyRegister,
  Denominations,
  Language,
} from '../types';
import { announceTransaction, playSound, triggerHaptic } from '../utils/audio';
import { useAppStore } from '../store/useAppStore';

// ---------------------------------------------------------------------------
// Result type — every public operation returns this instead of throwing.
// ---------------------------------------------------------------------------
export interface OpResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// ID generation — collision-safe, backend-compatible UUIDs
// ---------------------------------------------------------------------------
function generateId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${uuid}`;
}

// ---------------------------------------------------------------------------
// Outbox helper — queues a sync mutation safely
// ---------------------------------------------------------------------------
async function queueOutbox(
  entity: 'transaction' | 'customer' | 'inventory' | 'register' | 'vendor' | 'vendor_tx',
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: unknown,
): Promise<void> {
  const item = {
    id: generateId('sync'),
    action,
    entity,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending' as const,
  };
  await db.syncOutbox.put(item);

  // Non-blocking count refresh — never let a count query break the operation
  try {
    const pendingCount = await db.syncOutbox.where('status').equals('pending').count();
    useAppStore.getState().setPendingSyncCount(pendingCount);
  } catch {
    // Swallow — cosmetic badge update, not transactional
  }
}

// ---------------------------------------------------------------------------
// expectedCash helper — single source of truth for the formula
// ---------------------------------------------------------------------------
function computeExpectedCash(reg: DailyRegister): number {
  return reg.startingCash + reg.cashSales + reg.jamaCash - reg.cashExpenses;
}

// ---------------------------------------------------------------------------
// 0. Ensure today's register exists
// ---------------------------------------------------------------------------
export async function getOrCreateTodayRegister(): Promise<DailyRegister> {
  const today = getTodayDateString();
  let register = await db.dailyRegisters.get(today);
  if (!register) {
    register = {
      id: today,
      date: today,
      startingCash: 2000,
      denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, coins: 0 },
      countedCash: 2000,
      expectedCash: 2000,
      discrepancy: 0,
      cashSales: 0,
      jamaCash: 0,
      cashExpenses: 0,
      upiSales: 0,
      udharGiven: 0,
      isClosed: false,
    };
    await db.dailyRegisters.put(register);
  }
  return register;
}

// ---------------------------------------------------------------------------
// 1. Record Customer Credit (Udhar) or Payment (Jama)
//    ★ Wrapped in a single Dexie rw transaction for atomicity.
//    ★ Balance is re-read inside the tx to prevent race drift.
// ---------------------------------------------------------------------------
export async function recordCustomerTransaction({
  customerId,
  type,
  amount,
  note = '',
  lang = 'hi',
  soundEnabled = true,
}: {
  customerId: string;
  type: 'UDHAR_GIVEN' | 'JAMA_RECEIVED';
  amount: number;
  note?: string;
  lang?: Language;
  soundEnabled?: boolean;
}): Promise<OpResult<Transaction>> {
  try {
    const transaction = await db.transaction(
      'rw',
      [db.customers, db.transactions, db.dailyRegisters, db.syncOutbox],
      async () => {
        // Re-read customer inside tx to get the freshest balance
        const customer = await db.customers.get(customerId);
        if (!customer) throw new Error('Customer not found');

        const newBalance =
          type === 'UDHAR_GIVEN'
            ? customer.balance + amount
            : Math.max(0, customer.balance - amount);

        const now = new Date().toISOString();

        // ---- customer balance update ----
        await db.customers.update(customerId, {
          balance: newBalance,
          lastTransactionAt: now,
        });
        await queueOutbox('customer', 'UPDATE', {
          id: customerId,
          balance: newBalance,
          lastTransactionAt: now,
        });

        // ---- transaction record ----
        const tx: Transaction = {
          id: generateId('tx'),
          customerId,
          customerName: customer.name,
          type,
          amount,
          note: note || (type === 'UDHAR_GIVEN' ? 'उधार दिया' : 'जमा मिला'),
          paymentMethod: type === 'JAMA_RECEIVED' ? 'CASH' : 'CREDIT',
          timestamp: now,
          synced: false,
        };
        await db.transactions.add(tx);
        await queueOutbox('transaction', 'CREATE', tx);

        // ---- daily register update ----
        const todayReg = await getOrCreateTodayRegister();
        if (type === 'UDHAR_GIVEN') {
          todayReg.udharGiven = (todayReg.udharGiven || 0) + amount;
        } else {
          todayReg.jamaCash = (todayReg.jamaCash || 0) + amount;
        }
        todayReg.expectedCash = computeExpectedCash(todayReg);
        todayReg.discrepancy = todayReg.countedCash - todayReg.expectedCash;
        await db.dailyRegisters.put(todayReg);

        return tx;
      },
    );

    // Audio / haptic intentionally outside the tx (non-critical side-effects)
    announceTransaction(type, amount, '', lang, soundEnabled);

    return { success: true, data: transaction };
  } catch (err) {
    console.error('[recordCustomerTransaction]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 2. Add or Edit Customer
// ---------------------------------------------------------------------------
export async function saveCustomer(
  customer: Partial<Customer>,
): Promise<OpResult<Customer>> {
  try {
    const isNew = !customer.id;
    const id = customer.id || generateId('cust');
    const fullCustomer: Customer = {
      id,
      name: customer.name || 'ग्राहक',
      phone: customer.phone || '',
      balance: customer.balance ?? 0,
      creditLimit: customer.creditLimit ?? 500,
      isPinned: customer.isPinned ?? false,
      avatarColor:
        customer.avatarColor ||
        ['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600'][
          Math.floor(Math.random() * 5)
        ],
      notes: customer.notes || '',
      lastTransactionAt: customer.lastTransactionAt || new Date().toISOString(),
      createdAt: customer.createdAt || new Date().toISOString(),
    };

    await db.transaction('rw', [db.customers, db.syncOutbox], async () => {
      await db.customers.put(fullCustomer);
      await queueOutbox('customer', isNew ? 'CREATE' : 'UPDATE', fullCustomer);
    });

    playSound('beep');
    return { success: true, data: fullCustomer };
  } catch (err) {
    console.error('[saveCustomer]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 3. Toggle Customer Pinned Status
// ---------------------------------------------------------------------------
export async function togglePinCustomer(
  customerId: string,
): Promise<OpResult<void>> {
  try {
    await db.transaction('rw', [db.customers, db.syncOutbox], async () => {
      const customer = await db.customers.get(customerId);
      if (!customer) throw new Error('Customer not found');
      const nextPinned = !customer.isPinned;
      await db.customers.update(customerId, { isPinned: nextPinned });
      await queueOutbox('customer', 'UPDATE', { id: customerId, isPinned: nextPinned });
    });
    playSound('beep');
    return { success: true };
  } catch (err) {
    console.error('[togglePinCustomer]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 4. Record Counter Sale (Cash, UPI, or Cart-to-Udhar)
//    ★ Full atomic tx: inventory stock + customer balance + transaction + register
// ---------------------------------------------------------------------------
export async function recordCounterSale({
  items,
  paymentMethod,
  customerId,
  lang = 'hi',
  soundEnabled = true,
}: {
  items: Array<{
    item: InventoryItem;
    quantity: number;
    unitType: 'loose' | 'sub' | 'parent';
  }>;
  paymentMethod: 'CASH' | 'UPI' | 'CREDIT';
  customerId?: string;
  lang?: Language;
  soundEnabled?: boolean;
}): Promise<OpResult<Transaction>> {
  try {
    const transaction = await db.transaction(
      'rw',
      [db.inventory, db.customers, db.transactions, db.dailyRegisters, db.syncOutbox],
      async () => {
        const now = new Date().toISOString();
        let totalAmount = 0;
        const txItems: Transaction['items'] = [];

        // ---- Deduct inventory stock at loose-unit level ----
        for (const { item, quantity, unitType } of items) {
          let looseUnitsToDeduct = quantity;
          let unitPrice = item.looseSellingPrice;

          if (unitType === 'sub') {
            looseUnitsToDeduct = quantity * item.unitsPerSub;
            unitPrice = item.subSellingPrice || item.looseSellingPrice * item.unitsPerSub;
          } else if (unitType === 'parent') {
            looseUnitsToDeduct = quantity * (item.unitsPerParent * item.unitsPerSub);
            unitPrice =
              item.subSellingPrice
                ? item.subSellingPrice * item.unitsPerParent
                : item.looseSellingPrice * (item.unitsPerParent * item.unitsPerSub);
          }

          const itemTotal = unitPrice * quantity;
          totalAmount += itemTotal;

          txItems.push({
            itemId: item.id,
            name: item.nameHi || item.name,
            quantity,
            unitPrice,
            total: itemTotal,
            unitType,
            looseUnitsDeducted: looseUnitsToDeduct,
          });

          // Re-read current stock inside tx to prevent stale-read races
          const currentItem = await db.inventory.get(item.id);
          if (currentItem) {
            const nextStock = Math.max(0, currentItem.stockInLooseUnits - looseUnitsToDeduct);
            await db.inventory.update(item.id, { stockInLooseUnits: nextStock });
            await queueOutbox('inventory', 'UPDATE', {
              id: item.id,
              stockInLooseUnits: nextStock,
            });
          }
        }

        // ---- Determine transaction type ----
        let type: TransactionType = 'CASH_SALE';
        let customerName = '';

        if (paymentMethod === 'UPI') {
          type = 'UPI_SALE';
        } else if (paymentMethod === 'CREDIT' && customerId) {
          type = 'UDHAR_GIVEN';
          // Re-read customer balance inside tx
          const customer = await db.customers.get(customerId);
          if (customer) {
            customerName = customer.name;
            const newBal = customer.balance + totalAmount;
            await db.customers.update(customerId, {
              balance: newBal,
              lastTransactionAt: now,
            });
            await queueOutbox('customer', 'UPDATE', {
              id: customerId,
              balance: newBal,
              lastTransactionAt: now,
            });
          }
        }

        // ---- Transaction record ----
        const tx: Transaction = {
          id: generateId('tx'),
          customerId: paymentMethod === 'CREDIT' ? customerId : undefined,
          customerName: customerName || (paymentMethod === 'CREDIT' ? 'ग्राहक' : undefined),
          type,
          amount: totalAmount,
          note: txItems.map((i) => `${i.name} x${i.quantity}`).join(', '),
          items: txItems,
          paymentMethod,
          timestamp: now,
          synced: false,
        };
        await db.transactions.add(tx);
        await queueOutbox('transaction', 'CREATE', tx);

        // ---- Daily register update ----
        const todayReg = await getOrCreateTodayRegister();
        if (paymentMethod === 'CASH') {
          todayReg.cashSales = (todayReg.cashSales || 0) + totalAmount;
        } else if (paymentMethod === 'UPI') {
          todayReg.upiSales = (todayReg.upiSales || 0) + totalAmount;
        } else if (paymentMethod === 'CREDIT') {
          todayReg.udharGiven = (todayReg.udharGiven || 0) + totalAmount;
        }
        todayReg.expectedCash = computeExpectedCash(todayReg);
        todayReg.discrepancy = todayReg.countedCash - todayReg.expectedCash;
        await db.dailyRegisters.put(todayReg);

        return tx;
      },
    );

    announceTransaction(transaction.type, transaction.amount, transaction.customerName, lang, soundEnabled);
    return { success: true, data: transaction };
  } catch (err) {
    console.error('[recordCounterSale]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 5. Record Cash Expense
// ---------------------------------------------------------------------------
export async function recordExpense({
  amount,
  note,
  lang = 'hi',
  soundEnabled = true,
}: {
  amount: number;
  note: string;
  lang?: Language;
  soundEnabled?: boolean;
}): Promise<OpResult<Transaction>> {
  try {
    const transaction = await db.transaction(
      'rw',
      [db.transactions, db.dailyRegisters, db.syncOutbox],
      async () => {
        const now = new Date().toISOString();
        const tx: Transaction = {
          id: generateId('tx'),
          type: 'EXPENSE',
          amount,
          note: note || 'दुकान खर्चा',
          paymentMethod: 'CASH',
          timestamp: now,
          synced: false,
        };
        await db.transactions.add(tx);
        await queueOutbox('transaction', 'CREATE', tx);

        const todayReg = await getOrCreateTodayRegister();
        todayReg.cashExpenses = (todayReg.cashExpenses || 0) + amount;
        todayReg.expectedCash = computeExpectedCash(todayReg);
        todayReg.discrepancy = todayReg.countedCash - todayReg.expectedCash;
        await db.dailyRegisters.put(todayReg);

        return tx;
      },
    );

    announceTransaction('EXPENSE', amount, undefined, lang, soundEnabled);
    return { success: true, data: transaction };
  } catch (err) {
    console.error('[recordExpense]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 6. Update Cash Drawer Denominations & Count
// ---------------------------------------------------------------------------
export async function updateDailyRegisterCash({
  startingCash,
  denominations,
}: {
  startingCash?: number;
  denominations: Denominations;
}): Promise<OpResult<DailyRegister>> {
  try {
    const reg = await db.transaction(
      'rw',
      [db.dailyRegisters, db.syncOutbox],
      async () => {
        const todayReg = await getOrCreateTodayRegister();

        const countedCash =
          denominations[500] * 500 +
          denominations[200] * 200 +
          denominations[100] * 100 +
          denominations[50] * 50 +
          denominations[20] * 20 +
          denominations[10] * 10 +
          denominations.coins;

        if (startingCash !== undefined) {
          todayReg.startingCash = startingCash;
        }
        todayReg.denominations = denominations;
        todayReg.countedCash = countedCash;
        todayReg.expectedCash = computeExpectedCash(todayReg);
        todayReg.discrepancy = todayReg.countedCash - todayReg.expectedCash;

        await db.dailyRegisters.put(todayReg);
        await queueOutbox('register', 'UPDATE', todayReg);

        return todayReg;
      },
    );

    return { success: true, data: reg };
  } catch (err) {
    console.error('[updateDailyRegisterCash]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 7. Close Day Register
// ---------------------------------------------------------------------------
export async function closeDayRegister(): Promise<OpResult<DailyRegister>> {
  try {
    const reg = await db.transaction(
      'rw',
      [db.dailyRegisters, db.syncOutbox],
      async () => {
        const todayReg = await getOrCreateTodayRegister();
        todayReg.isClosed = true;
        todayReg.closedAt = new Date().toISOString();

        await db.dailyRegisters.put(todayReg);
        await queueOutbox('register', 'UPDATE', todayReg);

        return todayReg;
      },
    );

    playSound('success');
    triggerHaptic('success');
    return { success: true, data: reg };
  } catch (err) {
    console.error('[closeDayRegister]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 8. Record Vendor Bill / Payment
//    ★ Atomic tx: vendor balance + vendor tx record + daily register (if payment)
// ---------------------------------------------------------------------------
export async function recordVendorTransaction({
  vendorId,
  type,
  amount,
  note = '',
}: {
  vendorId: string;
  type: 'BILL_RECEIVED' | 'PAYMENT_MADE';
  amount: number;
  note?: string;
}): Promise<OpResult<VendorTransaction>> {
  try {
    const vtx = await db.transaction(
      'rw',
      [db.vendors, db.vendorTransactions, db.dailyRegisters, db.syncOutbox],
      async () => {
        const vendor = await db.vendors.get(vendorId);
        if (!vendor) throw new Error('Vendor not found');

        const now = new Date().toISOString();
        const nextBalance =
          type === 'BILL_RECEIVED'
            ? vendor.balanceOwed + amount
            : Math.max(0, vendor.balanceOwed - amount);

        await db.vendors.update(vendorId, {
          balanceOwed: nextBalance,
          lastPaymentAt: type === 'PAYMENT_MADE' ? now : vendor.lastPaymentAt,
        });

        const tx: VendorTransaction = {
          id: generateId('vtx'),
          vendorId,
          type,
          amount,
          note: note || (type === 'BILL_RECEIVED' ? 'माल का बिल' : 'सप्लायर भुगतान'),
          timestamp: now,
        };
        await db.vendorTransactions.add(tx);
        await queueOutbox('vendor_tx', 'CREATE', tx);

        // Vendor payment deducts from cash drawer
        if (type === 'PAYMENT_MADE') {
          const todayReg = await getOrCreateTodayRegister();
          todayReg.cashExpenses = (todayReg.cashExpenses || 0) + amount;
          todayReg.expectedCash = computeExpectedCash(todayReg);
          todayReg.discrepancy = todayReg.countedCash - todayReg.expectedCash;
          await db.dailyRegisters.put(todayReg);
        }

        return tx;
      },
    );

    playSound('coin');
    triggerHaptic('success');
    return { success: true, data: vtx };
  } catch (err) {
    console.error('[recordVendorTransaction]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// 9. Sync Outbox Engine (Local-First → Backend Sync)
// ---------------------------------------------------------------------------
export const BACKEND_URL =
  (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) ||
  'http://localhost:5000';

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Flush pending outbox items to the backend in bounded batches.
 *
 * - Reads at most `SYNC_BATCH_LIMIT` items per flush to cap memory.
 * - On success, marks each item 'synced' individually (crash-safe).
 * - On failure, items remain 'pending' in the outbox for next retry.
 */
const SYNC_BATCH_LIMIT = 100;

export async function syncOutboxNow(): Promise<{
  syncedCount: number;
  serverOnline: boolean;
}> {
  try {
    // Bounded read — never pull the entire table into memory
    const pending = await db.syncOutbox
      .where('status')
      .equals('pending')
      .limit(SYNC_BATCH_LIMIT)
      .toArray();

    if (pending.length === 0) {
      return { syncedCount: 0, serverOnline: true };
    }

    const res = await fetch(`${BACKEND_URL}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: pending }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      // Mark synced inside a single tx so the badge count is consistent
      await db.transaction('rw', db.syncOutbox, async () => {
        for (const item of pending) {
          await db.syncOutbox.update(item.id, { status: 'synced' });
        }
      });

      // Refresh badge count
      const remaining = await db.syncOutbox.where('status').equals('pending').count();
      useAppStore.getState().setPendingSyncCount(remaining);

      playSound('beep');
      return { syncedCount: pending.length, serverOnline: true };
    }

    throw new Error(`Server status ${res.status}`);
  } catch (err) {
    console.warn('[Sync Engine] Backend offline or unreachable. Kept safely in local outbox queue:', err);
    return { syncedCount: 0, serverOnline: false };
  }
}

// ---------------------------------------------------------------------------
// 10. Backup Database to JSON (bounded reads)
// ---------------------------------------------------------------------------
export async function exportDatabaseToJson(): Promise<OpResult<string>> {
  try {
    const [customers, transactions, inventory, vendors, vendorTransactions, dailyRegisters, settings] =
      await Promise.all([
        db.customers.toArray(),
        db.transactions.toArray(),
        db.inventory.toArray(),
        db.vendors.toArray(),
        db.vendorTransactions.toArray(),
        db.dailyRegisters.toArray(),
        db.settings.toArray(),
      ]);

    const backup = {
      appName: 'DukaanKhata',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        customers,
        transactions,
        inventory,
        vendors,
        vendorTransactions,
        dailyRegisters,
        settings,
      },
    };

    return { success: true, data: JSON.stringify(backup, null, 2) };
  } catch (err) {
    console.error('[exportDatabaseToJson]', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
