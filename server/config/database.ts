import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'dukaankhata.db');

export const db = new Database(DB_PATH);

// High-performance WAL mode & PRAGMAs
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 500,
      is_pinned INTEGER DEFAULT 0,
      avatar_color TEXT,
      notes TEXT,
      last_transaction_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_updated ON customers(updated_at);

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      items_json TEXT,
      payment_method TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp);
    CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_hi TEXT,
      category TEXT,
      parent_unit_name TEXT,
      sub_unit_name TEXT,
      loose_unit_name TEXT,
      units_per_parent REAL DEFAULT 1,
      units_per_sub REAL DEFAULT 1,
      stock_in_loose_units REAL DEFAULT 0,
      loose_selling_price REAL DEFAULT 0,
      sub_selling_price REAL,
      parent_cost_price REAL DEFAULT 0,
      low_stock_threshold_loose REAL DEFAULT 10,
      quick_preset INTEGER DEFAULT 1,
      color TEXT,
      icon TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      phone TEXT,
      balance_owed REAL DEFAULT 0,
      last_payment_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendor_transactions (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_vtx_vendor ON vendor_transactions(vendor_id);

    CREATE TABLE IF NOT EXISTS daily_registers (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      starting_cash REAL DEFAULT 0,
      denominations_json TEXT,
      counted_cash REAL DEFAULT 0,
      expected_cash REAL DEFAULT 0,
      discrepancy REAL DEFAULT 0,
      cash_sales REAL DEFAULT 0,
      jama_cash REAL DEFAULT 0,
      cash_expenses REAL DEFAULT 0,
      upi_sales REAL DEFAULT 0,
      udhar_given REAL DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      closed_at TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_audit_log (
      id TEXT PRIMARY KEY,
      client_mutation_id TEXT,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      payload_json TEXT,
      client_timestamp TEXT,
      processed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_audit_log(entity);
    CREATE INDEX IF NOT EXISTS idx_sync_processed ON sync_audit_log(processed_at);

    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
