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
    -- -------------------------------------------------------------------------
    -- Users table (multi-user support)
    -- -------------------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- -------------------------------------------------------------------------
    -- Domain tables
    -- -------------------------------------------------------------------------
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

  // Run safe migrations for columns / indexes added after initial schema creation
  runMigrations();
}

// ---------------------------------------------------------------------------
// Safe schema migrations
//
// SQLite does not support ALTER TABLE … ADD COLUMN IF NOT EXISTS, so we
// inspect pragma table_info() first and only issue the ALTER when the column
// is truly absent. Each entry in DOMAIN_TABLES gets a `user_id` column that
// references users(id) (no ON DELETE constraint so existing data is never
// broken) plus a named index for fast per-user queries.
// ---------------------------------------------------------------------------

/** Tables that need a user_id column for multi-user data isolation. */
const DOMAIN_TABLES: ReadonlyArray<{ table: string; index: string }> = [
  { table: 'customers',         index: 'idx_customers_user'   },
  { table: 'transactions',      index: 'idx_transactions_user' },
  { table: 'inventory',         index: 'idx_inventory_user'   },
  { table: 'vendors',           index: 'idx_vendors_user'     },
  { table: 'vendor_transactions', index: 'idx_vtx_user'       },
  { table: 'daily_registers',   index: 'idx_registers_user'   },
  { table: 'sync_audit_log',    index: 'idx_sync_user'        },
];

/**
 * Returns true when the given column already exists in the table.
 * Uses PRAGMA table_info() which is always safe to call on any SQLite DB.
 */
function columnExists(table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

/**
 * Applies all outstanding schema migrations in a single transaction.
 * Idempotent – safe to call on every server start.
 */
function runMigrations(): void {
  db.transaction(() => {
    for (const { table, index } of DOMAIN_TABLES) {
      // 1. Add user_id column if it is not already present
      if (!columnExists(table, 'user_id')) {
        db.exec(`
          ALTER TABLE ${table}
          ADD COLUMN user_id TEXT REFERENCES users(id)
        `);
        console.log(`[Migration] Added user_id column to '${table}'`);
      }

      // 2. Create the index (IF NOT EXISTS makes this a no-op on reruns)
      db.exec(`
        CREATE INDEX IF NOT EXISTS ${index} ON ${table}(user_id)
      `);
    }
  })();
}
