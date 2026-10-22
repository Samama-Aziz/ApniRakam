import { Ionicons } from '@expo/vector-icons';
import type { CategoryRecord } from '@/database/repositories/types';

export interface CategoryMeta {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export const DISTINCT_CATEGORY_PALETTE = [
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#22C55E', // Lime Green
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#D97706', // Warm Bronze
  '#A855F7', // Violet
  '#10B981', // Emerald
  '#64748B', // Slate
  '#F43F5E', // Rose
  '#84CC16', // Lime
  '#0EA5E9', // Sky Blue
  '#D946EF', // Fuchsia
  '#EAB308', // Yellow
  '#7C3AED', // Deep Purple
  '#E11D48', // Ruby
  '#0284C7', // Sky
  '#78716C', // Stone
  '#059669', // Dark Emerald
];

/**
 * Deterministically generates a unique, distinct color from the palette for any given string.
 */
export function getDistinctColorForString(str: string): string {
  if (!str) return DISTINCT_CATEGORY_PALETTE[0];
  let hash = 0;
  const s = str.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DISTINCT_CATEGORY_PALETTE.length;
  return DISTINCT_CATEGORY_PALETTE[index];
}

const META_BY_KEY: Record<string, { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  // Food & Drinks
  food:               { name: 'Food',               icon: 'fast-food-outline',             color: '#F59E0B' }, // Amber
  'food & dining':    { name: 'Food & Dining',      icon: 'fast-food-outline',             color: '#F59E0B' },
  chai:               { name: 'Chai & Cafe',        icon: 'cafe-outline',                  color: '#D97706' }, // Warm Bronze
  cafe:               { name: 'Chai & Cafe',        icon: 'cafe-outline',                  color: '#D97706' },

  // Transport & Auto
  transport:          { name: 'Transport',          icon: 'car-outline',                   color: '#3B82F6' }, // Blue
  petrol:             { name: 'Petrol & Fuel',      icon: 'flame-outline',                 color: '#EF4444' }, // Red
  fuel:               { name: 'Petrol & Fuel',      icon: 'flame-outline',                 color: '#EF4444' },

  // Home & Living
  bills:              { name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' }, // Pink
  'bills & utilities':{ name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' },
  utility:            { name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' },
  utilities:          { name: 'Bills & Utilities',  icon: 'flash-outline',                 color: '#EC4899' },
  'mobile & internet':{ name: 'Mobile & Internet',  icon: 'phone-portrait-outline',        color: '#64748B' }, // Slate
  'mobile-internet':  { name: 'Mobile & Internet',  icon: 'phone-portrait-outline',        color: '#64748B' },
  mobile:             { name: 'Mobile & Internet',  icon: 'phone-portrait-outline',        color: '#64748B' },
  internet:           { name: 'Mobile & Internet',  icon: 'wifi-outline',                  color: '#64748B' },
  'home maintenance': { name: 'Home Maintenance',   icon: 'construct-outline',             color: '#06B6D4' }, // Cyan
  maintenance:        { name: 'Home Maintenance',   icon: 'construct-outline',             color: '#06B6D4' },
  'house maintenance':{ name: 'Home Maintenance',   icon: 'construct-outline',             color: '#06B6D4' },
  home:               { name: 'Home Maintenance',   icon: 'home-outline',                  color: '#06B6D4' },
  rent:               { name: 'House Rent',         icon: 'home-outline',                  color: '#F97316' }, // Orange

  // Daily Essentials
  shopping:           { name: 'Shopping',           icon: 'cart-outline',                  color: '#8B5CF6' }, // Purple
  groceries:          { name: 'Groceries',          icon: 'basket-outline',                color: '#14B8A6' }, // Teal
  grocery:            { name: 'Groceries',          icon: 'basket-outline',                color: '#14B8A6' },
  clothing:           { name: 'Clothing',           icon: 'shirt-outline',                 color: '#E11D48' }, // Ruby
  clothes:            { name: 'Clothing',           icon: 'shirt-outline',                 color: '#E11D48' },

  // Wellness & Learning
  health:             { name: 'Health & Medical',   icon: 'medkit-outline',                color: '#059669' }, // Dark Emerald
  healthcare:         { name: 'Health & Medical',   icon: 'medkit-outline',                color: '#059669' },
  medical:            { name: 'Health & Medical',   icon: 'medkit-outline',                color: '#059669' },
  fitness:            { name: 'Fitness & Gym',      icon: 'fitness-outline',               color: '#84CC16' }, // Lime
  gym:                { name: 'Fitness & Gym',      icon: 'fitness-outline',               color: '#84CC16' },
  education:          { name: 'Education',          icon: 'school-outline',                color: '#6366F1' }, // Indigo
  school:             { name: 'Education',          icon: 'school-outline',                color: '#6366F1' },
  books:              { name: 'Books',              icon: 'book-outline',                  color: '#6366F1' },

  // Leisure & Giving
  entertainment:      { name: 'Entertainment',      icon: 'film-outline',                  color: '#A855F7' }, // Violet
  travel:             { name: 'Travel & Trips',     icon: 'airplane-outline',              color: '#0284C7' }, // Sky Blue
  charity:            { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#22C55E' }, // Vibrant Lime Green
  zakat:              { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#22C55E' },
  donation:           { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#22C55E' },
  donations:          { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#22C55E' },
  'zakat & charity':  { name: 'Zakat & Charity',    icon: 'heart-outline',                 color: '#22C55E' },
  gift:               { name: 'Gift & Rewards',     icon: 'gift-outline',                  color: '#F43F5E' }, // Rose
  gifts:              { name: 'Gift & Rewards',     icon: 'gift-outline',                  color: '#F43F5E' },
  'gifts & rewards':  { name: 'Gift & Rewards',     icon: 'gift-outline',                  color: '#F43F5E' },
  'personal care':    { name: 'Personal Care',      icon: 'sparkles-outline',              color: '#D946EF' }, // Fuchsia
  family:             { name: 'Family & Kids',      icon: 'people-outline',                color: '#EAB308' }, // Yellow
  pets:               { name: 'Pets',               icon: 'paw-outline',                   color: '#78716C' }, // Stone
  subscriptions:      { name: 'Subscriptions',      icon: 'repeat-outline',                color: '#7C3AED' }, // Deep Purple

  // Income & Work
  salary:             { name: 'Salary',             icon: 'cash-outline',                  color: '#10B981' }, // Emerald
  income:             { name: 'Income',             icon: 'cash-outline',                  color: '#10B981' },
  freelance:          { name: 'Freelance',          icon: 'laptop-outline',                color: '#9333EA' }, // Bright Purple
  business:           { name: 'Business',           icon: 'briefcase-outline',             color: '#2563EB' }, // Cobalt
  investments:        { name: 'Investments',        icon: 'trending-up-outline',           color: '#0D9488' }, // Deep Teal
  investment:         { name: 'Investments',        icon: 'trending-up-outline',           color: '#0D9488' },

  // Banking & Other
  transfer:           { name: 'Transfer',           icon: 'swap-horizontal-outline',       color: '#0EA5E9' }, // Light Blue
  atm:                { name: 'ATM Withdrawal',     icon: 'cash-outline',                  color: '#4B5563' }, // Cool Gray
  'atm withdrawal':   { name: 'ATM Withdrawal',     icon: 'cash-outline',                  color: '#4B5563' },
  withdrawal:         { name: 'ATM Withdrawal',     icon: 'cash-outline',                  color: '#4B5563' },
  miscellaneous:      { name: 'Miscellaneous',      icon: 'ellipsis-horizontal-outline',   color: '#6B7280' },
  other:              { name: 'Other',              icon: 'ellipsis-horizontal-outline',   color: '#6B7280' },
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

export const SELECTABLE_CATEGORY_COLORS = DISTINCT_CATEGORY_PALETTE;

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
 * Guarantees that every category receives a distinct, vibrant color.
 */
export function getCategoryMeta(
  idOrName: string,
  categoriesList?: CategoryRecord[]
): CategoryMeta {
  const norm = normalizeCategoryId(idOrName);
  const foundMeta = META_BY_KEY[norm];

  const displayName = getCategoryDisplayName(idOrName, categoriesList);

  // Check if DB category has a custom icon or color stored
  if (categoriesList && categoriesList.length > 0) {
    const foundRecord = categoriesList.find(
      (c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()
    );
    if (foundRecord) {
      const resolvedColor =
        foundRecord.color ||
        foundMeta?.color ||
        getDistinctColorForString(foundRecord.name || idOrName);

      return {
        name: displayName,
        icon: (foundRecord.icon as keyof typeof Ionicons.glyphMap) || foundMeta?.icon || 'pricetag-outline',
        color: resolvedColor,
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

  // Fallback icon & dynamic distinct color from palette
  return {
    name: displayName,
    icon: 'pricetag-outline',
    color: getDistinctColorForString(idOrName),
  };
}
