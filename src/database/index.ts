import * as SQLite from 'expo-sqlite';
import {
  DB_NAME,
  CREATE_ACCOUNTS_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_BUDGETS_TABLE,
} from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execAsync(`
      ${CREATE_ACCOUNTS_TABLE}
      ${CREATE_CATEGORIES_TABLE}
      ${CREATE_TRANSACTIONS_TABLE}
      ${CREATE_BUDGETS_TABLE}
    `);
    console.log('[Database] Tables initialized successfully.');
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
  }
}

export default {
  getDatabase,
  initDatabase,
};
