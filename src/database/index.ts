import { getDatabase } from './database';
import { runMigrations } from './migrations';
import { DEFAULT_CATEGORIES } from './schema';

let initializationPromise: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (!initializationPromise) initializationPromise = initialize();
  return initializationPromise;
}



async function initialize(): Promise<void> {
  const db = await getDatabase();
  await runMigrations(db);
  const seededAt = new Date().toISOString();

  // Seed default categories
  for (const category of DEFAULT_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      `default-${category.type}-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category.name, category.type, null, seededAt, seededAt,
    );
  }

  console.log('[Database] Ready.');
}

export async function restoreDefaults(): Promise<void> {
  const db = await getDatabase();
  const seededAt = new Date().toISOString();

  for (const category of DEFAULT_CATEGORIES) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      `default-${category.type}-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category.name, category.type, null, seededAt, seededAt,
    );
  }


}

export default {
  getDatabase,
  initDatabase,
  restoreDefaults,
};

export { accountRepository } from './repositories/accountRepository';
export { budgetRepository } from './repositories/budgetRepository';
export { categoryRepository } from './repositories/categoryRepository';
export { transactionRepository } from './repositories/transactionRepository';
