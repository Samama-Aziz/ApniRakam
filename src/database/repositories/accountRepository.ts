import { getDatabase } from '../database';
import { createId, now, type AccountRecord } from './types';

export type CreateAccountInput = Pick<AccountRecord, 'name' | 'type'> & Partial<Pick<AccountRecord, 'currency' | 'opening_balance'>>;
export type UpdateAccountInput = Partial<Pick<AccountRecord, 'name' | 'type' | 'currency' | 'opening_balance' | 'is_active'>>;

export const accountRepository = {
  async create(input: CreateAccountInput): Promise<AccountRecord> {
    const record: AccountRecord = { id: createId(), name: input.name.trim(), type: input.type, currency: input.currency ?? 'PKR', opening_balance: input.opening_balance ?? 0, is_active: 1, created_at: now(), updated_at: now() };
    const db = await getDatabase();
    await db.runAsync('INSERT INTO accounts (id, name, type, currency, opening_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', Object.values(record));
    return record;
  },
  async getAll(includeInactive = false): Promise<AccountRecord[]> { const db = await getDatabase(); return db.getAllAsync<AccountRecord>(`SELECT * FROM accounts ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name COLLATE NOCASE`); },
  async getById(id: string): Promise<AccountRecord | null> { const db = await getDatabase(); return (await db.getFirstAsync<AccountRecord>('SELECT * FROM accounts WHERE id = ?', id)) ?? null; },
  async update(id: string, input: UpdateAccountInput): Promise<AccountRecord | null> {
    const current = await this.getById(id); if (!current) return null;
    const next = { ...current, ...input, updated_at: now() }; const db = await getDatabase();
    await db.runAsync('UPDATE accounts SET name = ?, type = ?, currency = ?, opening_balance = ?, is_active = ?, updated_at = ? WHERE id = ?', next.name, next.type, next.currency, next.opening_balance, next.is_active, next.updated_at, id); return next;
  },
  async delete(id: string): Promise<boolean> { const db = await getDatabase(); const result = await db.runAsync('UPDATE accounts SET is_active = 0, updated_at = ? WHERE id = ?', now(), id); return result.changes > 0; },
};
