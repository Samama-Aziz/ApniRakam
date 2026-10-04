import { Ionicons } from '@expo/vector-icons';
import type { CategoryRecord } from '@/database/repositories/types';

export interface CategoryMeta {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const META_BY_KEY: Record<string, { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  food:               { name: 'Food',               icon: 'fast-food-outline',             color: '#F59E0B' },
  'food & dining':    { name: 'Food & Dining',      icon: 'fast-food-outline',             color: '#F59E0B' },
  chai:               { name: 'Chai & Cafe',        icon: 'cafe-outline',                  color: '#D97706' },
  transport:          { name: 'Transport',          icon: 'car-outline',                   color: '#3B82F6' },
  petrol:             { name: 'Petrol & Fuel',      icon: 'flame-outline',                 color: '#EF4444' },
  fuel:               { name: 'Petrol & Fuel',      icon: 'flame-outline',                 color: '#EF4444' },
  bills:              { name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' },
  'bills & utilities':{ name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' },
  shopping:           { name: 'Shopping',           icon: 'cart-outline',                  color: '#8B5CF6' },
  groceries:          { name: 'Groceries',          icon: 'basket-outline',                color: '#14B8A6' },
  grocery:            { name: 'Groceries',          icon: 'basket-outline',                color: '#14B8A6' },
  health:             { name: 'Health & Medical',   icon: 'medkit-outline',                color: '#10B981' },
  healthcare:         { name: 'Health & Medical',   icon: 'medkit-outline',                color: '#10B981' },
  education:          { name: 'Education',          icon: 'school-outline',                color: '#6366F1' },
  'mobile & internet':{ name: 'Mobile & Internet',  icon: 'phone-portrait-outline',        color: '#06B6D4' },
  'mobile-internet':  { name: 'Mobile & Internet',  icon: 'phone-portrait-outline',        color: '#06B6D4' },
  entertainment:      { name: 'Entertainment',      icon: 'film-outline',                  color: '#A855F7' },
  rent:               { name: 'House Rent',         icon: 'home-outline',                  color: '#F97316' },
  salary:             { name: 'Salary',             icon: 'cash-outline',                  color: '#10B981' },
  income:             { name: 'Income',             icon: 'cash-outline',                  color: '#10B981' },
  freelance:          { name: 'Freelance',          icon: 'laptop-outline',                color: '#8B5CF6' },
  business:           { name: 'Business',           icon: 'briefcase-outline',             color: '#3B82F6' },
  investments:        { name: 'Investments',        icon: 'trending-up-outline',           color: '#10B981' },
  gift:               { name: 'Gift & Rewards',     icon: 'gift-outline',                  color: '#EC4899' },
  'gifts & rewards':  { name: 'Gift & Rewards',     icon: 'gift-outline',                  color: '#EC4899' },
  charity:            { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#14B8A6' },
  other:              { name: 'Other',              icon: 'ellipsis-horizontal-outline',   color: '#64748B' },
};

export const SELECTABLE_CATEGORY_ICONS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: 'fast-food-outline', label: 'Food' },
  { icon: 'cafe-outline', label: 'Cafe' },
  { icon: 'cart-outline', label: 'Shopping' },
  { icon: 'basket-outline', label: 'Grocery' },
  { icon: 'car-outline', label: 'Transport' },
  { icon: 'flame-outline', label: 'Fuel' },
  { icon: 'flash-outline', label: 'Utility' },
  { icon: 'home-outline', label: 'Home' },
  { icon: 'medkit-outline', label: 'Health' },
  { icon: 'fitness-outline', label: 'Fitness' },
  { icon: 'school-outline', label: 'Education' },
  { icon: 'book-outline', label: 'Books' },
  { icon: 'film-outline', label: 'Movie' },
  { icon: 'game-controller-outline', label: 'Gaming' },
  { icon: 'phone-portrait-outline', label: 'Phone' },
  { icon: 'laptop-outline', label: 'Tech' },
  { icon: 'cash-outline', label: 'Salary' },
  { icon: 'briefcase-outline', label: 'Business' },
  { icon: 'trending-up-outline', label: 'Invest' },
  { icon: 'gift-outline', label: 'Gift' },
  { icon: 'heart-outline', label: 'Charity' },
  { icon: 'airplane-outline', label: 'Travel' },
  { icon: 'shirt-outline', label: 'Clothing' },
  { icon: 'construct-outline', label: 'Repair' },
  { icon: 'paw-outline', label: 'Pets' },
  { icon: 'pricetag-outline', label: 'Tag' },
];

export const SELECTABLE_CATEGORY_COLORS = [
  '#F59E0B', // Amber
  '#D97706', // Warm Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#10B981', // Emerald
  '#84CC16', // Lime
  '#F97316', // Orange
  '#64748B', // Slate
];

export interface AccountTypeOption {
  type: 'cash' | 'bank' | 'wallet' | 'savings' | 'credit';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
}

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  { type: 'cash', label: 'Cash / Physical Wallet', icon: 'wallet-outline', subtitle: 'Cash on hand or petty cash' },
  { type: 'bank', label: 'Bank Account', icon: 'business-outline', subtitle: 'Meezan, HBL, UBL, Alfalah, etc.' },
  { type: 'wallet', label: 'Mobile Wallet', icon: 'phone-portrait-outline', subtitle: 'Easypaisa, JazzCash, Nayapay, Sadapay' },
  { type: 'savings', label: 'Savings Account', icon: 'save-outline', subtitle: 'Savings or emergency fund' },
  { type: 'credit', label: 'Credit Card', icon: 'card-outline', subtitle: 'Credit card or line of credit' },
];

/**
 * Normalizes raw category id (e.g. 'default-expense-food' -> 'food')
 */
export function normalizeCategoryId(idOrName: string): string {
  if (!idOrName) return 'other';
  let cleaned = idOrName.toLowerCase().trim();
  cleaned = cleaned.replace(/^default-(expense|income)-/, '');
  cleaned = cleaned.replace(/^legacy-category-/, '');
  cleaned = cleaned.replace(/-/g, ' ');
  return cleaned;
}

/**
 * Returns a human-friendly display name for a category id or raw name.
 */
export function getCategoryDisplayName(
  idOrName: string,
  categoriesList?: CategoryRecord[]
): string {
  if (!idOrName) return 'General';

  // 1. Check if matches a DB category record ID or name
  if (categoriesList && categoriesList.length > 0) {
    const found = categoriesList.find(
      (c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
    );
    if (found) return found.name;
  }

  // 2. Normalize key and check predefined meta
  const norm = normalizeCategoryId(idOrName);
  if (META_BY_KEY[norm]) {
    return META_BY_KEY[norm].name;
  }

  // 3. Fallback: capitalize each word nicely
  return norm
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Returns metadata (name, icon, theme color) for a category.
 */
export function getCategoryMeta(
  idOrName: string,
  categoriesList?: CategoryRecord[]
): CategoryMeta {
  const norm = normalizeCategoryId(idOrName);
  const foundMeta = META_BY_KEY[norm];

  const displayName = getCategoryDisplayName(idOrName, categoriesList);

  // Check if DB category has a custom icon stored
  if (categoriesList && categoriesList.length > 0) {
    const foundRecord = categoriesList.find(
      (c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
    );
    if (foundRecord?.icon) {
      return {
        name: displayName,
        icon: foundRecord.icon as keyof typeof Ionicons.glyphMap,
        color: foundMeta?.color || '#10B981',
      };
    }
  }

  if (foundMeta) {
    return {
      name: displayName,
      icon: foundMeta.icon,
      color: foundMeta.color,
    };
  }

  // Fallback icon & color
  return {
    name: displayName,
    icon: 'pricetag-outline',
    color: '#64748B',
  };
}
