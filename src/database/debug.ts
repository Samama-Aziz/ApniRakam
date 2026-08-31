import { accountRepository } from './repositories/accountRepository';
import { categoryRepository } from './repositories/categoryRepository';
import { transactionRepository } from './repositories/transactionRepository';

/**
 * Manual development-only smoke test. Call from a temporary debug button/console,
 * never during normal app startup. It exercises create, read, update and soft delete.
 */
export async function runDatabaseDebugScenario(): Promise<{ passed: boolean; transactionId: string }> {
  const account = await accountRepository.create({ name: `Debug Cash ${Date.now()}`, type: 'cash', opening_balance: 10_000 });
  const category = await categoryRepository.create({ name: `Debug Food ${Date.now()}`, type: 'expense' });
  const created = await transactionRepository.create({ type: 'expense', amount: 500, account_id: account.id, category_id: category.id, date: new Date().toISOString().slice(0, 10), note: 'Database smoke test' });
  if (!await transactionRepository.getById(created.id)) throw new Error('Transaction could not be read after creation.');
  const updated = await transactionRepository.update(created.id, { amount: 600 });
  if (updated?.amount !== 600) throw new Error('Transaction could not be updated.');
  if (!await transactionRepository.delete(created.id)) throw new Error('Transaction could not be deleted.');
  if (await transactionRepository.getById(created.id)) throw new Error('Soft-deleted transaction is still returned by default queries.');
  return { passed: true, transactionId: created.id };
}
