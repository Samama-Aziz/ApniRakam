import { Platform, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import {
  getDatabase,
  accountRepository,
  categoryRepository,
  transactionRepository,
  budgetRepository,
  loanRepository,
} from '@/database';
import { createId, now } from '@/database/repositories/types';
import type {
  AccountRecord,
  CategoryRecord,
  TransactionRecord,
  BudgetRecord,
  LoanRecord,
  LoanRepaymentRecord,
} from '@/database/repositories/types';
import { useAppStore } from '@/store/useAppStore';
import { getCategoryMeta } from '@/utils/categoryMeta';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BackupMetadata {
  accountsCount: number;
  categoriesCount: number;
  transactionsCount: number;
  budgetsCount: number;
  loansCount: number;
  repaymentsCount: number;
}

export interface BackupPreferences {
  userName?: string;
  currency?: string;
  currencySymbol?: string;
  defaultCategoryId?: string;
  defaultAccountId?: string;
  defaultBudgetPeriod?: 'monthly' | 'weekly' | 'custom';
  themeMode?: 'system' | 'light' | 'dark';
}

export interface BackupData {
  accounts: AccountRecord[];
  categories: CategoryRecord[];
  transactions: TransactionRecord[];
  budgets: BudgetRecord[];
  loans: LoanRecord[];
  loan_repayments: LoanRepaymentRecord[];
}

export interface BackupPayload {
  app: 'ApniRakam';
  version: number;
  exported_at: string;
  metadata: BackupMetadata;
  preferences?: BackupPreferences;
  data: BackupData;
}

export interface ImportResult {
  success: boolean;
  importedCounts: {
    accounts: number;
    categories: number;
    transactions: number;
    budgets: number;
    loans: number;
    repayments: number;
  };
  skippedDuplicates: number;
  error?: string;
}

export interface ParsedCSVRow {
  date: string;
  type: 'expense' | 'income' | 'transfer';
  categoryName: string;
  accountName: string;
  toAccountName: string;
  amount: number;
  note: string;
}

export interface CSVImportResult {
  success: boolean;
  importedCount: number;
  skippedDuplicates: number;
  createdAccounts: number;
  createdCategories: number;
  error?: string;
}

// ─── Sample CSV Template Content ──────────────────────────────────────────────

export const SAMPLE_CSV_CONTENT = `Date,Type,Category,Account,To Account,Amount,Note
2026-10-20,expense,Food,Cash,,650,Dinner at cafe
2026-10-21,income,Salary,Bank Account,,95000,Monthly salary deposit
2026-10-21,expense,Petrol,Cash,,3000,Fuel for car
2026-10-22,transfer,,Bank Account,Cash,15000,ATM cash withdrawal
2026-10-22,expense,Mobile & Internet,Bank Account,,2500,Fiber broadband bill
2026-10-22,expense,Chai,Cash,,120,Tea with friends
2026-10-22,expense,Shopping,Bank Account,,4200,Grocery shopping`;

// ─── CSV Utilities ────────────────────────────────────────────────────────────

function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Pure TypeScript RFC 4180-compliant CSV parser.
 * Handles quoted fields, escaped quotes, and multiline cells.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ─── CSV Export Functionality ─────────────────────────────────────────────────

/**
 * Exports all transactions to a user-friendly CSV spreadsheet.
 */
export async function exportTransactionsCSV(): Promise<{
  success: boolean;
  count?: number;
  fileName?: string;
  error?: string;
}> {
  try {
    const [transactions, accounts, categories] = await Promise.all([
      transactionRepository.getAll(),
      accountRepository.getAll(true),
      categoryRepository.getAll(),
    ]);

    const accountMap = new Map<string, string>();
    for (const a of accounts) accountMap.set(a.id, a.name);

    const categoryMap = new Map<string, string>();
    for (const c of categories) categoryMap.set(c.id, c.name);

    const headers = ['Date', 'Type', 'Category', 'Account', 'To Account', 'Amount', 'Note'];
    const csvLines: string[] = [headers.join(',')];

    for (const tx of transactions) {
      if (tx.deleted_at) continue;

      const dateStr = tx.date ? tx.date.split('T')[0] : '';
      const typeStr = tx.type;
      const catStr = tx.category_id ? categoryMap.get(tx.category_id) || '' : '';
      const accStr = tx.account_id ? accountMap.get(tx.account_id) || 'Default' : '';
      const toAccStr = tx.to_account_id ? accountMap.get(tx.to_account_id) || '' : '';
      const amountStr = String(tx.amount);
      const noteStr = tx.note || '';

      const row = [
        escapeCSVCell(dateStr),
        escapeCSVCell(typeStr),
        escapeCSVCell(catStr),
        escapeCSVCell(accStr),
        escapeCSVCell(toAccStr),
        escapeCSVCell(amountStr),
        escapeCSVCell(noteStr),
      ];

      csvLines.push(row.join(','));
    }

    const csvContent = csvLines.join('\n');
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10);
    const fileName = `ApniRakam_Transactions_${dateStamp}.csv`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, count: transactions.length, fileName };
      }
      return { success: false, error: 'Web environment does not support file download' };
    }

    // Native: Android & iOS
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(csvContent);

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (shareAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export ApniRakam Transactions CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      await Share.share({
        title: fileName,
        message: csvContent,
      });
    }

    return { success: true, count: transactions.length, fileName };
  } catch (error: any) {
    console.error('[BackupService] CSV Export failed:', error);
    return { success: false, error: error?.message || 'Failed to export CSV.' };
  }
}

/**
 * Exports a comprehensive monthly financial report into a CSV spreadsheet.
 * Includes financial summary, category spending breakdown, and itemized transactions.
 */
export async function exportMonthlyReportCSV(options: {
  monthLabel: string;
  startDate: Date;
  endDate: Date;
  currencySymbol?: string;
}): Promise<{
  success: boolean;
  count?: number;
  fileName?: string;
  error?: string;
}> {
  try {
    const { monthLabel, startDate, endDate, currencySymbol = 'PKR' } = options;

    const [allTransactions, accounts, categories] = await Promise.all([
      transactionRepository.getAll(),
      accountRepository.getAll(true),
      categoryRepository.getAll(),
    ]);

    const accountMap = new Map<string, string>();
    for (const a of accounts) accountMap.set(a.id, a.name);

    const categoryMap = new Map<string, string>();
    for (const c of categories) categoryMap.set(c.id, c.name);

    // Filter month transactions
    const monthTxs = allTransactions.filter((tx) => {
      if (tx.deleted_at) return false;
      const d = new Date(tx.date);
      return d >= startDate && d <= endDate;
    });

    // Compute totals
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};

    for (const tx of monthTxs) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
        const catName = (tx.category_id && categoryMap.get(tx.category_id)) || 'Other';
        catMap[catName] = (catMap[catName] ?? 0) + tx.amount;
      }
    }

    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    const lines: string[] = [];

    // Title & Header
    lines.push(`ApniRakam Financial Report - ${monthLabel}`);
    lines.push(`Generated,${new Date().toISOString().split('T')[0]}`);
    lines.push('');

    // Summary Section
    lines.push('MONTHLY SUMMARY');
    lines.push(`Total Income,${currencySymbol} ${income}`);
    lines.push(`Total Expenses,${currencySymbol} ${expense}`);
    lines.push(`Net Savings,${currencySymbol} ${netSavings}`);
    lines.push(`Savings Rate,${savingsRate}%`);
    lines.push(`Total Transactions,${monthTxs.length}`);
    lines.push('');

    // Category Breakdown Section
    lines.push('CATEGORY BREAKDOWN (EXPENSES)');
    lines.push('Category,Amount,Percentage');
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    for (const [catName, amt] of sortedCats) {
      const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
      lines.push(`${escapeCSVCell(catName)},${amt},${pct}%`);
    }
    lines.push('');

    // Itemized Transactions Section
    lines.push('TRANSACTIONS');
    lines.push('Date,Type,Category,Account,To Account,Amount,Note');
    for (const tx of monthTxs) {
      const dateStr = tx.date ? tx.date.split('T')[0] : '';
      const typeStr = tx.type;
      const catStr = tx.category_id ? categoryMap.get(tx.category_id) || '' : '';
      const accStr = tx.account_id ? accountMap.get(tx.account_id) || 'Default' : '';
      const toAccStr = tx.to_account_id ? accountMap.get(tx.to_account_id) || '' : '';
      const amountStr = String(tx.amount);
      const noteStr = tx.note || '';

      const row = [
        escapeCSVCell(dateStr),
        escapeCSVCell(typeStr),
        escapeCSVCell(catStr),
        escapeCSVCell(accStr),
        escapeCSVCell(toAccStr),
        escapeCSVCell(amountStr),
        escapeCSVCell(noteStr),
      ];
      lines.push(row.join(','));
    }

    const csvContent = lines.join('\n');
    const safeMonthSlug = monthLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `ApniRakam_Report_${safeMonthSlug}.csv`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, count: monthTxs.length, fileName };
      }
      return { success: false, error: 'Web environment does not support file download' };
    }

    // Native: Android & iOS
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(csvContent);

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (shareAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${monthLabel} Report CSV`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      await Share.share({
        title: fileName,
        message: csvContent,
      });
    }

    return { success: true, count: monthTxs.length, fileName };
  } catch (error: any) {
    console.error('[BackupService] Monthly Report CSV Export failed:', error);
    return { success: false, error: error?.message || 'Failed to export monthly report CSV.' };
  }
}

/**
 * Downloads or shares a sample CSV template for users to format their data.
 */
export async function exportSampleCSV(): Promise<{
  success: boolean;
  fileName?: string;
  error?: string;
}> {
  try {
    const fileName = 'ApniRakam_Sample_Template.csv';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, fileName };
      }
      return { success: false, error: 'Web download not available.' };
    }

    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(SAMPLE_CSV_CONTENT);

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (shareAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'ApniRakam Sample CSV Template',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      await Share.share({
        title: fileName,
        message: SAMPLE_CSV_CONTENT,
      });
    }

    return { success: true, fileName };
  } catch (error: any) {
    console.error('[BackupService] Export sample CSV failed:', error);
    return { success: false, error: error?.message || 'Failed to export sample template.' };
  }
}

// ─── CSV Parsing & Import Functionality ───────────────────────────────────────

/**
 * Validates and parses raw CSV text into transaction records.
 */
export function parseTransactionsCSV(rawCSV: string): {
  valid: boolean;
  error?: string;
  rows?: ParsedCSVRow[];
  summary?: {
    count: number;
    totalAmount: number;
    expenseCount: number;
    incomeCount: number;
    transferCount: number;
  };
} {
  try {
    if (!rawCSV || typeof rawCSV !== 'string' || !rawCSV.trim()) {
      return { valid: false, error: 'CSV file is empty.' };
    }

    const parsed = parseCSV(rawCSV);
    if (parsed.length < 2) {
      return { valid: false, error: 'CSV must contain a header row and at least one transaction row.' };
    }

    const headerRow = parsed[0].map((h) => h.toLowerCase().trim().replace(/['"_]/g, ' '));

    // Detect column indexes flexibly
    const dateIdx = headerRow.findIndex((h) => h.includes('date') || h.includes('time'));
    const typeIdx = headerRow.findIndex((h) => h.includes('type'));
    const catIdx = headerRow.findIndex((h) => h.includes('cat') || h.includes('tag'));
    const toAccIdx = headerRow.findIndex((h) => h.includes('to account') || h.includes('destination') || h.includes('to acc'));
    const accIdx = headerRow.findIndex(
      (h, idx) => idx !== toAccIdx && (h.includes('account') || h.includes('wallet') || h.includes('bank') || h.includes('from'))
    );
    const amountIdx = headerRow.findIndex((h) => h.includes('amount') || h.includes('total') || h.includes('value') || h.includes('cost'));
    const noteIdx = headerRow.findIndex((h) => h.includes('note') || h.includes('desc') || h.includes('memo') || h.includes('remark'));

    if (amountIdx === -1) {
      return { valid: false, error: 'Could not find an "Amount" column in the CSV file.' };
    }

    const validRows: ParsedCSVRow[] = [];
    let totalAmount = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    let transferCount = 0;

    for (let i = 1; i < parsed.length; i++) {
      const row = parsed[i];
      if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

      // Extract amount
      const rawAmount = row[amountIdx] || '';
      const cleanAmountStr = rawAmount.replace(/[^0-9.-]/g, '');
      const parsedAmount = Math.abs(parseFloat(cleanAmountStr));

      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        continue; // Skip invalid or zero amount rows
      }

      // Extract date
      let dateVal = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : '';
      if (!dateVal) {
        dateVal = new Date().toISOString().split('T')[0];
      } else {
        // Try parsing date
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          dateVal = d.toISOString().split('T')[0];
        }
      }

      // Extract type
      let typeVal: 'expense' | 'income' | 'transfer' = 'expense';
      const rawType = typeIdx !== -1 && row[typeIdx] ? row[typeIdx].toLowerCase().trim() : '';
      if (rawType.includes('inc') || rawType.includes('credit') || rawType.includes('deposit')) {
        typeVal = 'income';
      } else if (rawType.includes('trans') || rawType.includes('move')) {
        typeVal = 'transfer';
      } else {
        typeVal = 'expense';
      }

      const categoryName = catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : (typeVal === 'income' ? 'Salary' : 'Other');
      const accountName = accIdx !== -1 && row[accIdx] ? row[accIdx].trim() : 'Cash';
      const toAccountName = toAccIdx !== -1 && row[toAccIdx] ? row[toAccIdx].trim() : '';
      const note = noteIdx !== -1 && row[noteIdx] ? row[noteIdx].trim() : '';

      validRows.push({
        date: dateVal,
        type: typeVal,
        categoryName,
        accountName,
        toAccountName,
        amount: parsedAmount,
        note,
      });

      totalAmount += parsedAmount;
      if (typeVal === 'income') incomeCount++;
      else if (typeVal === 'transfer') transferCount++;
      else expenseCount++;
    }

    if (validRows.length === 0) {
      return { valid: false, error: 'No valid transaction records could be parsed from the CSV.' };
    }

    return {
      valid: true,
      rows: validRows,
      summary: {
        count: validRows.length,
        totalAmount,
        expenseCount,
        incomeCount,
        transferCount,
      },
    };
  } catch (error: any) {
    return { valid: false, error: `Failed to parse CSV: ${error?.message || 'Syntax error'}` };
  }
}

/**
 * Imports parsed CSV transaction rows into SQLite database.
 * Auto-creates missing accounts and categories to avoid data loss.
 * Prevents duplicates in 'merge' mode.
 */
export async function importTransactionsCSV(
  rows: ParsedCSVRow[],
  mode: 'merge' | 'replace'
): Promise<CSVImportResult> {
  const db = await getDatabase();
  let importedCount = 0;
  let skippedDuplicates = 0;
  let createdAccounts = 0;
  let createdCategories = 0;

  try {
    await db.withTransactionAsync(async () => {
      if (mode === 'replace') {
        // Clear existing transactions
        await db.runAsync('DELETE FROM transactions');
      }

      // 1. Fetch current accounts and categories
      const existingAccounts = await db.getAllAsync<{ id: string; name: string }>(
        'SELECT id, name FROM accounts'
      );
      const accountNameMap = new Map<string, string>();
      for (const a of existingAccounts) {
        accountNameMap.set(a.name.toLowerCase().trim(), a.id);
      }

      const existingCategories = await db.getAllAsync<{ id: string; name: string; type: string }>(
        'SELECT id, name, type FROM categories'
      );
      const categoryNameMap = new Map<string, string>();
      for (const c of existingCategories) {
        categoryNameMap.set(`${c.name.toLowerCase().trim()}_${c.type}`, c.id);
      }

      const timestamp = now();

      // Helper to resolve or create an account
      async function resolveAccountId(name: string): Promise<string> {
        const cleanName = (name || 'Cash').trim();
        const key = cleanName.toLowerCase();
        if (accountNameMap.has(key)) {
          return accountNameMap.get(key)!;
        }

        // Create new account
        const newAccId = createId();
        await db.runAsync(
          'INSERT INTO accounts (id, name, type, currency, opening_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          newAccId,
          cleanName,
          cleanName.toLowerCase().includes('bank') ? 'bank' : 'cash',
          'PKR',
          0,
          1,
          timestamp,
          timestamp
        );
        accountNameMap.set(key, newAccId);
        createdAccounts++;
        return newAccId;
      }

      // Helper to resolve or create a category
      async function resolveCategoryId(name: string, type: 'expense' | 'income'): Promise<string> {
        const cleanName = (name || (type === 'income' ? 'Salary' : 'Other')).trim();
        const key = `${cleanName.toLowerCase()}_${type}`;
        if (categoryNameMap.has(key)) {
          return categoryNameMap.get(key)!;
        }

        // Create new category
        const newCatId = createId();
        const meta = getCategoryMeta(cleanName);
        await db.runAsync(
          'INSERT INTO categories (id, name, type, icon, color, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          newCatId,
          cleanName,
          type,
          meta.icon,
          meta.color,
          0,
          timestamp,
          timestamp
        );
        categoryNameMap.set(key, newCatId);
        createdCategories++;
        return newCatId;
      }

      // 2. Insert transactions
      for (const row of rows) {
        const accountId = await resolveAccountId(row.accountName);
        const toAccountId = row.type === 'transfer' && row.toAccountName
          ? await resolveAccountId(row.toAccountName)
          : null;

        const categoryId = row.type !== 'transfer'
          ? await resolveCategoryId(row.categoryName, row.type)
          : null;

        // In merge mode: check for duplicate transaction
        if (mode === 'merge') {
          const duplicate = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM transactions WHERE type = ? AND amount = ? AND account_id = ? AND date = ? AND (note = ? OR (note IS NULL AND ? IS NULL)) AND deleted_at IS NULL',
            row.type,
            row.amount,
            accountId,
            row.date,
            row.note ? row.note : null,
            row.note ? row.note : null
          );
          if (duplicate) {
            skippedDuplicates++;
            continue;
          }
        }

        const txId = createId();
        await db.runAsync(
          'INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, date, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          txId,
          row.type,
          row.amount,
          accountId,
          toAccountId,
          categoryId,
          row.date,
          row.note || null,
          timestamp,
          timestamp,
          null
        );
        importedCount++;
      }
    });

    // Refresh store
    await useAppStore.getState().loadAppData();

    return {
      success: true,
      importedCount,
      skippedDuplicates,
      createdAccounts,
      createdCategories,
    };
  } catch (error: any) {
    console.error('[BackupService] CSV Import failed:', error);
    return {
      success: false,
      importedCount,
      skippedDuplicates,
      createdAccounts,
      createdCategories,
      error: error?.message || 'Failed to import CSV into database.',
    };
  }
}

// ─── JSON Backup & Restore Functionality (Full Snapshot) ──────────────────────

/**
 * Creates and exports a comprehensive JSON backup of all app data.
 */
export async function exportAppData(): Promise<{
  success: boolean;
  metadata?: BackupMetadata;
  fileName?: string;
  error?: string;
}> {
  try {
    const [accounts, categories, transactions, budgets, loans, loanRepayments] = await Promise.all([
      accountRepository.getAll(true),
      categoryRepository.getAll(),
      transactionRepository.getAll(),
      budgetRepository.getAll(),
      loanRepository.getAll(),
      loanRepository.getAllRepayments(),
    ]);

    const store = useAppStore.getState();
    const preferences: BackupPreferences = {
      userName: store.userName,
      currency: store.currency,
      currencySymbol: store.currencySymbol,
      defaultCategoryId: store.defaultCategoryId,
      defaultAccountId: store.defaultAccountId,
      defaultBudgetPeriod: store.defaultBudgetPeriod,
      themeMode: store.themeMode,
    };

    const metadata: BackupMetadata = {
      accountsCount: accounts.length,
      categoriesCount: categories.length,
      transactionsCount: transactions.length,
      budgetsCount: budgets.length,
      loansCount: loans.length,
      repaymentsCount: loanRepayments.length,
    };

    const payload: BackupPayload = {
      app: 'ApniRakam',
      version: 1,
      exported_at: new Date().toISOString(),
      metadata,
      preferences,
      data: {
        accounts,
        categories,
        transactions,
        budgets,
        loans,
        loan_repayments: loanRepayments,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `ApniRakam_Backup_${dateStamp}.json`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, metadata, fileName };
      }
      return { success: false, error: 'Web environment does not support file download' };
    }

    const backupFile = new File(Paths.cache, fileName);
    backupFile.create({ overwrite: true });
    backupFile.write(jsonString);

    const shareAvailable = await Sharing.isAvailableAsync().catch(() => false);
    if (shareAvailable) {
      await Sharing.shareAsync(backupFile.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Export ApniRakam Backup',
        UTI: 'public.json',
      });
    } else {
      await Share.share({
        title: fileName,
        message: jsonString,
      });
    }

    return { success: true, metadata, fileName };
  } catch (error: any) {
    console.error('[BackupService] Export failed:', error);
    return { success: false, error: error?.message || 'Failed to export backup file.' };
  }
}

/**
 * Triggers document picker and reads the selected file (CSV or JSON).
 */
export async function pickBackupFile(): Promise<{
  canceled: boolean;
  content?: string;
  fileName?: string;
  isCSV?: boolean;
  error?: string;
}> {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,text/csv,.json,application/json,text/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ canceled: true });
            return;
          }
          const isCSV = file.name?.toLowerCase().endsWith('.csv');
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              canceled: false,
              content: reader.result as string,
              fileName: file.name,
              isCSV,
            });
          };
          reader.onerror = () => {
            resolve({ canceled: false, error: 'Could not read the selected file.' });
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/*', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return { canceled: true };
    }

    const asset = pickerResult.assets[0];
    const pickedFile = new File(asset.uri);
    const content = await pickedFile.text();
    const isCSV = asset.name?.toLowerCase().endsWith('.csv') || (!content.trim().startsWith('{') && content.includes(','));

    return {
      canceled: false,
      content,
      fileName: asset.name,
      isCSV,
    };
  } catch (error: any) {
    console.error('[BackupService] Pick file failed:', error);
    return { canceled: false, error: error?.message || 'Failed to select backup file.' };
  }
}

/**
 * Validates the contents of a JSON backup file string and returns parsed payload if valid.
 */
export function validateBackupContent(rawContent: string): {
  valid: boolean;
  error?: string;
  payload?: BackupPayload;
} {
  try {
    if (!rawContent || typeof rawContent !== 'string') {
      return { valid: false, error: 'File is empty or corrupted.' };
    }

    const parsed = JSON.parse(rawContent);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'File is not a valid JSON object.' };
    }

    const data = parsed.data || parsed;
    if (!data.accounts && !data.transactions && !data.categories) {
      return {
        valid: false,
        error: 'The selected file is not a valid ApniRakam backup (missing accounts/transactions/categories).',
      };
    }

    const payload: BackupPayload = {
      app: 'ApniRakam',
      version: parsed.version || 1,
      exported_at: parsed.exported_at || new Date().toISOString(),
      metadata: {
        accountsCount: Array.isArray(data.accounts) ? data.accounts.length : 0,
        categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
        transactionsCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
        budgetsCount: Array.isArray(data.budgets) ? data.budgets.length : 0,
        loansCount: Array.isArray(data.loans) ? data.loans.length : 0,
        repaymentsCount: Array.isArray(data.loan_repayments) ? data.loan_repayments.length : 0,
      },
      preferences: parsed.preferences,
      data: {
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        budgets: Array.isArray(data.budgets) ? data.budgets : [],
        loans: Array.isArray(data.loans) ? data.loans : [],
        loan_repayments: Array.isArray(data.loan_repayments) ? data.loan_repayments : [],
      },
    };

    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, error: `Invalid JSON syntax: ${error?.message || 'Parse error'}` };
  }
}

/**
 * Restores JSON data into SQLite with atomic transaction protection and duplicate prevention.
 */
export async function restoreAppData(
  payload: BackupPayload,
  mode: 'merge' | 'replace'
): Promise<ImportResult> {
  const db = await getDatabase();
  const resultCounts = {
    accounts: 0,
    categories: 0,
    transactions: 0,
    budgets: 0,
    loans: 0,
    repayments: 0,
  };
  let skippedDuplicates = 0;

  try {
    await db.withTransactionAsync(async () => {
      if (mode === 'replace') {
        await db.runAsync('DELETE FROM loan_repayments');
        await db.runAsync('DELETE FROM loans');
        await db.runAsync('DELETE FROM transactions');
        await db.runAsync('DELETE FROM budgets');
        await db.runAsync('DELETE FROM accounts');
        await db.runAsync('DELETE FROM categories WHERE is_default = 0');
      }

      const categoryIdMap: Record<string, string> = {};
      const accountIdMap: Record<string, string> = {};

      // ── 1. Categories ──────────────────────────────────────────────────────
      for (const cat of payload.data.categories) {
        if (!cat.id || !cat.name || !cat.type) continue;

        const existingById = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE id = ?',
          cat.id
        );

        if (existingById) {
          await db.runAsync(
            'UPDATE categories SET name = ?, type = ?, icon = COALESCE(?, icon), color = COALESCE(?, color), is_default = ?, updated_at = ? WHERE id = ?',
            cat.name,
            cat.type,
            cat.icon ?? null,
            cat.color ?? null,
            cat.is_default ?? 0,
            cat.updated_at || new Date().toISOString(),
            cat.id
          );
          categoryIdMap[cat.id] = cat.id;
          resultCounts.categories++;
          continue;
        }

        const existingByName = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND type = ?',
          cat.name,
          cat.type
        );

        if (existingByName) {
          categoryIdMap[cat.id] = existingByName.id;
          skippedDuplicates++;
          continue;
        }

        await db.runAsync(
          'INSERT INTO categories (id, name, type, icon, color, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          cat.id,
          cat.name,
          cat.type,
          cat.icon ?? null,
          cat.color ?? null,
          cat.is_default ?? 0,
          cat.created_at || new Date().toISOString(),
          cat.updated_at || new Date().toISOString()
        );
        categoryIdMap[cat.id] = cat.id;
        resultCounts.categories++;
      }

      // ── 2. Accounts ────────────────────────────────────────────────────────
      for (const acc of payload.data.accounts) {
        if (!acc.id || !acc.name) continue;

        const existingById = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM accounts WHERE id = ?',
          acc.id
        );

        if (existingById) {
          await db.runAsync(
            'UPDATE accounts SET name = ?, type = ?, currency = ?, opening_balance = ?, is_active = ?, updated_at = ? WHERE id = ?',
            acc.name,
            acc.type,
            acc.currency || 'PKR',
            acc.opening_balance ?? 0,
            acc.is_active ?? 1,
            acc.updated_at || new Date().toISOString(),
            acc.id
          );
          accountIdMap[acc.id] = acc.id;
          resultCounts.accounts++;
          continue;
        }

        if (mode === 'merge') {
          const existingByName = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM accounts WHERE LOWER(name) = LOWER(?)',
            acc.name
          );
          if (existingByName) {
            accountIdMap[acc.id] = existingByName.id;
            skippedDuplicates++;
            continue;
          }
        }

        await db.runAsync(
          'INSERT INTO accounts (id, name, type, currency, opening_balance, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          acc.id,
          acc.name,
          acc.type,
          acc.currency || 'PKR',
          acc.opening_balance ?? 0,
          acc.is_active ?? 1,
          acc.created_at || new Date().toISOString(),
          acc.updated_at || new Date().toISOString()
        );
        accountIdMap[acc.id] = acc.id;
        resultCounts.accounts++;
      }

      // ── 3. Budgets ─────────────────────────────────────────────────────────
      for (const b of payload.data.budgets) {
        if (!b.id || !b.category_id) continue;
        const resolvedCatId = categoryIdMap[b.category_id] || b.category_id;

        const catExists = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM categories WHERE id = ?',
          resolvedCatId
        );
        if (!catExists) continue;

        const existingById = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM budgets WHERE id = ?',
          b.id
        );

        if (existingById) {
          await db.runAsync(
            'UPDATE budgets SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?',
            resolvedCatId,
            b.amount,
            b.period,
            b.start_date,
            b.end_date,
            b.updated_at || new Date().toISOString(),
            b.id
          );
          resultCounts.budgets++;
          continue;
        }

        await db.runAsync(
          'INSERT INTO budgets (id, category_id, amount, period, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          b.id,
          resolvedCatId,
          b.amount,
          b.period,
          b.start_date,
          b.end_date,
          b.created_at || new Date().toISOString(),
          b.updated_at || new Date().toISOString()
        );
        resultCounts.budgets++;
      }

      // ── 4. Transactions ───────────────────────────────────────────────────
      for (const tx of payload.data.transactions) {
        if (!tx.id || !tx.account_id || tx.amount == null) continue;

        const resolvedAccId = accountIdMap[tx.account_id] || tx.account_id;
        const resolvedToAccId = tx.to_account_id ? (accountIdMap[tx.to_account_id] || tx.to_account_id) : null;
        const resolvedCatId = tx.category_id ? (categoryIdMap[tx.category_id] || tx.category_id) : null;

        const accExists = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM accounts WHERE id = ?',
          resolvedAccId
        );
        if (!accExists) continue;

        const existingTx = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM transactions WHERE id = ?',
          tx.id
        );

        if (existingTx) {
          if (mode === 'merge') {
            skippedDuplicates++;
            continue;
          } else {
            await db.runAsync(
              'UPDATE transactions SET type = ?, amount = ?, account_id = ?, to_account_id = ?, category_id = ?, date = ?, note = ?, updated_at = ?, deleted_at = ? WHERE id = ?',
              tx.type,
              tx.amount,
              resolvedAccId,
              resolvedToAccId,
              resolvedCatId,
              tx.date,
              tx.note ?? null,
              tx.updated_at || new Date().toISOString(),
              tx.deleted_at ?? null,
              tx.id
            );
            resultCounts.transactions++;
            continue;
          }
        }

        if (mode === 'merge') {
          const duplicateMatch = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM transactions WHERE type = ? AND amount = ? AND account_id = ? AND date = ? AND (note = ? OR (note IS NULL AND ? IS NULL)) AND deleted_at IS NULL',
            tx.type,
            tx.amount,
            resolvedAccId,
            tx.date,
            tx.note ?? null,
            tx.note ?? null
          );
          if (duplicateMatch) {
            skippedDuplicates++;
            continue;
          }
        }

        await db.runAsync(
          'INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, date, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          tx.id,
          tx.type,
          tx.amount,
          resolvedAccId,
          resolvedToAccId,
          resolvedCatId,
          tx.date,
          tx.note ?? null,
          tx.created_at || new Date().toISOString(),
          tx.updated_at || new Date().toISOString(),
          tx.deleted_at ?? null
        );
        resultCounts.transactions++;
      }

      // ── 5. Loans ──────────────────────────────────────────────────────────
      for (const loan of payload.data.loans) {
        if (!loan.id || !loan.account_id || !loan.person_name) continue;
        const resolvedAccId = accountIdMap[loan.account_id] || loan.account_id;

        const accExists = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM accounts WHERE id = ?',
          resolvedAccId
        );
        if (!accExists) continue;

        const existingLoan = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM loans WHERE id = ?',
          loan.id
        );

        if (existingLoan) {
          if (mode === 'merge') {
            skippedDuplicates++;
            continue;
          }
          await db.runAsync(
            'UPDATE loans SET type = ?, person_name = ?, amount = ?, paid_amount = ?, account_id = ?, status = ?, date = ?, due_date = ?, note = ?, updated_at = ?, deleted_at = ? WHERE id = ?',
            loan.type,
            loan.person_name,
            loan.amount,
            loan.paid_amount ?? 0,
            resolvedAccId,
            loan.status,
            loan.date,
            loan.due_date ?? null,
            loan.note ?? null,
            loan.updated_at || new Date().toISOString(),
            loan.deleted_at ?? null,
            loan.id
          );
          resultCounts.loans++;
          continue;
        }

        await db.runAsync(
          'INSERT INTO loans (id, type, person_name, amount, paid_amount, account_id, status, date, due_date, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          loan.id,
          loan.type,
          loan.person_name,
          loan.amount,
          loan.paid_amount ?? 0,
          resolvedAccId,
          loan.status,
          loan.date,
          loan.due_date ?? null,
          loan.note ?? null,
          loan.created_at || new Date().toISOString(),
          loan.updated_at || new Date().toISOString(),
          loan.deleted_at ?? null
        );
        resultCounts.loans++;
      }

      // ── 6. Loan Repayments ────────────────────────────────────────────────
      for (const rep of payload.data.loan_repayments) {
        if (!rep.id || !rep.loan_id || !rep.account_id) continue;
        const resolvedAccId = accountIdMap[rep.account_id] || rep.account_id;

        const loanExists = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM loans WHERE id = ?',
          rep.loan_id
        );
        if (!loanExists) continue;

        const existingRep = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM loan_repayments WHERE id = ?',
          rep.id
        );

        if (existingRep) {
          if (mode === 'merge') {
            skippedDuplicates++;
            continue;
          }
          await db.runAsync(
            'UPDATE loan_repayments SET loan_id = ?, amount = ?, account_id = ?, date = ?, note = ?, updated_at = ? WHERE id = ?',
            rep.loan_id,
            rep.amount,
            resolvedAccId,
            rep.date,
            rep.note ?? null,
            rep.updated_at || new Date().toISOString(),
            rep.id
          );
          resultCounts.repayments++;
          continue;
        }

        await db.runAsync(
          'INSERT INTO loan_repayments (id, loan_id, amount, account_id, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          rep.id,
          rep.loan_id,
          rep.amount,
          resolvedAccId,
          rep.date,
          rep.note ?? null,
          rep.created_at || new Date().toISOString(),
          rep.updated_at || new Date().toISOString()
        );
        resultCounts.repayments++;
      }
    });

    // ── 7. Preferences (in replace mode or if user has no prefs) ─────────────
    if (payload.preferences && (mode === 'replace' || !useAppStore.getState().userName)) {
      const p = payload.preferences;
      const store = useAppStore.getState();
      if (p.userName) await store.setUserName(p.userName);
      if (p.currency && p.currencySymbol) await store.setCurrency(p.currency, p.currencySymbol);
      if (p.themeMode) await store.setThemeMode(p.themeMode);
      if (p.defaultBudgetPeriod) await store.setDefaultBudgetPeriod(p.defaultBudgetPeriod);
    }

    // ── 8. Refresh Zustand Store ─────────────────────────────────────────────
    await useAppStore.getState().loadAppData();

    return {
      success: true,
      importedCounts: resultCounts,
      skippedDuplicates,
    };
  } catch (error: any) {
    console.error('[BackupService] Restore failed:', error);
    return {
      success: false,
      importedCounts: resultCounts,
      skippedDuplicates,
      error: error?.message || 'Failed to restore database from backup file.',
    };
  }
}
