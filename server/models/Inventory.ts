import { db } from '../config/database';

export interface InventoryData {
  id: string;
  name: string;
  name_hi?: string;
  category?: string;
  parent_unit_name?: string;
  sub_unit_name?: string;
  loose_unit_name?: string;
  units_per_parent?: number;
  units_per_sub?: number;
  stock_in_loose_units?: number;
  loose_selling_price?: number;
  sub_selling_price?: number | null;
  parent_cost_price?: number;
  low_stock_threshold_loose?: number;
  quick_preset?: number;
  color?: string;
  icon?: string;
  updated_at?: string;
}

export class InventoryModel {
  static findAll(): InventoryData[] {
    return db
      .prepare('SELECT * FROM inventory ORDER BY category ASC, name ASC')
      .all() as InventoryData[];
  }

  static findById(id: string): InventoryData | undefined {
    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as InventoryData | undefined;
  }

  static create(data: Partial<InventoryData>): InventoryData {
    const id = data.id || `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO inventory (id, name, name_hi, category, parent_unit_name, sub_unit_name, loose_unit_name, units_per_parent, units_per_sub, stock_in_loose_units, loose_selling_price, sub_selling_price, parent_cost_price, low_stock_threshold_loose, quick_preset, color, icon, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.name_hi || data.name,
      data.category || 'other',
      data.parent_unit_name || 'Box',
      data.sub_unit_name || 'Pack',
      data.loose_unit_name || 'Piece',
      data.units_per_parent || 1,
      data.units_per_sub || 1,
      data.stock_in_loose_units ?? 0,
      data.loose_selling_price ?? 0,
      data.sub_selling_price ?? null,
      data.parent_cost_price ?? 0,
      data.low_stock_threshold_loose ?? 10,
      data.quick_preset ? 1 : 0,
      data.color || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      data.icon || 'Package',
      now
    );

    return this.findById(id)!;
  }

  static updateStock(id: string, { stockInLooseUnits, deductLooseUnits }: { stockInLooseUnits?: number; deductLooseUnits?: number }): InventoryData | undefined {
    const now = new Date().toISOString();
    if (deductLooseUnits !== undefined) {
      db.prepare(`
        UPDATE inventory SET
          stock_in_loose_units = max(0, stock_in_loose_units - ?),
          updated_at = ?
        WHERE id = ?
      `).run(deductLooseUnits, now, id);
    } else if (stockInLooseUnits !== undefined) {
      db.prepare(`
        UPDATE inventory SET
          stock_in_loose_units = ?,
          updated_at = ?
        WHERE id = ?
      `).run(stockInLooseUnits, now, id);
    }
    return this.findById(id);
  }

  static count(): number {
    return (db.prepare('SELECT count(*) as count FROM inventory').get() as any).count;
  }
}
