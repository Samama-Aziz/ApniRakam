import { create } from 'zustand';
import { Appearance, Platform } from 'react-native';
import { setSecureItem, getSecureItem, STORAGE_KEYS } from '@/services/storage';
import {
  accountRepository,
  transactionRepository,
  budgetRepository,
  categoryRepository,
  loanRepository,
} from '@/database';
import type {
  AccountRecord,
  TransactionRecord,
  BudgetRecord,
  CategoryRecord,
  LoanRecord,
  LoanRepaymentRecord,
} from '@/database/repositories/types';

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
  loans: LoanRecord[];
  loanRepayments: LoanRepaymentRecord[];

  // Derived financial summary
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

  /** Update an existing category in the in-memory list. */
  updateCategoryInStore: (category: CategoryRecord) => void;

  /** Remove a category from the in-memory list. */
  removeCategoryFromStore: (id: string) => void;

  /** Append a newly created loan to the in-memory list. */
  addLoanToStore: (loan: LoanRecord) => void;

  /** Update an existing loan in the in-memory list. */
  updateLoanInStore: (loan: LoanRecord) => void;

  /** Remove a loan from the in-memory list. */
  removeLoanFromStore: (id: string) => void;

  /** Add a loan repayment to the in-memory store. */
  addRepaymentToStore: (repayment: LoanRepaymentRecord, updatedLoan: LoanRecord) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSummary(
  accounts: AccountRecord[],
  transactions: TransactionRecord[],
  loans: LoanRecord[] = [],
  repayments: LoanRepaymentRecord[] = []
) {
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of transactions) {
    if (tx.deleted_at) continue;
    if (tx.type === 'income') totalIncome += tx.amount;
    else if (tx.type === 'expense') totalExpenses += tx.amount;
  }

  let totalBalance = accounts.reduce((acc, a) => acc + (a.opening_balance || 0), 0);
  totalBalance += (totalIncome - totalExpenses);

  // Adjust for active loans
  for (const loan of loans) {
    if (loan.deleted_at) continue;
    if (loan.type === 'lent') {
      // Money left my account
      totalBalance -= loan.amount;
    } else if (loan.type === 'borrowed') {
      // Money entered my account
      totalBalance += loan.amount;
    }
  }

  // Adjust for repayments
  const loanMap: Record<string, LoanRecord> = {};
  for (const l of loans) loanMap[l.id] = l;

  for (const rep of repayments) {
    const loan = loanMap[rep.loan_id];
    if (!loan || loan.deleted_at) continue;
    if (loan.type === 'lent') {
      // Borrower paid me back -> my available money increases
      totalBalance += rep.amount;
    } else if (loan.type === 'borrowed') {
      // I repaid the lender -> my available money decreases
      totalBalance -= rep.amount;
    }
  }

  return { totalIncome, totalExpenses, totalBalance };
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
  loans: [],
  loanRepayments: [],
  totalBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  isLoadingData: false,
  isHydrated: false,

  // Hydrate prefs from secure-store ─────────────────────────────────────────
  hydrateFromStorage: async () => {
    try {
      const [
        onboarded,
        profile,
        defaultCategory,
        defaultAccount,
        defaultBudgetPeriod,
        themeMode,
        savedCurrency,
        savedCurrencySymbol,
      ] = await Promise.all([
        getSecureItem(STORAGE_KEYS.HAS_ONBOARDED),
        getSecureItem(STORAGE_KEYS.USER_PROFILE),
        getSecureItem(STORAGE_KEYS.DEFAULT_CATEGORY),
        getSecureItem(STORAGE_KEYS.DEFAULT_ACCOUNT),
        getSecureItem(STORAGE_KEYS.DEFAULT_BUDGET_PERIOD),
        getSecureItem(STORAGE_KEYS.THEME_MODE),
        getSecureItem(STORAGE_KEYS.CURRENCY),
        getSecureItem(STORAGE_KEYS.CURRENCY_SYMBOL),
      ]);
      const isOnboarded = onboarded === 'true';
      let userName = '';
      let currency = savedCurrency || 'PKR';
      let currencySymbol = savedCurrencySymbol || 'Rs.';
      if (profile) {
        try {
          const parsed = JSON.parse(profile) as { userName?: string; currency?: string; currencySymbol?: string };
          userName = parsed.userName ?? '';
          if (!savedCurrency && parsed.currency) {
            currency = parsed.currency;
          }
          if (!savedCurrencySymbol && parsed.currencySymbol) {
            currencySymbol = parsed.currencySymbol;
          }
        } catch { /* ignore parse errors */ }
      }
      const resolvedThemeMode = (themeMode as 'system' | 'light' | 'dark') ?? 'system';
      if (Platform.OS !== 'web') {
        try {
          Appearance.setColorScheme(resolvedThemeMode === 'system' ? 'unspecified' : resolvedThemeMode);
        } catch {}
      }
      set({
        isOnboarded,
        userName,
        currency,
        currencySymbol,
        defaultCategoryId: defaultCategory ?? '',
        defaultAccountId: defaultAccount ?? '',
        defaultBudgetPeriod: (defaultBudgetPeriod as 'monthly' | 'weekly' | 'custom') ?? 'monthly',
        themeMode: resolvedThemeMode,
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
    await Promise.all([
      setSecureItem(STORAGE_KEYS.CURRENCY, currency),
      setSecureItem(STORAGE_KEYS.CURRENCY_SYMBOL, symbol),
      setSecureItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ userName, currency, currencySymbol: symbol })),
    ]);
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
    if (Platform.OS !== 'web') {
      try {
        Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
      } catch {}
    }
    await setSecureItem(STORAGE_KEYS.THEME_MODE, mode);
  },

  // Load all data from SQLite ───────────────────────────────────────────────
  loadAppData: async () => {
    set({ isLoadingData: true });
    try {
      const [accounts, transactions, budgets, categories, loans, loanRepayments] = await Promise.all([
        accountRepository.getAll(),
        transactionRepository.getAll(),
        budgetRepository.getAll(),
        categoryRepository.getAll(),
        loanRepository.getAll(),
        loanRepository.getAllRepayments(),
      ]);
      const summary = computeSummary(accounts, transactions, loans, loanRepayments);
      set({
        accounts,
        transactions,
        budgets,
        categories,
        loans,
        loanRepayments,
        ...summary,
        isLoadingData: false,
      });
    } catch (e) {
      console.error('[Store] loadAppData failed:', e);
      set({ isLoadingData: false });
    }
  },

  // Optimistic local mutations ───────────────────────────────────────────────
  addTransactionToStore: (tx: TransactionRecord) => {
    const next = [tx, ...get().transactions];
    const summary = computeSummary(get().accounts, next, get().loans, get().loanRepayments);
    set({ transactions: next, ...summary });
  },

  updateTransactionInStore: (tx: TransactionRecord) => {
    const next = get().transactions.map((t) => (t.id === tx.id ? tx : t));
    const summary = computeSummary(get().accounts, next, get().loans, get().loanRepayments);
    set({ transactions: next, ...summary });
  },

  removeTransactionFromStore: (id: string) => {
    const next = get().transactions.filter((t) => t.id !== id);
    const summary = computeSummary(get().accounts, next, get().loans, get().loanRepayments);
    set({ transactions: next, ...summary });
  },

  addAccountToStore: (account: AccountRecord) => {
    const next = [account, ...get().accounts];
    const summary = computeSummary(next, get().transactions, get().loans, get().loanRepayments);
    set({ accounts: next, ...summary });
  },

  updateAccountInStore: (account: AccountRecord) => {
    const next = get().accounts.map((a) => (a.id === account.id ? account : a));
    const summary = computeSummary(next, get().transactions, get().loans, get().loanRepayments);
    set({ accounts: next, ...summary });
  },

  removeAccountFromStore: (id: string) => {
    const next = get().accounts.filter((a) => a.id !== id);
    const summary = computeSummary(next, get().transactions, get().loans, get().loanRepayments);
    set({ accounts: next, ...summary });
  },

  addCategoryToStore: (category: CategoryRecord) => {
    set({ categories: [...get().categories, category] });
  },

  updateCategoryInStore: (category: CategoryRecord) => {
    set({
      categories: get().categories.map((c) => (c.id === category.id ? category : c)),
    });
  },

  removeCategoryFromStore: (id: string) => {
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },

  addLoanToStore: (loan: LoanRecord) => {
    const nextLoans = [loan, ...get().loans];
    const summary = computeSummary(get().accounts, get().transactions, nextLoans, get().loanRepayments);
    set({ loans: nextLoans, ...summary });
  },

  updateLoanInStore: (loan: LoanRecord) => {
    const nextLoans = get().loans.map((l) => (l.id === loan.id ? loan : l));
    const summary = computeSummary(get().accounts, get().transactions, nextLoans, get().loanRepayments);
    set({ loans: nextLoans, ...summary });
  },

  removeLoanFromStore: (id: string) => {
    const nextLoans = get().loans.filter((l) => l.id !== id);
    const summary = computeSummary(get().accounts, get().transactions, nextLoans, get().loanRepayments);
    set({ loans: nextLoans, ...summary });
  },

  addRepaymentToStore: (repayment: LoanRepaymentRecord, updatedLoan: LoanRecord) => {
    const nextRepayments = [repayment, ...get().loanRepayments];
    const nextLoans = get().loans.map((l) => (l.id === updatedLoan.id ? updatedLoan : l));
    const summary = computeSummary(get().accounts, get().transactions, nextLoans, nextRepayments);
    set({ loans: nextLoans, loanRepayments: nextRepayments, ...summary });
  },
}));

