import { db } from '../config/database';

export interface CustomerData {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
  credit_limit?: number;
  is_pinned?: number;
  avatar_color?: string;
  notes?: string;
  last_transaction_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class CustomerModel {
  static findAll(search?: string): CustomerData[] {
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      return db
        .prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY is_pinned DESC, name ASC')
        .all(q, q) as CustomerData[];
    }
    return db
      .prepare('SELECT * FROM customers ORDER BY is_pinned DESC, name ASC')
      .all() as CustomerData[];
  }

  static findById(id: string): CustomerData | undefined {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerData | undefined;
  }

  static create(data: Partial<CustomerData>): CustomerData {
    const id = data.id || `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, name, phone, balance, credit_limit, is_pinned, avatar_color, notes, last_transaction_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name || 'ग्राहक',
      data.phone || '',
      data.balance ?? 0,
      data.credit_limit ?? 500,
      data.is_pinned ? 1 : 0,
      data.avatar_color || 'bg-emerald-600',
      data.notes || '',
      data.last_transaction_at || now,
      data.created_at || now,
      now
    );

    return this.findById(id)!;
  }

  static update(id: string, data: Partial<CustomerData>): CustomerData | undefined {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE customers SET
        name = coalesce(?, name),
        phone = coalesce(?, phone),
        balance = coalesce(?, balance),
        credit_limit = coalesce(?, credit_limit),
        is_pinned = coalesce(?, is_pinned),
        notes = coalesce(?, notes),
        last_transaction_at = coalesce(?, last_transaction_at),
        updated_at = ?
      WHERE id = ?
    `).run(
      data.name,
      data.phone,
      data.balance,
      data.credit_limit,
      data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : null,
      data.notes,
      data.last_transaction_at,
      now,
      id
    );

    return this.findById(id);
  }

  static delete(id: string): boolean {
    const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM customers').get() as any).count;
  }
}
