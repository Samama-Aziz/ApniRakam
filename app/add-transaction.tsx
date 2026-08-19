import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';

interface CategoryOption {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const EXPENSE_CATEGORIES: CategoryOption[] = [
  { id: 'food', name: 'Food & Dining', icon: 'fast-food-outline', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', icon: 'car-outline', color: '#3B82F6' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'flash-outline', color: '#EF4444' },
  { id: 'shopping', name: 'Shopping', icon: 'cart-outline', color: '#EC4899' },
  { id: 'health', name: 'Healthcare', icon: 'medkit-outline', color: '#10B981' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film-outline', color: '#8B5CF6' },
  { id: 'groceries', name: 'Groceries', icon: 'basket-outline', color: '#14B8A6' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

const INCOME_CATEGORIES: CategoryOption[] = [
  { id: 'salary', name: 'Salary', icon: 'cash-outline', color: '#10B981' },
  { id: 'business', name: 'Business', icon: 'briefcase-outline', color: '#3B82F6' },
  { id: 'freelance', name: 'Freelance', icon: 'laptop-outline', color: '#8B5CF6' },
  { id: 'investment', name: 'Investments', icon: 'trending-up-outline', color: '#F59E0B' },
  { id: 'gift', name: 'Gifts & Rewards', icon: 'gift-outline', color: '#EC4899' },
  { id: 'other_in', name: 'Other Income', icon: 'add-circle-outline', color: '#14B8A6' },
];

const ACCOUNTS = [
  { id: 'cash', name: 'Cash in Hand', icon: 'wallet-outline' as const },
  { id: 'meezan', name: 'Meezan Bank', icon: 'business-outline' as const },
  { id: 'sadapay', name: 'SadaPay', icon: 'card-outline' as const },
  { id: 'easypaisa', name: 'EasyPaisa', icon: 'phone-portrait-outline' as const },
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { totalBalance, totalIncome, totalExpenses, updateFinancialSummary } = useAppStore();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('850');
  const [selectedCategory, setSelectedCategory] = useState<string>('food');
  const [selectedAccount, setSelectedAccount] = useState<string>('cash');
  const [note, setNote] = useState<string>('');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount > 0) {
      if (type === 'income') {
        updateFinancialSummary({
          totalBalance: totalBalance + numAmount,
          totalIncome: totalIncome + numAmount,
          totalExpenses: totalExpenses,
        });
      } else {
        updateFinancialSummary({
          totalBalance: totalBalance - numAmount,
          totalIncome: totalIncome,
          totalExpenses: totalExpenses + numAmount,
        });
      }
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <ThemedText variant="title3" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              Add Transaction
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Income / Expense Pill Switch (Figma Screen 4) */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => {
                  setType('expense');
                  setSelectedCategory('food');
                }}
                style={[
                  styles.togglePill,
                  type === 'expense' && { backgroundColor: '#EF4444' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    type === 'expense' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  Expense
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setType('income');
                  setSelectedCategory('salary');
                }}
                style={[
                  styles.togglePill,
                  type === 'income' && { backgroundColor: '#10B981' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.toggleText,
                    type === 'income' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  Income
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Amount Input Box */}
            <View style={styles.amountCard}>
              <ThemedText variant="caption" style={{ color: '#94A3B8', marginBottom: 4 }}>
                ENTER AMOUNT
              </ThemedText>
              <View style={styles.amountInputRow}>
                <ThemedText style={styles.currencyPrefix}>PKR</ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  style={styles.amountInput}
                  autoFocus={false}
                />
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.section}>
              <ThemedText variant="label" style={styles.sectionLabel}>
                SELECT CATEGORY
              </ThemedText>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      style={[
                        styles.categoryItem,
                        isSelected && {
                          borderColor: type === 'income' ? '#10B981' : '#EF4444',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <View style={[styles.categoryIconCircle, { backgroundColor: cat.color + '25' }]}>
                        <Ionicons name={cat.icon} size={20} color={cat.color} />
                      </View>
                      <ThemedText
                        style={[
                          styles.categoryName,
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Account Selector */}
            <View style={styles.section}>
              <ThemedText variant="label" style={styles.sectionLabel}>
                PAID VIA / ACCOUNT
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
                {ACCOUNTS.map((acc) => {
                  const isSelected = selectedAccount === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setSelectedAccount(acc.id)}
                      style={[
                        styles.accountChip,
                        isSelected && {
                          borderColor: '#10B981',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={acc.icon}
                        size={16}
                        color={isSelected ? '#10B981' : '#94A3B8'}
                        style={{ marginRight: 6 }}
                      />
                      <ThemedText
                        style={[
                          styles.accountChipText,
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {acc.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Note / Description */}
            <View style={styles.section}>
              <ThemedText variant="label" style={styles.sectionLabel}>
                NOTE / REMARKS (OPTIONAL)
              </ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Dinner with family at Monal"
                placeholderTextColor="#64748B"
                style={styles.noteInput}
              />
            </View>
          </ScrollView>

          {/* Bottom CTA Button */}
          <View style={styles.footer}>
            <ThemedButton
              title="Save Transaction"
              variant="cta"
              size="lg"
              fullWidth
              onPress={handleSave}
              style={[
                styles.saveButton,
                { backgroundColor: type === 'income' ? '#10B981' : '#10B981' },
              ]}
              iconRight={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222F45',
  },
  togglePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  toggleText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  amountCard: {
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222F45',
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
    marginRight: Spacing.sm,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 120,
    textAlign: 'left',
    padding: 0,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    color: '#94A3B8',
    marginBottom: Spacing.sm,
    letterSpacing: 0.6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryItem: {
    width: '23%',
    backgroundColor: '#151D2A',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222F45',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  accountRow: {
    flexDirection: 'row',
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151D2A',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#222F45',
    marginRight: Spacing.sm,
  },
  accountChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  noteInput: {
    backgroundColor: '#151D2A',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: '#222F45',
    color: '#FFFFFF',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0B0F17',
  },
  saveButton: {
    borderRadius: Radius.xl,
  },
});
