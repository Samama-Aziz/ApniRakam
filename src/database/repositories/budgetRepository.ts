import { getDatabase } from '../database';
import { createId, now, type BudgetRecord } from './types';

export type CreateBudgetInput = Pick<BudgetRecord, 'category_id' | 'amount' | 'period' | 'start_date' | 'end_date'>;
export type UpdateBudgetInput = Partial<CreateBudgetInput>;
export const budgetRepository = {
  async create(input: CreateBudgetInput): Promise<BudgetRecord> { const timestamp = now(); const record: BudgetRecord = { id: createId(), ...input, created_at: timestamp, updated_at: timestamp }; const db = await getDatabase(); await db.runAsync('INSERT INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', Object.values(record)); return record; },
  async getAll(): Promise<BudgetRecord[]> { const db = await getDatabase(); return db.getAllAsync<BudgetRecord>('SELECT * FROM budgets ORDER BY start_date DESC'); },
  async getById(id: string): Promise<BudgetRecord | null> { const db = await getDatabase(); return (await db.getFirstAsync<BudgetRecord>('SELECT * FROM budgets WHERE id = ?', id)) ?? null; },
  async update(id: string, input: UpdateBudgetInput): Promise<BudgetRecord | null> { const current = await this.getById(id); if (!current) return null; const next = { ...current, ...input, updated_at: now() }; const db = await getDatabase(); await db.runAsync('UPDATE budgets SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?', next.category_id, next.amount, next.period, next.start_date, next.end_date, next.updated_at, id); return next; },
  async delete(id: string): Promise<boolean> { const db = await getDatabase(); const result = await db.runAsync('DELETE FROM budgets WHERE id = ?', id); return result.changes > 0; },
};
