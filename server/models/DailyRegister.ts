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
  user_id?: string;
}

export class DailyRegisterModel {
  static getToday(userId: string): DailyRegisterData {
    const today = new Date().toISOString().split('T')[0];

    // Primary key is composite: date + user_id to support multiple users on
    // the same calendar day. We use `${today}-${userId}` as the row id so
    // existing single-user rows (id = date) keep working untouched.
    const rowId = `${today}-${userId}`;

    let register = db
      .prepare('SELECT * FROM daily_registers WHERE id = ?')
      .get(rowId) as DailyRegisterData | undefined;

    if (!register) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO daily_registers
          (id, date, starting_cash, denominations_json, counted_cash, expected_cash,
           discrepancy, cash_sales, jama_cash, cash_expenses, upi_sales, udhar_given,
           is_closed, updated_at, user_id)
        VALUES (?, ?, 2000, null, 2000, 2000, 0, 0, 0, 0, 0, 0, 0, ?, ?)
      `).run(rowId, today, now, userId);

      register = db
        .prepare('SELECT * FROM daily_registers WHERE id = ?')
        .get(rowId) as DailyRegisterData;
    }

    return register;
  }

  static findAll(userId: string, limit = 30): DailyRegisterData[] {
    return db
      .prepare(
        'SELECT * FROM daily_registers WHERE user_id = ? ORDER BY date DESC LIMIT ?',
      )
      .all(userId, limit) as DailyRegisterData[];
  }

  static closeToday(
    userId: string,
    {
      countedCash,
      denominations,
      notes,
    }: {
      countedCash?: number;
      denominations?: any;
      notes?: string;
    },
  ): DailyRegisterData {
    const today = new Date().toISOString().split('T')[0];
    const rowId = `${today}-${userId}`;
    const now   = new Date().toISOString();

    db.prepare(`
      UPDATE daily_registers SET
        is_closed        = 1,
        closed_at        = ?,
        counted_cash     = coalesce(?, counted_cash),
        denominations_json = coalesce(?, denominations_json),
        notes            = coalesce(?, notes),
        updated_at       = ?
      WHERE id = ? AND user_id = ?
    `).run(
      now,
      countedCash,
      denominations ? JSON.stringify(denominations) : null,
      notes,
      now,
      rowId,
      userId,
    );

    return db
      .prepare('SELECT * FROM daily_registers WHERE id = ? AND user_id = ?')
      .get(rowId, userId) as DailyRegisterData;
  }
}
