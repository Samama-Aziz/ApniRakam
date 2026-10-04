import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { categoryRepository } from '@/database';
import { transactionRepository } from '@/database';
import type { CategoryRecord, AccountRecord } from '@/database/repositories/types';
import { formatDate } from '@/utils/formatters';
import { getCategoryMeta } from '@/utils/categoryMeta';
import { AddCategoryModal } from '@/components/modals/AddCategoryModal';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';

const ACCOUNT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'wallet-outline',
  bank: 'business-outline',
  wallet: 'phone-portrait-outline',
  savings: 'save-outline',
  credit: 'card-outline',
};

// ─── Simple inline date picker modal ─────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DatePickerModalProps {
  visible: boolean;
  selected: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

function DatePickerModal({ visible, selected, onConfirm, onClose }: DatePickerModalProps) {
  const { colors } = useTheme();
  const [day, setDay] = useState(selected.getDate());
  const [month, setMonth] = useState(selected.getMonth());
  const [year, setYear] = useState(selected.getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    onConfirm(new Date(year, month, safeDay));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={[dp.sheet, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
          <View style={dp.header}>
            <ThemedText style={[dp.title, { color: colors.text }]}>Select Date</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Pill selectors row */}
          <View style={dp.row}>
            {/* Day */}
            <View style={dp.column}>
              <ThemedText style={[dp.colLabel, { color: colors.textSecondary }]}>DAY</ThemedText>
              <ScrollView style={dp.scroll} showsVerticalScrollIndicator={false}>
                {days.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDay(d)}
                    style={[
                      dp.item,
                      day === d && { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }
                    ]}
                  >
                    <ThemedText style={[dp.itemText, { color: colors.textSecondary }, day === d && { color: colors.primary, fontWeight: '800' }]}>
                      {String(d).padStart(2, '0')}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month */}
            <View style={dp.column}>
              <ThemedText style={[dp.colLabel, { color: colors.textSecondary }]}>MONTH</ThemedText>
              <ScrollView style={dp.scroll} showsVerticalScrollIndicator={false}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMonth(i)}
                    style={[
                      dp.item,
                      month === i && { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }
                    ]}
                  >
                    <ThemedText style={[dp.itemText, { color: colors.textSecondary }, month === i && { color: colors.primary, fontWeight: '800' }]}>
                      {m}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year */}
            <View style={dp.column}>
              <ThemedText style={[dp.colLabel, { color: colors.textSecondary }]}>YEAR</ThemedText>
              <ScrollView style={dp.scroll} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => setYear(y)}
                    style={[
                      dp.item,
                      year === y && { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1 }
                    ]}
                  >
                    <ThemedText style={[dp.itemText, { color: colors.textSecondary }, year === y && { color: colors.primary, fontWeight: '800' }]}>
                      {y}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={[dp.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
            <ThemedText style={dp.confirmText}>Confirm Date</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  colLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center', marginBottom: 8 },
  scroll: { height: 180 },
  item: { paddingVertical: 10, alignItems: 'center', borderRadius: 10, marginBottom: 2 },
  itemText: { fontSize: 15, fontWeight: '500' },
  confirmBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddTransactionScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { accounts, addTransactionToStore } = useAppStore();

  // Form state
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modals for adding custom categories & accounts
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'destructive' | 'warning' | 'info' | 'success' | 'default';
    buttons?: AlertButton[];
  } | null>(null);

  // DB-loaded data
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load categories from DB when type changes
  const loadCategories = useCallback(async (txType: 'expense' | 'income', selectCatId?: string) => {
    setIsLoadingCategories(true);
    try {
      const rawCats = await categoryRepository.getByType(txType);
      // Always sort "Other/Others" to the bottom
      const cats = [...rawCats].sort((a, b) => {
        const aOther = a.name.toLowerCase().includes('other');
        const bOther = b.name.toLowerCase().includes('other');
        if (aOther && !bOther) return 1;
        if (!aOther && bOther) return -1;
        return 0;
      });
      setCategories(cats);
      if (selectCatId) {
        setSelectedCategoryId(selectCatId);
      } else if (cats.length > 0) {
        setSelectedCategoryId((prev) => (cats.some((c) => c.id === prev) ? prev : cats[0].id));
      }
    } catch (e) {
      console.error('[AddTransaction] Failed to load categories:', e);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories(type);
  }, [type, loadCategories]);

  // Auto-select first account from store if none selected
  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId))) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // ─── Validation & Save ─────────────────────────────────────────────────────

  const handleSave = async () => {
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Amount Required',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    if (!selectedCategoryId) {
      setAlertConfig({
        visible: true,
        title: 'Category Required',
        message: 'Please select a category for this transaction.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    if (!selectedAccountId) {
      setAlertConfig({
        visible: true,
        title: 'Account Required',
        message: 'Please select an account.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    setIsSaving(true);
    try {
      const tx = await transactionRepository.create({
        type,
        amount: numAmount,
        account_id: selectedAccountId,
        category_id: selectedCategoryId,
        date: selectedDate.toISOString(),
        note: note.trim() || null,
      });
      // Optimistic update — no need to reload all data
      addTransactionToStore(tx);
      router.back();
    } catch (e) {
      console.error('[AddTransaction] Save failed:', e);
      setAlertConfig({
        visible: true,
        title: 'Save Failed',
        message: 'Something went wrong saving the transaction. Please try again.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTypeSwitch = (newType: 'expense' | 'income') => {
    setType(newType);
    setSelectedCategoryId('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant="title3" style={{ color: colors.text, fontWeight: '700' }}>
              Add Transaction
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Income / Expense Toggle */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('expense')}
                style={[styles.togglePill, type === 'expense' && { backgroundColor: colors.expense }]}
              >
                <Ionicons name="arrow-up" size={14} color={type === 'expense' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'expense' && { color: '#FFFFFF', fontWeight: '700' }]}>
                  Expense
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('income')}
                style={[styles.togglePill, type === 'income' && { backgroundColor: colors.income }]}
              >
                <Ionicons name="arrow-down" size={14} color={type === 'income' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'income' && { color: '#FFFFFF', fontWeight: '700' }]}>
                  Income
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
              <ThemedText variant="caption" style={[styles.amountLabel, { color: colors.textSecondary }]}>ENTER AMOUNT</ThemedText>
              <View style={styles.amountInputRow}>
                <ThemedText style={[styles.currencyPrefix, { color: type === 'income' ? colors.income : colors.expense }]}>
                  PKR
                </ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.amountInput, { color: colors.text }]}
                  autoFocus={false}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Date Picker */}
            <View style={styles.section}>
              <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE</ThemedText>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <ThemedText style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(selectedDate, 'medium')}
                </ThemedText>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            {/* Category Selector */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT CATEGORY</ThemedText>
              </View>
              {isLoadingCategories ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>Loading categories…</ThemedText>
                </View>
              ) : (
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const meta = getCategoryMeta(cat.name, categories);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        style={[
                          styles.categoryItem,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 },
                          isSelected && {
                            borderColor: meta.color,
                            backgroundColor: meta.color + '20',
                          },
                        ]}
                      >
                        <View style={[styles.categoryIconCircle, { backgroundColor: meta.color + '25' }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <ThemedText
                          style={[styles.categoryName, { color: colors.textSecondary }, isSelected && { color: colors.text, fontWeight: '700' }]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => setShowAddCategoryModal(true)}
                    style={[
                      styles.categoryItem,
                      styles.addCategoryCard,
                      { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconCircle, { backgroundColor: colors.surface }]}>
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </View>
                    <ThemedText style={[styles.categoryName, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
                      + New
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Account Selector */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>PAID VIA / ACCOUNT</ThemedText>
              </View>
              {accounts.length === 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>No accounts found.</ThemedText>
                  <TouchableOpacity
                    onPress={() => setShowAddAccountModal(true)}
                    style={[styles.addInlineBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <ThemedText style={[styles.addInlineText, { color: colors.primary }]}>Create Account</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
                  {accounts.map((acc: AccountRecord) => {
                    const isSelected = selectedAccountId === acc.id;
                    const icon = ACCOUNT_ICON_MAP[acc.type] ?? 'wallet-outline';
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        style={[
                          styles.accountChip,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 },
                          isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <Ionicons
                          name={icon}
                          size={16}
                          color={isSelected ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <ThemedText
                          style={[styles.accountChipText, { color: colors.textSecondary }, isSelected && { color: colors.primary, fontWeight: '700' }]}
                        >
                          {acc.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => setShowAddAccountModal(true)}
                    style={[
                      styles.accountChip,
                      { borderColor: colors.primary + '40', backgroundColor: colors.primaryLight },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                    <ThemedText style={[styles.accountChipText, { color: colors.primary, fontWeight: '700' }]}>
                      + New Account
                    </ThemedText>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>

            {/* Note / Description */}
            <View style={styles.section}>
              <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTE (OPTIONAL)</ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Dinner with family at Monal"
                placeholderTextColor={colors.textTertiary}
                style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, color: colors.text }]}
                multiline
                numberOfLines={2}
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          {/* Save Button — Simple & Text-Focused */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle, backgroundColor: colors.background }]}>
            <ThemedButton
              title="Save Transaction"
              variant="cta"
              size="lg"
              fullWidth
              onPress={handleSave}
              disabled={isSaving}
              loading={isSaving}
              style={[
                styles.saveButton,
                { backgroundColor: type === 'income' ? colors.income : colors.expense },
              ]}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selected={selectedDate}
        onConfirm={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Add Custom Category Modal */}
      <AddCategoryModal
        visible={showAddCategoryModal}
        initialType={type}
        onClose={() => setShowAddCategoryModal(false)}
        onCategoryCreated={(newCat) => {
          void loadCategories(type, newCat.id);
        }}
      />

      {/* Add Custom Account Modal */}
      <AddAccountModal
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAccountCreated={(newAcc) => {
          setSelectedAccountId(newAcc.id);
        }}
      />

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40, height: 40,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  amountCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  amountLabel: { marginBottom: 4, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencyPrefix: { fontSize: 22, fontWeight: '800', marginRight: Spacing.sm },
  amountInput: {
    fontSize: 38, fontWeight: '800',
    minWidth: 120, textAlign: 'left', padding: 0,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionLabel: { letterSpacing: 0.6, fontSize: 11, fontWeight: '700' },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  addInlineText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  dateText: { fontSize: 14, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: Spacing.md },
  loadingText: { fontSize: 13 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryItem: {
    width: '22.5%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  addCategoryCard: {
    borderStyle: 'dashed',
  },
  categoryIconCircle: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  categoryName: { fontSize: 10, textAlign: 'center' },
  accountRow: { flexDirection: 'row' },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  accountChipText: { fontSize: 12, fontWeight: '500' },
  noteInput: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 72,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
  },
  saveButton: { borderRadius: Radius.xl },
});
