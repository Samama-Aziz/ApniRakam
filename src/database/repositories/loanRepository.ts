import { getDatabase } from '../database';
import {
  createId,
  now,
  type LoanRecord,
  type LoanRepaymentRecord,
  type LoanStatus,
  type LoanType,
} from './types';

export interface CreateLoanInput {
  type: LoanType;
  person_name: string;
  amount: number;
  account_id: string;
  date: string;
  due_date?: string | null;
  note?: string | null;
}

const activeLoans = 'deleted_at IS NULL';

export const loanRepository = {
  async create(input: CreateLoanInput): Promise<LoanRecord> {
    const timestamp = now();
    const record: LoanRecord = {
      id: createId(),
      type: input.type,
      person_name: input.person_name.trim(),
      amount: input.amount,
      paid_amount: 0,
      account_id: input.account_id,
      status: 'pending',
      date: input.date,
      due_date: input.due_date ?? null,
      note: input.note ? input.note.trim() : null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO loans (id, type, person_name, amount, paid_amount, account_id, status, date, due_date, note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      Object.values(record)
    );
    return record;
  },

  async getAll(): Promise<LoanRecord[]> {
    const db = await getDatabase();
    return db.getAllAsync<LoanRecord>(
      `SELECT * FROM loans WHERE ${activeLoans} ORDER BY date DESC, created_at DESC`
    );
  },

  async getById(id: string): Promise<LoanRecord | null> {
    const db = await getDatabase();
    return (
      (await db.getFirstAsync<LoanRecord>(
        `SELECT * FROM loans WHERE id = ? AND ${activeLoans}`,
        id
      )) ?? null
    );
  },

  async addRepayment(
    loanId: string,
    amount: number,
    accountId: string,
    date: string,
    note?: string | null
  ): Promise<{ loan: LoanRecord; repayment: LoanRepaymentRecord }> {
    const db = await getDatabase();
    const loan = await this.getById(loanId);
    if (!loan) throw new Error(`Loan ${loanId} not found`);

    const timestamp = now();
    const repayment: LoanRepaymentRecord = {
      id: createId(),
      loan_id: loanId,
      amount,
      account_id: accountId,
      date,
      note: note ? note.trim() : null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const newPaidAmount = loan.paid_amount + amount;
    let nextStatus: LoanStatus = 'partially_paid';
    if (newPaidAmount >= loan.amount) {
      nextStatus = 'paid';
    } else if (newPaidAmount === 0) {
      nextStatus = 'pending';
    }

    const updatedLoan: LoanRecord = {
      ...loan,
      paid_amount: newPaidAmount,
      status: nextStatus,
      updated_at: timestamp,
    };

    await db.runAsync(
      'INSERT INTO loan_repayments (id, loan_id, amount, account_id, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      Object.values(repayment)
    );

    await db.runAsync(
      'UPDATE loans SET paid_amount = ?, status = ?, updated_at = ? WHERE id = ?',
      updatedLoan.paid_amount,
      updatedLoan.status,
      updatedLoan.updated_at,
      loanId
    );

    return { loan: updatedLoan, repayment };
  },

  async getRepayments(loanId: string): Promise<LoanRepaymentRecord[]> {
    const db = await getDatabase();
    return db.getAllAsync<LoanRepaymentRecord>(
      'SELECT * FROM loan_repayments WHERE loan_id = ? ORDER BY date DESC, created_at DESC',
      loanId
    );
  },

  async getAllRepayments(): Promise<LoanRepaymentRecord[]> {
    const db = await getDatabase();
    return db.getAllAsync<LoanRepaymentRecord>(
      'SELECT * FROM loan_repayments ORDER BY date DESC, created_at DESC'
    );
  },

  async delete(id: string): Promise<boolean> {
    const timestamp = now();
    const db = await getDatabase();
    const result = await db.runAsync(
      'UPDATE loans SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      timestamp,
      timestamp,
      id
    );
    return result.changes > 0;
  },
};
