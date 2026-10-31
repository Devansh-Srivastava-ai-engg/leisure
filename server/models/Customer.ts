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
  user_id?: string;
}

export class CustomerModel {
  static findAll(userId: string, search?: string): CustomerData[] {
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      return db
        .prepare(
          'SELECT * FROM customers WHERE user_id = ? AND (name LIKE ? OR phone LIKE ?) ORDER BY is_pinned DESC, name ASC',
        )
        .all(userId, q, q) as CustomerData[];
    }
    return db
      .prepare('SELECT * FROM customers WHERE user_id = ? ORDER BY is_pinned DESC, name ASC')
      .all(userId) as CustomerData[];
  }

  static findById(id: string, userId: string): CustomerData | undefined {
    return db
      .prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?')
      .get(id, userId) as CustomerData | undefined;
  }

  static create(data: Partial<CustomerData> & { user_id: string }): CustomerData {
    const id = data.id || `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers
        (id, name, phone, balance, credit_limit, is_pinned, avatar_color, notes,
         last_transaction_at, created_at, updated_at, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      now,
      data.user_id,
    );

    return this.findById(id, data.user_id)!;
  }

  static update(id: string, userId: string, data: Partial<CustomerData>): CustomerData | undefined {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE customers SET
        name                 = coalesce(?, name),
        phone                = coalesce(?, phone),
        balance              = coalesce(?, balance),
        credit_limit         = coalesce(?, credit_limit),
        is_pinned            = coalesce(?, is_pinned),
        notes                = coalesce(?, notes),
        last_transaction_at  = coalesce(?, last_transaction_at),
        updated_at           = ?
      WHERE id = ? AND user_id = ?
    `).run(
      data.name,
      data.phone,
      data.balance,
      data.credit_limit,
      data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : null,
      data.notes,
      data.last_transaction_at,
      now,
      id,
      userId,
    );

    return this.findById(id, userId);
  }

  static delete(id: string, userId: string): boolean {
    const result = db
      .prepare('DELETE FROM customers WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return result.changes > 0;
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM customers').get() as any).count;
  }
}
