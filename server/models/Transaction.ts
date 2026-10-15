import { randomUUID } from 'crypto';
import { db } from '../config/database';

export interface TransactionData {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  type: string;
  amount: number;
  note?: string;
  items_json?: string | null;
  payment_method?: string;
  timestamp: string;
  created_at: string;
}

const UDHAR_TYPES = new Set(['UDHAR', 'UDHAR_GIVEN', 'CREDIT_GIVEN']);
const JAMA_TYPES = new Set(['JAMA', 'JAMA_RECEIVED', 'PAYMENT_RECEIVED']);

export class TransactionModel {
  static findAll({
    customerId,
    type,
    limit = 50,
    offset = 0,
  }: {
    customerId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): TransactionData[] {
    let query = 'SELECT * FROM transactions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (customerId) {
      conditions.push('customer_id = ?');
      params.push(customerId);
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.prepare(query).all(...params) as TransactionData[];
  }

  static findByCustomerId(customerId: string): TransactionData[] {
    return db
      .prepare('SELECT * FROM transactions WHERE customer_id = ? ORDER BY timestamp DESC')
      .all(customerId) as TransactionData[];
  }

  static create(data: Partial<TransactionData>): TransactionData {
    const id = data.id || `tx-${randomUUID()}`;
    const now = new Date().toISOString();
    const amount = Number(data.amount) || 0;
    const type = (data.type || 'CASH_SALE').toUpperCase();

    return db.transaction(() => {
      // Check if this transaction ID already exists (idempotency guard for sync)
      const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
      if (existing) {
        return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionData;
      }

      db.prepare(`
        INSERT INTO transactions (id, customer_id, customer_name, type, amount, note, items_json, payment_method, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.customer_id || null,
        data.customer_name || null,
        type,
        amount,
        data.note || '',
        data.items_json || null,
        data.payment_method || 'CASH',
        data.timestamp || now,
        data.created_at || now
      );

      // Auto update customer balance if transaction belongs to a valid customer
      if (data.customer_id) {
        if (UDHAR_TYPES.has(type)) {
          db.prepare(`
            UPDATE customers 
            SET balance = balance + ?, last_transaction_at = ?, updated_at = ? 
            WHERE id = ?
          `).run(amount, now, now, data.customer_id);
        } else if (JAMA_TYPES.has(type)) {
          db.prepare(`
            UPDATE customers 
            SET balance = balance - ?, last_transaction_at = ?, updated_at = ? 
            WHERE id = ?
          `).run(amount, now, now, data.customer_id);
        }
      }

      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionData;
    })();
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM transactions').get() as any).count;
  }
}