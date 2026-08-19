/**
 * Utility functions for formatting currencies, numbers, and dates in ApniRakam.
 */

export interface CurrencyFormatOptions {
  currency?: string; // Default: 'PKR'
  symbol?: string;   // Default: 'PKR' or 'Rs.'
  showDecimals?: boolean;
  sign?: boolean;
}

export function formatCurrency(
  amount: number | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  const { symbol = 'PKR', showDecimals = false, sign = false } = options;
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  const formattedNum = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(Math.abs(num));

  if (num < 0) {
    return `-${symbol} ${formattedNum}`;
  }
  if (sign && num > 0) {
    return `+${symbol} ${formattedNum}`;
  }
  return `${symbol} ${formattedNum}`;
}

export function formatDate(
  dateInput: string | Date | number,
  format: 'short' | 'medium' | 'full' | 'time' = 'medium'
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  switch (format) {
    case 'short':
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    case 'medium':
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    case 'full':
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    case 'time':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    default:
      return date.toLocaleDateString();
  }
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}
