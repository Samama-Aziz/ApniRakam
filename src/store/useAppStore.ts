import { create } from 'zustand';

export interface AppState {
  isOnboarded: boolean;
  userName: string;
  currency: string;
  currencySymbol: string;
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;

  // Actions
  setOnboarded: (value: boolean) => void;
  setUserName: (name: string) => void;
  setCurrency: (currency: string, symbol: string) => void;
  updateFinancialSummary: (summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
  }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnboarded: false,
  userName: 'User',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  totalBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,

  setOnboarded: (value: boolean) => set({ isOnboarded: value }),
  setUserName: (name: string) => set({ userName: name }),
  setCurrency: (currency: string, symbol: string) =>
    set({ currency, currencySymbol: symbol }),
  updateFinancialSummary: (summary) =>
    set({
      totalBalance: summary.totalBalance,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
    }),
}));
