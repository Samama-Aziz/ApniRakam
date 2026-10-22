export type TransactionType = 'expense' | 'income' | 'transfer';
export type CategoryType = 'expense' | 'income';

export interface AccountRecord { id: string; name: string; type: string; currency: string; opening_balance: number; is_active: number; created_at: string; updated_at: string; }
export interface CategoryRecord { id: string; name: string; type: CategoryType; icon: string | null; color?: string | null; is_default: number; created_at: string; updated_at: string; }
export interface TransactionRecord { id: string; type: TransactionType; amount: number; account_id: string; to_account_id?: string | null; category_id?: string | null; date: string; note: string | null; created_at: string; updated_at: string; deleted_at: string | null; }
export interface BudgetRecord { id: string; category_id: string; amount: number; period: string; start_date: string; end_date: string; created_at: string; updated_at: string; }

export type LoanType = 'lent' | 'borrowed';
export type LoanStatus = 'pending' | 'partially_paid' | 'paid';

export interface LoanRecord {
  id: string;
  type: LoanType;
  person_name: string;
  amount: number;
  paid_amount: number;
  account_id: string;
  status: LoanStatus;
  date: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LoanRepaymentRecord {
  id: string;
  loan_id: string;
  amount: number;
  account_id: string;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export const now = () => new Date().toISOString();
export function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}
