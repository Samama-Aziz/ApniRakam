export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  exchangeRateToPKR: number; // For multi-currency conversion
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  PKR: {
    code: 'PKR',
    symbol: 'Rs.',
    name: 'Pakistani Rupee',
    exchangeRateToPKR: 1,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRateToPKR: 280,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRateToPKR: 300,
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    exchangeRateToPKR: 76,
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Saudi Riyal',
    exchangeRateToPKR: 74,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    exchangeRateToPKR: 355,
  },
};

export function getCurrencyConfig(code: string = 'PKR'): CurrencyConfig {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.PKR;
}
