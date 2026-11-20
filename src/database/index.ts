import { getDatabase } from './database';
import { runMigrations } from './migrations';
import { DEFAULT_CATEGORIES } from './schema';
import { getCategoryMeta } from '@/utils/categoryMeta';

let initializationPromise: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (!initializationPromise) initializationPromise = initialize();
  return initializationPromise;
}

async function initialize(): Promise<void> {
  const db = await getDatabase();
  await runMigrations(db);
  const seededAt = new Date().toISOString();

  // Seed default categories with distinct colors and icons
  for (const category of DEFAULT_CATEGORIES) {
    const meta = getCategoryMeta(category.name);
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      `default-${category.type}-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category.name, category.type, meta.icon, meta.color, seededAt, seededAt,
    );
  }

  // Backfill color & icon for any existing categories where color or icon is null
  try {
    const nullCats = await db.getAllAsync<{ id: string; name: string; color: string | null; icon: string | null }>(
      'SELECT id, name, color, icon FROM categories WHERE color IS NULL OR icon IS NULL'
    );
    for (const c of nullCats) {
      const meta = getCategoryMeta(c.name);
      await db.runAsync(
        'UPDATE categories SET color = COALESCE(color, ?), icon = COALESCE(icon, ?) WHERE id = ?',
        meta.color,
        meta.icon,
        c.id
      );
    }
  } catch (e) {
    console.warn('[Database] Category color backfill notice:', e);
  }

  console.log('[Database] Ready.');
}

export async function restoreDefaults(): Promise<void> {
  const db = await getDatabase();
  const seededAt = new Date().toISOString();

  for (const category of DEFAULT_CATEGORIES) {
    const meta = getCategoryMeta(category.name);
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      `default-${category.type}-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category.name, category.type, meta.icon, meta.color, seededAt, seededAt,
    );
  }
}

export default {
  getDatabase,
  initDatabase,
  restoreDefaults,
};

export { getDatabase } from './database';
export { accountRepository } from './repositories/accountRepository';
export { budgetRepository } from './repositories/budgetRepository';
export { categoryRepository } from './repositories/categoryRepository';
export { transactionRepository } from './repositories/transactionRepository';
export { loanRepository } from './repositories/loanRepository';

