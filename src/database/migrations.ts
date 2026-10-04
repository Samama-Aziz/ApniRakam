import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_ACCOUNTS_TABLE, CREATE_BUDGETS_TABLE, CREATE_CATEGORIES_TABLE, CREATE_INDEXES, CREATE_TRANSACTIONS_TABLE, DATABASE_VERSION } from './schema';

const timestamp = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

async function columnsFor(database: SQLiteDatabase, table: string): Promise<string[]> {
  const rows = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((row) => row.name);
}

async function tableExists(database: SQLiteDatabase, table: string): Promise<boolean> {
  return Boolean(await database.getFirstAsync('SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?', 'table', table));
}

/** Converts the short-lived pre-migration prototype schema without losing its rows. */
async function migratePrototypeSchema(database: SQLiteDatabase): Promise<void> {
  const expectedColumns: Record<string, string> = { accounts: 'opening_balance', categories: 'is_default', transactions: 'account_id', budgets: 'category_id' };
  const legacyTables: string[] = [];
  for (const [table, expectedColumn] of Object.entries(expectedColumns)) {
    if (await tableExists(database, table) && !(await columnsFor(database, table)).includes(expectedColumn)) legacyTables.push(table);
  }
  if (legacyTables.length === 0) return;

  await database.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    for (const table of legacyTables) await database.execAsync(`ALTER TABLE ${table} RENAME TO ${table}_legacy_v0;`);
    await database.execAsync(`${CREATE_ACCOUNTS_TABLE}${CREATE_CATEGORIES_TABLE}${CREATE_TRANSACTIONS_TABLE}${CREATE_BUDGETS_TABLE}${CREATE_INDEXES}`);

    if (legacyTables.includes('accounts')) await database.execAsync(`
      INSERT OR IGNORE INTO accounts (id, name, type, currency, opening_balance, is_active, created_at, updated_at)
      SELECT id, name, type, COALESCE(currency, 'PKR'), COALESCE(balance, 0), 1, COALESCE(createdAt, ${timestamp}), COALESCE(createdAt, ${timestamp}) FROM accounts_legacy_v0;
    `);
    if (legacyTables.includes('categories')) await database.execAsync(`
      INSERT OR IGNORE INTO categories (id, name, type, icon, is_default, created_at, updated_at)
      SELECT id, name, type, icon, CASE WHEN COALESCE(isCustom, 0) = 0 THEN 1 ELSE 0 END, ${timestamp}, ${timestamp} FROM categories_legacy_v0 WHERE type IN ('expense', 'income');
    `);
    if (legacyTables.includes('transactions')) await database.execAsync(`
      INSERT OR IGNORE INTO categories (id, name, type, icon, is_default, created_at, updated_at)
      SELECT 'legacy-category-' || lower(replace(category, ' ', '-')), category, type, NULL, 0, ${timestamp}, ${timestamp} FROM transactions_legacy_v0 WHERE type IN ('expense', 'income');
      INSERT OR IGNORE INTO transactions (id, type, amount, account_id, category_id, date, note, created_at, updated_at, deleted_at)
      SELECT t.id, t.type, t.amount, t.accountId,
             COALESCE((SELECT c.id FROM categories c WHERE c.id = t.category), (SELECT c.id FROM categories c WHERE lower(c.name) = lower(t.category) AND c.type = t.type), 'legacy-category-' || lower(replace(t.category, ' ', '-'))),
             t.date, t.notes, COALESCE(t.createdAt, ${timestamp}), COALESCE(t.updatedAt, t.createdAt, ${timestamp}), NULL
      FROM transactions_legacy_v0 t WHERE t.type IN ('expense', 'income') AND EXISTS (SELECT 1 FROM accounts a WHERE a.id = t.accountId);
    `);
    if (legacyTables.includes('budgets')) await database.execAsync(`
      INSERT OR IGNORE INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at)
      SELECT b.id, COALESCE((SELECT c.id FROM categories c WHERE c.id = b.categoryId), b.categoryId), b.limitAmount, b.period, b.startDate, b.endDate, ${timestamp}, ${timestamp}
      FROM budgets_legacy_v0 b WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = b.categoryId);
    `);
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON;');
  }
}

export async function runMigrations(database: SQLiteDatabase): Promise<void> {
  const version = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = version?.user_version ?? 0;
  if (currentVersion < 1) {
    await migratePrototypeSchema(database);
    await database.execAsync(`${CREATE_ACCOUNTS_TABLE}${CREATE_CATEGORIES_TABLE}${CREATE_TRANSACTIONS_TABLE}${CREATE_BUDGETS_TABLE}${CREATE_INDEXES}`);
    currentVersion = 1;
  }
  if (currentVersion < 2 && await tableExists(database, 'transactions')) {
    const transactionColumns = await columnsFor(database, 'transactions');
    if (transactionColumns.includes('sync_status')) {
      await database.execAsync('ALTER TABLE transactions DROP COLUMN sync_status;');
    }
    if (await tableExists(database, 'sync_queue')) {
      await database.execAsync('DROP TABLE sync_queue;');
    }
    currentVersion = 2;
  }
  if (currentVersion > DATABASE_VERSION) throw new Error(`Database version ${currentVersion} is newer than this app supports.`);
  await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
