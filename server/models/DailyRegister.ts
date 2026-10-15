import { db } from '../config/database';

export interface DailyRegisterData {
  id: string; // YYYY-MM-DD
  date: string;
  starting_cash?: number;
  denominations_json?: string | null;
  counted_cash?: number;
  expected_cash?: number;
  discrepancy?: number;
  cash_sales?: number;
  jama_cash?: number;
  cash_expenses?: number;
  upi_sales?: number;
  udhar_given?: number;
  is_closed?: number;
  closed_at?: string | null;
  notes?: string | null;
  updated_at?: string;
}

export class DailyRegisterModel {
  static getToday(): DailyRegisterData {
    const today = new Date().toISOString().split('T')[0];
    let register = db.prepare('SELECT * FROM daily_registers WHERE id = ?').get(today) as DailyRegisterData | undefined;

    if (!register) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO daily_registers (id, date, starting_cash, denominations_json, counted_cash, expected_cash, discrepancy, cash_sales, jama_cash, cash_expenses, upi_sales, udhar_given, is_closed, updated_at)
        VALUES (?, ?, 2000, null, 2000, 2000, 0, 0, 0, 0, 0, 0, 0, ?)
      `).run(today, today, now);

      register = db.prepare('SELECT * FROM daily_registers WHERE id = ?').get(today) as DailyRegisterData;
    }

    return register;
  }

  static findAll(limit = 30): DailyRegisterData[] {
    return db
      .prepare('SELECT * FROM daily_registers ORDER BY date DESC LIMIT ?')
      .all(limit) as DailyRegisterData[];
  }

  static closeToday({
    countedCash,
    denominations,
    notes,
  }: {
    countedCash?: number;
    denominations?: any;
    notes?: string;
  }): DailyRegisterData {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE daily_registers SET
        is_closed = 1,
        closed_at = ?,
        counted_cash = coalesce(?, counted_cash),
        denominations_json = coalesce(?, denominations_json),
        notes = coalesce(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      countedCash,
      denominations ? JSON.stringify(denominations) : null,
      notes,
      now,
      today
    );

    return db.prepare('SELECT * FROM daily_registers WHERE id = ?').get(today) as DailyRegisterData;
  }
}
