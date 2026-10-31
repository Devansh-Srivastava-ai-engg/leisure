import { db } from '../config/database';

export interface VendorData {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  balance_owed?: number;
  last_payment_at?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export class VendorModel {
  static findAll(userId: string): VendorData[] {
    return db
      .prepare('SELECT * FROM vendors WHERE user_id = ? ORDER BY balance_owed DESC')
      .all(userId) as VendorData[];
  }

  static findById(id: string, userId: string): VendorData | undefined {
    return db
      .prepare('SELECT * FROM vendors WHERE id = ? AND user_id = ?')
      .get(id, userId) as VendorData | undefined;
  }

  static create(data: Partial<VendorData> & { user_id: string }): VendorData {
    const id  = data.id || `vend-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vendors (id, name, company, phone, balance_owed, last_payment_at, created_at, updated_at, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.company      || '',
      data.phone        || '',
      data.balance_owed ?? 0,
      now,
      now,
      now,
      data.user_id,
    );

    return this.findById(id, data.user_id)!;
  }

  static recordTransaction({
    vendorId,
    userId,
    type,
    amount,
    note = '',
  }: {
    vendorId: string;
    userId: string;
    type: 'BILL_RECEIVED' | 'PAYMENT_MADE';
    amount: number;
    note?: string;
  }) {
    const id  = `vtx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    return db.transaction(() => {
      // Verify the vendor belongs to the authenticated user before writing
      const vendor = this.findById(vendorId, userId);
      if (!vendor) {
        throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
      }

      db.prepare(`
        INSERT INTO vendor_transactions
          (id, vendor_id, type, amount, note, timestamp, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, vendorId, type, amount, note, now, now, userId);

      if (type === 'BILL_RECEIVED') {
        db.prepare(
          'UPDATE vendors SET balance_owed = balance_owed + ?, updated_at = ? WHERE id = ? AND user_id = ?',
        ).run(amount, now, vendorId, userId);
      } else if (type === 'PAYMENT_MADE') {
        db.prepare(
          'UPDATE vendors SET balance_owed = max(0, balance_owed - ?), last_payment_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        ).run(amount, now, now, vendorId, userId);
      }

      const tx     = db.prepare('SELECT * FROM vendor_transactions WHERE id = ?').get(id);
      const updated = this.findById(vendorId, userId);
      return { tx, vendor: updated };
    })();
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM vendors').get() as any).count;
  }
}
