import { create } from 'zustand';
import { setSecureItem, getSecureItem, STORAGE_KEYS } from '@/services/storage';
import {
  accountRepository,
  transactionRepository,
  budgetRepository,
  categoryRepository,
} from '@/database';
import type { AccountRecord, TransactionRecord, BudgetRecord, CategoryRecord } from '@/database/repositories/types';

// ─── State ────────────────────────────────────────────────────────────────────

export interface AppState {
  // Onboarding / user prefs (persisted to secure-store)
  isOnboarded: boolean;
  userName: string;
  currency: string;
  currencySymbol: string;
  defaultCategoryId: string;
  defaultAccountId: string;
  defaultBudgetPeriod: 'monthly' | 'weekly' | 'custom';
  themeMode: 'system' | 'light' | 'dark';

  // Live data lists (loaded from SQLite)
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  budgets: BudgetRecord[];
  categories: CategoryRecord[];

  // Derived financial summary (recomputed from transactions)
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;

  // Loading / hydration state
  isLoadingData: boolean;
  isHydrated: boolean; // true once secure-store prefs have been loaded

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Load persisted prefs from secure-store on app startup. */
  hydrateFromStorage: () => Promise<void>;

  /** Mark user as onboarded (persists to secure-store). */
  setOnboarded: (value: boolean) => Promise<void>;

  /** Set user name (persists to secure-store). */
  setUserName: (name: string) => Promise<void>;

  /** Set currency + symbol (persists to secure-store). */
  setCurrency: (currency: string, symbol: string) => Promise<void>;

  /** Set the default category for new transactions (persists to secure-store). */
  setDefaultCategory: (categoryId: string) => Promise<void>;

  /** Set the default account for new transactions (persists to secure-store). */
  setDefaultAccount: (accountId: string) => Promise<void>;

  /** Set the default budget period (persists to secure-store). */
  setDefaultBudgetPeriod: (period: 'monthly' | 'weekly' | 'custom') => Promise<void>;

  /** Set the theme mode (persists to secure-store). */
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;

  /** Reload all data lists from SQLite and recompute summary totals. */
  loadAppData: () => Promise<void>;

  /** Optimistically prepend a transaction to the in-memory list. */
  addTransactionToStore: (tx: TransactionRecord) => void;

  /** Update an existing transaction in the in-memory list. */
  updateTransactionInStore: (tx: TransactionRecord) => void;

  /** Remove a transaction from the in-memory list after delete. */
  removeTransactionFromStore: (id: string) => void;

  /** Append a newly created account to the in-memory list. */
  addAccountToStore: (account: AccountRecord) => void;

  /** Update an existing account in the in-memory list. */
  updateAccountInStore: (account: AccountRecord) => void;

  /** Remove an account from the in-memory list. */
  removeAccountFromStore: (id: string) => void;

  /** Append a newly created category to the in-memory list. */
  addCategoryToStore: (category: CategoryRecord) => void;

  /** Remove a category from the in-memory list. */
  removeCategoryFromStore: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSummary(transactions: TransactionRecord[]) {
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of transactions) {
    if (tx.deleted_at) continue;
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpenses += tx.amount;
  }
  return { totalIncome, totalExpenses, totalBalance: totalIncome - totalExpenses };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // Defaults
  isOnboarded: false,
  userName: '',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  defaultCategoryId: '',
  defaultAccountId: '',
  defaultBudgetPeriod: 'monthly' as const,
  themeMode: 'system' as const,
  accounts: [],
  transactions: [],
  budgets: [],
  categories: [],
  totalBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  isLoadingData: false,
  isHydrated: false,

  // Hydrate prefs from secure-store ─────────────────────────────────────────
  hydrateFromStorage: async () => {
    try {
      const [onboarded, profile, defaultCategory, defaultAccount, defaultBudgetPeriod, themeMode] = await Promise.all([
        getSecureItem(STORAGE_KEYS.HAS_ONBOARDED),
        getSecureItem(STORAGE_KEYS.USER_PROFILE),
        getSecureItem(STORAGE_KEYS.DEFAULT_CATEGORY),
        getSecureItem(STORAGE_KEYS.DEFAULT_ACCOUNT),
        getSecureItem(STORAGE_KEYS.DEFAULT_BUDGET_PERIOD),
        getSecureItem(STORAGE_KEYS.THEME_MODE),
      ]);
      const isOnboarded = onboarded === 'true';
      let userName = '';
      let currency = 'PKR';
      let currencySymbol = 'Rs.';
      if (profile) {
        try {
          const parsed = JSON.parse(profile) as { userName?: string; currency?: string; currencySymbol?: string };
          userName = parsed.userName ?? '';
          currency = parsed.currency ?? 'PKR';
          currencySymbol = parsed.currencySymbol ?? 'Rs.';
        } catch { /* ignore parse errors */ }
      }
      set({
        isOnboarded,
        userName,
        currency,
        currencySymbol,
        defaultCategoryId: defaultCategory ?? '',
        defaultAccountId: defaultAccount ?? '',
        defaultBudgetPeriod: (defaultBudgetPeriod as 'monthly' | 'weekly' | 'custom') ?? 'monthly',
        themeMode: (themeMode as 'system' | 'light' | 'dark') ?? 'system',
        isHydrated: true,
      });
    } catch (e) {
      console.warn('[Store] hydrateFromStorage failed:', e);
      set({ isHydrated: true });
    }
  },

  // Persist helpers ─────────────────────────────────────────────────────────
  setOnboarded: async (value: boolean) => {
    set({ isOnboarded: value });
    await setSecureItem(STORAGE_KEYS.HAS_ONBOARDED, String(value));
  },

  setUserName: async (name: string) => {
    set({ userName: name });
    const { currency, currencySymbol } = get();
    await setSecureItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ userName: name, currency, currencySymbol }));
  },

  setCurrency: async (currency: string, symbol: string) => {
    set({ currency, currencySymbol: symbol });
    const { userName } = get();
    await setSecureItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ userName, currency, currencySymbol: symbol }));
  },

  setDefaultCategory: async (categoryId: string) => {
    set({ defaultCategoryId: categoryId });
    await setSecureItem(STORAGE_KEYS.DEFAULT_CATEGORY, categoryId);
  },

  setDefaultAccount: async (accountId: string) => {
    set({ defaultAccountId: accountId });
    await setSecureItem(STORAGE_KEYS.DEFAULT_ACCOUNT, accountId);
  },

  setDefaultBudgetPeriod: async (period: 'monthly' | 'weekly' | 'custom') => {
    set({ defaultBudgetPeriod: period });
    await setSecureItem(STORAGE_KEYS.DEFAULT_BUDGET_PERIOD, period);
  },

  setThemeMode: async (mode: 'system' | 'light' | 'dark') => {
    set({ themeMode: mode });
    await setSecureItem(STORAGE_KEYS.THEME_MODE, mode);
  },

  // Load all data from SQLite ───────────────────────────────────────────────
  loadAppData: async () => {
    set({ isLoadingData: true });
    try {
      const [accounts, transactions, budgets, categories] = await Promise.all([
        accountRepository.getAll(),
        transactionRepository.getAll(),
        budgetRepository.getAll(),
        categoryRepository.getAll(),
      ]);
      const summary = computeSummary(transactions);
      set({ accounts, transactions, budgets, categories, ...summary, isLoadingData: false });
    } catch (e) {
      console.error('[Store] loadAppData failed:', e);
      set({ isLoadingData: false });
    }
  },

  // Optimistic local mutations ───────────────────────────────────────────────
  addTransactionToStore: (tx: TransactionRecord) => {
    const next = [tx, ...get().transactions];
    set({ transactions: next, ...computeSummary(next) });
  },

  updateTransactionInStore: (tx: TransactionRecord) => {
    const next = get().transactions.map((t) => (t.id === tx.id ? tx : t));
    set({ transactions: next, ...computeSummary(next) });
  },

  removeTransactionFromStore: (id: string) => {
    const next = get().transactions.filter((t) => t.id !== id);
    set({ transactions: next, ...computeSummary(next) });
  },

  addAccountToStore: (account: AccountRecord) => {
    set({ accounts: [account, ...get().accounts] });
  },

  updateAccountInStore: (account: AccountRecord) => {
    set({
      accounts: get().accounts.map((a) => (a.id === account.id ? account : a)),
    });
  },

  removeAccountFromStore: (id: string) => {
    set({ accounts: get().accounts.filter((a) => a.id !== id) });
  },

  addCategoryToStore: (category: CategoryRecord) => {
    set({ categories: [...get().categories, category] });
  },

  removeCategoryFromStore: (id: string) => {
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },
}));

