import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const STORAGE_KEYS = {
  HAS_ONBOARDED: 'apnirakam_has_onboarded',
  USER_PIN: 'apnirakam_user_pin',
  USER_PROFILE: 'apnirakam_user_profile',
  CURRENCY: 'apnirakam_currency',
  CURRENCY_SYMBOL: 'apnirakam_currency_symbol',
  DEFAULT_CATEGORY: 'apnirakam_default_category',
  DEFAULT_ACCOUNT: 'apnirakam_default_account',
  DEFAULT_BUDGET_PERIOD: 'apnirakam_default_budget_period',
  THEME_MODE: 'apnirakam_theme_mode',
} as const;

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (e) {
    console.warn(`[Storage] Error setting key ${key}:`, e);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.warn(`[Storage] Error getting key ${key}:`, e);
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.warn(`[Storage] Error deleting key ${key}:`, e);
  }
}
