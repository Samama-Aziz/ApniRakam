export type TransactionType = 'income' | 'expense' | 'transfer' | 'loan';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  toAccountId?: string;
  date: string; // ISO string
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wallet' | 'savings' | 'credit';
  balance: number;
  currency: string;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  limitAmount: number;
  spentAmount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate: string;
  endDate: string;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  currency: string;
  currencySymbol: string;
}
