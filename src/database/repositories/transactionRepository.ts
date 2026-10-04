import { getDatabase } from '../database';
import { createId, now, type TransactionRecord } from './types';

export type CreateTransactionInput = Pick<TransactionRecord, 'type' | 'amount' | 'account_id' | 'category_id' | 'date'> & Partial<Pick<TransactionRecord, 'note'>>;
export type UpdateTransactionInput = Partial<Pick<TransactionRecord, 'type' | 'amount' | 'account_id' | 'category_id' | 'date' | 'note'>>;
const active = 'deleted_at IS NULL';

export const transactionRepository = {
  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const timestamp = now(); const record: TransactionRecord = { id: createId(), type: input.type, amount: input.amount, account_id: input.account_id, category_id: input.category_id, date: input.date, note: input.note ?? null, created_at: timestamp, updated_at: timestamp, deleted_at: null };
    const db = await getDatabase(); await db.runAsync('INSERT INTO transactions (id, type, amount, account_id, category_id, date, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Object.values(record)); return record;
  },
  async getById(id: string, includeDeleted = false): Promise<TransactionRecord | null> { const db = await getDatabase(); return (await db.getFirstAsync<TransactionRecord>(`SELECT * FROM transactions WHERE id = ? ${includeDeleted ? '' : `AND ${active}`}`, id)) ?? null; },
  async getAll(): Promise<TransactionRecord[]> { const db = await getDatabase(); return db.getAllAsync<TransactionRecord>(`SELECT * FROM transactions WHERE ${active} ORDER BY date DESC, created_at DESC`); },
  async update(id: string, input: UpdateTransactionInput): Promise<TransactionRecord | null> { const current = await this.getById(id); if (!current) return null; const next = { ...current, ...input, updated_at: now() }; const db = await getDatabase(); await db.runAsync('UPDATE transactions SET type = ?, amount = ?, account_id = ?, category_id = ?, date = ?, note = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', next.type, next.amount, next.account_id, next.category_id, next.date, next.note, next.updated_at, id); return next; },
  /** Soft delete preserves the UUID and creates a syncable deletion event. */
  async delete(id: string): Promise<boolean> { const timestamp = now(); const db = await getDatabase(); const result = await db.runAsync('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', timestamp, timestamp, id); return result.changes > 0; },
  async getByDateRange(startDate: string, endDate: string): Promise<TransactionRecord[]> { const db = await getDatabase(); return db.getAllAsync<TransactionRecord>(`SELECT * FROM transactions WHERE ${active} AND date >= ? AND date <= ? ORDER BY date DESC, created_at DESC`, startDate, endDate); },
  async getByCategory(categoryId: string): Promise<TransactionRecord[]> { const db = await getDatabase(); return db.getAllAsync<TransactionRecord>(`SELECT * FROM transactions WHERE ${active} AND category_id = ? ORDER BY date DESC, created_at DESC`, categoryId); },
  async getByAccount(accountId: string): Promise<TransactionRecord[]> { const db = await getDatabase(); return db.getAllAsync<TransactionRecord>(`SELECT * FROM transactions WHERE ${active} AND account_id = ? ORDER BY date DESC, created_at DESC`, accountId); },
};
