export * from '@/types/models';

export interface BudgetStatus {
  budget: import('@/types/models').Budget;
  percentageUsed: number;
  remainingAmount: number;
  isOverBudget: boolean;
}
