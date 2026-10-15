import { randomUUID } from 'crypto';
import { db } from '../config/database';

export interface MutationItem {
  id: string; // client mutation id
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'transaction' | 'customer' | 'inventory' | 'register' | 'vendor' | 'vendor_tx';
  payload: any;
  createdAt: string;
}

const UDHAR_TYPES = new Set(['UDHAR', 'UDHAR_GIVEN', 'CREDIT_GIVEN']);
const JAMA_TYPES = new Set(['JAMA', 'JAMA_RECEIVED', 'PAYMENT_RECEIVED']);

export class SyncModel {
  static processBatch(mutations: MutationItem[]): { processedCount: number; serverTimestamp: string } {
    const now = new Date().toISOString();

    const insertAuditLog = db.prepare(`
      INSERT INTO sync_audit_log (id, client_mutation_id, entity, action, payload_json, client_timestamp, processed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Customer upsert — balance is intentionally omitted from DO UPDATE SET
    // so profile edits never clobber transaction-derived balances.
    const upsertCustomer = db.prepare(`
      INSERT INTO customers (id, name, phone, balance, credit_limit, is_pinned, avatar_color, notes, last_transaction_at, created_at, updated_at)
      VALUES (@id, @name, @phone, @balance, @creditLimit, @isPinned, @avatarColor, @notes, @lastTransactionAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = coalesce(excluded.name, customers.name),
        phone = coalesce(excluded.phone, customers.phone),
        credit_limit = coalesce(excluded.credit_limit, customers.credit_limit),
        is_pinned = coalesce(excluded.is_pinned, customers.is_pinned),
        avatar_color = coalesce(excluded.avatar_color, customers.avatar_color),
        notes = coalesce(excluded.notes, customers.notes),
        last_transaction_at = coalesce(excluded.last_transaction_at, customers.last_transaction_at),
        updated_at = excluded.updated_at
    `);
    const deleteCustomer = db.prepare('DELETE FROM customers WHERE id = ?');

    // Balance mutation statements
    const incrementCustomerBalance = db.prepare(`
      UPDATE customers 
      SET balance = balance + ?, last_transaction_at = ?, updated_at = ? 
      WHERE id = ?
    `);
    const decrementCustomerBalance = db.prepare(`
      UPDATE customers 
      SET balance = balance - ?, last_transaction_at = ?, updated_at = ? 
      WHERE id = ?
    `);

    // Check existing transaction for idempotency
    const checkTxExists = db.prepare('SELECT id FROM transactions WHERE id = ?');

    // Transaction
    const insertTransaction = db.prepare(`
      INSERT INTO transactions (id, customer_id, customer_name, type, amount, note, items_json, payment_method, timestamp, created_at)
      VALUES (@id, @customerId, @customerName, @type, @amount, @note, @itemsJson, @paymentMethod, @timestamp, @createdAt)
    `);

    // Inventory
    const upsertInventory = db.prepare(`
      INSERT INTO inventory (id, name, name_hi, category, parent_unit_name, sub_unit_name, loose_unit_name, units_per_parent, units_per_sub, stock_in_loose_units, loose_selling_price, sub_selling_price, parent_cost_price, low_stock_threshold_loose, quick_preset, color, icon, updated_at)
      VALUES (@id, @name, @nameHi, @category, @parentUnitName, @subUnitName, @looseUnitName, @unitsPerParent, @unitsPerSub, @stockInLooseUnits, @looseSellingPrice, @subSellingPrice, @parentCostPrice, @lowStockThresholdLoose, @quickPreset, @color, @icon, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        stock_in_loose_units = coalesce(excluded.stock_in_loose_units, inventory.stock_in_loose_units),
        loose_selling_price = coalesce(excluded.loose_selling_price, inventory.loose_selling_price),
        sub_selling_price = coalesce(excluded.sub_selling_price, inventory.sub_selling_price),
        parent_cost_price = coalesce(excluded.parent_cost_price, inventory.parent_cost_price),
        updated_at = excluded.updated_at
    `);

    // Vendor
    const upsertVendor = db.prepare(`
      INSERT INTO vendors (id, name, company, phone, balance_owed, last_payment_at, created_at, updated_at)
      VALUES (@id, @name, @company, @phone, @balanceOwed, @lastPaymentAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        balance_owed = coalesce(excluded.balance_owed, vendors.balance_owed),
        last_payment_at = coalesce(excluded.last_payment_at, vendors.last_payment_at),
        updated_at = excluded.updated_at
    `);

    // Vendor Transaction
    const insertVendorTx = db.prepare(`
      INSERT OR REPLACE INTO vendor_transactions (id, vendor_id, type, amount, note, timestamp, created_at)
      VALUES (@id, @vendorId, @type, @amount, @note, @timestamp, @createdAt)
    `);

    // Register
    const upsertRegister = db.prepare(`
      INSERT INTO daily_registers (id, date, starting_cash, denominations_json, counted_cash, expected_cash, discrepancy, cash_sales, jama_cash, cash_expenses, upi_sales, udhar_given, is_closed, closed_at, notes, updated_at)
      VALUES (@id, @date, @startingCash, @denominationsJson, @countedCash, @expectedCash, @discrepancy, @cashSales, @jamaCash, @cashExpenses, @upiSales, @udharGiven, @isClosed, @closedAt, @notes, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        counted_cash = excluded.counted_cash,
        expected_cash = excluded.expected_cash,
        discrepancy = excluded.discrepancy,
        denominations_json = excluded.denominations_json,
        cash_sales = excluded.cash_sales,
        jama_cash = excluded.jama_cash,
        cash_expenses = excluded.cash_expenses,
        upi_sales = excluded.upi_sales,
        udhar_given = excluded.udhar_given,
        is_closed = excluded.is_closed,
        closed_at = excluded.closed_at,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `);

    const runBatch = db.transaction((items: MutationItem[]) => {
      let count = 0;
      for (const item of items) {
        const p = item.payload || {};
        switch (item.entity) {
          case 'customer':
            if (item.action === 'DELETE') {
              deleteCustomer.run(p.id);
            } else {
              upsertCustomer.run({
                id: p.id,
                name: p.name || 'ग्राहक',
                phone: p.phone || '',
                balance: p.balance ?? 0,
                creditLimit: p.creditLimit ?? 500,
                isPinned: p.isPinned ? 1 : 0,
                avatarColor: p.avatarColor || 'bg-emerald-600',
                notes: p.notes || '',
                lastTransactionAt: p.lastTransactionAt || now,
                createdAt: p.createdAt || now,
                updatedAt: now,
              });
            }
            break;

          case 'transaction': {
            const txId = p.id || `tx-${randomUUID()}`;
            const exists = checkTxExists.get(txId);

            // Only insert and adjust balance if transaction has not already been synced
            if (!exists) {
              const txType = (p.type || 'CASH_SALE').toUpperCase();
              const txAmount = Number(p.amount) || 0;

              insertTransaction.run({
                id: txId,
                customerId: p.customerId || null,
                customerName: p.customerName || null,
                type: txType,
                amount: txAmount,
                note: p.note || '',
                itemsJson: p.items ? JSON.stringify(p.items) : null,
                paymentMethod: p.paymentMethod || 'CASH',
                timestamp: p.timestamp || now,
                createdAt: now,
              });

              // Apply the delta balance update to ensure customer ledger stays synchronized
              if (p.customerId) {
                if (UDHAR_TYPES.has(txType)) {
                  incrementCustomerBalance.run(txAmount, now, now, p.customerId);
                } else if (JAMA_TYPES.has(txType)) {
                  decrementCustomerBalance.run(txAmount, now, now, p.customerId);
                }
              }
            }
            break;
          }

          case 'inventory':
            upsertInventory.run({
              id: p.id,
              name: p.name || '',
              nameHi: p.nameHi || p.name || '',
              category: p.category || 'other',
              parentUnitName: p.parentUnitName || 'Box',
              subUnitName: p.subUnitName || 'Pack',
              looseUnitName: p.looseUnitName || 'Piece',
              unitsPerParent: p.unitsPerParent || 1,
              unitsPerSub: p.unitsPerSub || 1,
              stockInLooseUnits: p.stockInLooseUnits ?? 0,
              looseSellingPrice: p.looseSellingPrice ?? 0,
              subSellingPrice: p.subSellingPrice ?? null,
              parentCostPrice: p.parentCostPrice ?? 0,
              lowStockThresholdLoose: p.lowStockThresholdLoose ?? 10,
              quickPreset: p.quickPreset ? 1 : 0,
              color: p.color || '',
              icon: p.icon || 'Package',
              updatedAt: now,
            });
            break;

          case 'vendor':
            upsertVendor.run({
              id: p.id,
              name: p.name || '',
              company: p.company || '',
              phone: p.phone || '',
              balanceOwed: p.balanceOwed ?? 0,
              lastPaymentAt: p.lastPaymentAt || now,
              createdAt: p.createdAt || now,
              updatedAt: now,
            });
            break;

          case 'vendor_tx':
            insertVendorTx.run({
              id: p.id,
              vendorId: p.vendorId,
              type: p.type || 'BILL_RECEIVED',
              amount: p.amount || 0,
              note: p.note || '',
              timestamp: p.timestamp || now,
              createdAt: now,
            });
            break;

          case 'register':
            upsertRegister.run({
              id: p.id || p.date,
              date: p.date,
              startingCash: p.startingCash ?? 2000,
              denominationsJson: p.denominations ? JSON.stringify(p.denominations) : null,
              countedCash: p.countedCash ?? 0,
              expectedCash: p.expectedCash ?? 0,
              discrepancy: p.discrepancy ?? 0,
              cashSales: p.cashSales ?? 0,
              jamaCash: p.jamaCash ?? 0,
              cashExpenses: p.cashExpenses ?? 0,
              upiSales: p.upiSales ?? 0,
              udharGiven: p.udharGiven ?? 0,
              isClosed: p.isClosed ? 1 : 0,
              closedAt: p.closedAt || null,
              notes: p.notes || '',
              updatedAt: now,
            });
            break;
        }

        insertAuditLog.run(
          `audit-${randomUUID()}`,
          item.id,
          item.entity,
          item.action,
          JSON.stringify(p),
          item.createdAt,
          now
        );
        count++;
      }
      return count;
    });

    const processedCount = runBatch(mutations);

    // Self-healing: ensure balances strictly equal transaction ledger deltas
    SyncModel.reconcileCustomerBalance();

    return { processedCount, serverTimestamp: now };
  }

  static pullChanges(since?: string) {
    const sinceClause = since ? since : '1970-01-01T00:00:00.000Z';

    const customers = db.prepare('SELECT * FROM customers WHERE updated_at > ?').all(sinceClause);
    const transactions = db.prepare('SELECT * FROM transactions WHERE created_at > ?').all(sinceClause);
    const inventory = db.prepare('SELECT * FROM inventory WHERE updated_at > ?').all(sinceClause);
    const vendors = db.prepare('SELECT * FROM vendors WHERE updated_at > ?').all(sinceClause);
    const registers = db.prepare('SELECT * FROM daily_registers WHERE updated_at > ?').all(sinceClause);

    return {
      serverTimestamp: new Date().toISOString(),
      changes: {
        customers,
        transactions,
        inventory,
        vendors,
        registers,
      },
    };
  }

  static getFullBackup() {
    return {
      appName: 'DukaanKhata',
      version: '2.0-mvc',
      exportedAt: new Date().toISOString(),
      counts: {
        customers: (db.prepare('SELECT count(*) as count FROM customers').get() as any).count,
        transactions: (db.prepare('SELECT count(*) as count FROM transactions').get() as any).count,
        inventory: (db.prepare('SELECT count(*) as count FROM inventory').get() as any).count,
        vendors: (db.prepare('SELECT count(*) as count FROM vendors').get() as any).count,
      },
      data: {
        customers: db.prepare('SELECT * FROM customers').all(),
        transactions: db.prepare('SELECT * FROM transactions').all(),
        inventory: db.prepare('SELECT * FROM inventory').all(),
        vendors: db.prepare('SELECT * FROM vendors').all(),
        vendorTransactions: db.prepare('SELECT * FROM vendor_transactions').all(),
        dailyRegisters: db.prepare('SELECT * FROM daily_registers').all(),
        syncAudit: db.prepare('SELECT * FROM sync_audit_log ORDER BY processed_at DESC LIMIT 100').all(),
      },
    };
  }

  static restoreBackup(data: any) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup payload');
    }

    return db.transaction(() => {
      if (Array.isArray(data.customers)) {
        for (const c of data.customers) {
          db.prepare(`
            INSERT OR REPLACE INTO customers (id, name, phone, balance, credit_limit, is_pinned, avatar_color, notes, last_transaction_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(c.id, c.name, c.phone, c.balance, c.credit_limit, c.is_pinned, c.avatar_color, c.notes, c.last_transaction_at, c.created_at, c.updated_at || new Date().toISOString());
        }
      }

      if (Array.isArray(data.inventory)) {
        for (const i of data.inventory) {
          db.prepare(`
            INSERT OR REPLACE INTO inventory (id, name, name_hi, category, parent_unit_name, sub_unit_name, loose_unit_name, units_per_parent, units_per_sub, stock_in_loose_units, loose_selling_price, sub_selling_price, parent_cost_price, low_stock_threshold_loose, quick_preset, color, icon, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(i.id, i.name, i.name_hi, i.category, i.parent_unit_name, i.sub_unit_name, i.loose_unit_name, i.units_per_parent, i.units_per_sub, i.stock_in_loose_units, i.loose_selling_price, i.sub_selling_price, i.parent_cost_price, i.low_stock_threshold_loose, i.quick_preset, i.color, i.icon, i.updated_at || new Date().toISOString());
        }
      }
      return true;
    })();
  }

  /**
   * Recomputes customer balance directly from transactions.
   * Safe to call after sync batches or during scheduled reconciliation.
   */
  static reconcileCustomerBalance(customerId?: string): void {
    const now = new Date().toISOString();
    if (customerId) {
      db.prepare(`
        UPDATE customers
        SET balance = (
          SELECT coalesce(sum(
            CASE
              WHEN type IN ('UDHAR', 'UDHAR_GIVEN', 'CREDIT_GIVEN') THEN amount
              WHEN type IN ('JAMA', 'JAMA_RECEIVED', 'PAYMENT_RECEIVED') THEN -amount
              ELSE 0
            END
          ), 0)
          FROM transactions
          WHERE transactions.customer_id = customers.id
        ),
        updated_at = ?
        WHERE id = ?
      `).run(now, customerId);
    } else {
      db.prepare(`
        UPDATE customers
        SET balance = (
          SELECT coalesce(sum(
            CASE
              WHEN type IN ('UDHAR', 'UDHAR_GIVEN', 'CREDIT_GIVEN') THEN amount
              WHEN type IN ('JAMA', 'JAMA_RECEIVED', 'PAYMENT_RECEIVED') THEN -amount
              ELSE 0
            END
          ), 0)
          FROM transactions
          WHERE transactions.customer_id = customers.id
        ),
        updated_at = ?
      `).run(now);
    }
  }

  static auditLogCount(): number {
    return (db.prepare('SELECT count(*) as count FROM sync_audit_log').get() as any).count;
  }
}