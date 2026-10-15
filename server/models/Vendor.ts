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
}

export class VendorModel {
  static findAll(): VendorData[] {
    return db.prepare('SELECT * FROM vendors ORDER BY balance_owed DESC').all() as VendorData[];
  }

  static findById(id: string): VendorData | undefined {
    return db.prepare('SELECT * FROM vendors WHERE id = ?').get(id) as VendorData | undefined;
  }

  static create(data: Partial<VendorData>): VendorData {
    const id = data.id || `vend-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO vendors (id, name, company, phone, balance_owed, last_payment_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.company || '', data.phone || '', data.balance_owed ?? 0, now, now, now);

    return this.findById(id)!;
  }

  static recordTransaction({
    vendorId,
    type,
    amount,
    note = '',
  }: {
    vendorId: string;
    type: 'BILL_RECEIVED' | 'PAYMENT_MADE';
    amount: number;
    note?: string;
  }) {
    const id = `vtx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO vendor_transactions (id, vendor_id, type, amount, note, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, vendorId, type, amount, note, now, now);

      if (type === 'BILL_RECEIVED') {
        db.prepare('UPDATE vendors SET balance_owed = balance_owed + ?, updated_at = ? WHERE id = ?').run(
          amount,
          now,
          vendorId
        );
      } else if (type === 'PAYMENT_MADE') {
        db.prepare('UPDATE vendors SET balance_owed = max(0, balance_owed - ?), last_payment_at = ?, updated_at = ? WHERE id = ?').run(
          amount,
          now,
          now,
          vendorId
        );
      }

      const tx = db.prepare('SELECT * FROM vendor_transactions WHERE id = ?').get(id);
      const vendor = this.findById(vendorId);
      return { tx, vendor };
    })();
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM vendors').get() as any).count;
  }
}
