export * from '@/types/models';

export interface CreateAccountDTO {
  name: string;
  type: 'cash' | 'bank' | 'wallet' | 'savings' | 'credit';
  initialBalance: number;
  currency: string;
  icon?: string;
  color?: string;
}
