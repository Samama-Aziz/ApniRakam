import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const STORAGE_KEYS = {
  HAS_ONBOARDED: 'apnirakam_has_onboarded',
  USER_PIN: 'apnirakam_user_pin',
  AUTH_TOKEN: 'apnirakam_auth_token',
  USER_PROFILE: 'apnirakam_user_profile',
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
