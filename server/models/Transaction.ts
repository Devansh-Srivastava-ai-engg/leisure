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
  user_id?: string;
}

const UDHAR_TYPES = new Set(['UDHAR', 'UDHAR_GIVEN', 'CREDIT_GIVEN']);
const JAMA_TYPES  = new Set(['JAMA', 'JAMA_RECEIVED', 'PAYMENT_RECEIVED']);

export class TransactionModel {
  static findAll({
    userId,
    customerId,
    type,
    limit = 50,
    offset = 0,
  }: {
    userId: string;
    customerId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): TransactionData[] {
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params: any[] = [userId];

    if (customerId) {
      query += ' AND customer_id = ?';
      params.push(customerId);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    return db.prepare(query).all(...params) as TransactionData[];
  }

  static findByCustomerId(customerId: string, userId: string): TransactionData[] {
    // Verify that the referenced customer belongs to the authenticated user
    const customer = db
      .prepare('SELECT id FROM customers WHERE id = ? AND user_id = ?')
      .get(customerId, userId);

    if (!customer) {
      const error: any = new Error(`Customer not found with id: ${customerId}`);
      error.statusCode = 404;
      throw error;
    }

    return db
      .prepare(
        'SELECT * FROM transactions WHERE customer_id = ? AND user_id = ? ORDER BY timestamp DESC',
      )
      .all(customerId, userId) as TransactionData[];
  }

  static create(data: Partial<TransactionData> & { user_id: string }): TransactionData {
    const id  = data.id || `tx-${randomUUID()}`;
    const now = new Date().toISOString();
    const amount = Number(data.amount) || 0;
    const type   = (data.type || 'CASH_SALE').toUpperCase();

    // Verify ownership on child record: customer_id must belong to data.user_id
    if (data.customer_id && String(data.customer_id).trim() !== '') {
      const customer = db
        .prepare('SELECT id, name FROM customers WHERE id = ? AND user_id = ?')
        .get(String(data.customer_id).trim(), data.user_id) as { id: string; name: string } | undefined;

      if (!customer) {
        const error: any = new Error(`Customer not found with id: ${data.customer_id}`);
        error.statusCode = 404;
        throw error;
      }
    }

    return db.transaction(() => {
      // Idempotency guard for sync: if this exact ID was already written by
      // this user, return the existing row instead of inserting a duplicate.
      const existing = db
        .prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?')
        .get(id, data.user_id);
      if (existing) {
        return db
          .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
          .get(id, data.user_id) as TransactionData;
      }

      db.prepare(`
        INSERT INTO transactions
          (id, customer_id, customer_name, type, amount, note, items_json,
           payment_method, timestamp, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.customer_id  || null,
        data.customer_name || null,
        type,
        amount,
        data.note          || '',
        data.items_json    || null,
        data.payment_method || 'CASH',
        data.timestamp     || now,
        data.created_at    || now,
        data.user_id,
      );

      // Auto-update customer balance — scoped to the same user
      if (data.customer_id) {
        if (UDHAR_TYPES.has(type)) {
          db.prepare(`
            UPDATE customers
            SET balance = balance + ?, last_transaction_at = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
          `).run(amount, now, now, data.customer_id, data.user_id);
        } else if (JAMA_TYPES.has(type)) {
          db.prepare(`
            UPDATE customers
            SET balance = balance - ?, last_transaction_at = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
          `).run(amount, now, now, data.customer_id, data.user_id);
        }
      }

      return db
        .prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?')
        .get(id, data.user_id) as TransactionData;
    })();
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM transactions').get() as any).count;
  }
}
