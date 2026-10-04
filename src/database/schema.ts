export const DB_NAME = 'apnirakam.db';
export const DATABASE_VERSION = 2;

export const CREATE_ACCOUNTS_TABLE = `
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR', opening_balance REAL NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
`;
export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')), icon TEXT,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(name, type)
  );
`;
export const CREATE_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount REAL NOT NULL CHECK (amount >= 0), account_id TEXT NOT NULL, category_id TEXT NOT NULL,
    date TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id), FOREIGN KEY (category_id) REFERENCES categories(id)
  );
`;
export const CREATE_BUDGETS_TABLE = `
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL, category_id TEXT NOT NULL, amount REAL NOT NULL CHECK (amount >= 0),
    period TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (category_id) REFERENCES categories(id)
  );
`;
export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
`;
export const DEFAULT_CATEGORIES = [
  ...['Food', 'Chai', 'Transport', 'Petrol', 'Bills', 'Shopping', 'Health', 'Education', 'Mobile & Internet', 'Entertainment', 'Rent', 'Other'].map((name) => ({ name, type: 'expense' as const })),
  ...['Salary', 'Freelance', 'Business', 'Gift', 'Miscellaneous'].map((name) => ({ name, type: 'income' as const })),
];
