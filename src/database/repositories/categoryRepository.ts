import { getDatabase } from '../database';
import { createId, now, type CategoryRecord, type CategoryType } from './types';

export type CreateCategoryInput = Pick<CategoryRecord, 'name' | 'type'> & Partial<Pick<CategoryRecord, 'icon' | 'is_default'>>;
export type UpdateCategoryInput = Partial<Pick<CategoryRecord, 'name' | 'type' | 'icon' | 'is_default'>>;
export const categoryRepository = {
  async create(input: CreateCategoryInput): Promise<CategoryRecord> { const timestamp = now(); const record: CategoryRecord = { id: createId(), name: input.name.trim(), type: input.type, icon: input.icon ?? null, is_default: input.is_default ?? 0, created_at: timestamp, updated_at: timestamp }; const db = await getDatabase(); await db.runAsync('INSERT INTO categories (id, name, type, icon, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', Object.values(record)); return record; },
  async getAll(): Promise<CategoryRecord[]> { const db = await getDatabase(); return db.getAllAsync<CategoryRecord>('SELECT * FROM categories ORDER BY type, name COLLATE NOCASE'); },
  async getByType(type: CategoryType): Promise<CategoryRecord[]> { const db = await getDatabase(); return db.getAllAsync<CategoryRecord>('SELECT * FROM categories WHERE type = ? ORDER BY name COLLATE NOCASE', type); },
  async getById(id: string): Promise<CategoryRecord | null> { const db = await getDatabase(); return (await db.getFirstAsync<CategoryRecord>('SELECT * FROM categories WHERE id = ?', id)) ?? null; },
  async update(id: string, input: UpdateCategoryInput): Promise<CategoryRecord | null> { const current = await this.getById(id); if (!current) return null; const next = { ...current, ...input, updated_at: now() }; const db = await getDatabase(); await db.runAsync('UPDATE categories SET name = ?, type = ?, icon = ?, is_default = ?, updated_at = ? WHERE id = ?', next.name, next.type, next.icon, next.is_default, next.updated_at, id); return next; },
  async delete(id: string): Promise<boolean> { const db = await getDatabase(); const result = await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', id); return result.changes > 0; },
};
