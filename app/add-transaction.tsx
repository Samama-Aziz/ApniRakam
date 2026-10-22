import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useKeyboard } from '@/hooks/useKeyboard';
import { useAppStore } from '@/store/useAppStore';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { categoryRepository, transactionRepository, loanRepository } from '@/database';
import type { CategoryRecord, AccountRecord, LoanType } from '@/database/repositories/types';
import { formatDate } from '@/utils/formatters';
import { getCategoryMeta } from '@/utils/categoryMeta';
import { AddCategoryModal } from '@/components/modals/AddCategoryModal';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';

import { DatePickerModal } from '@/components/modals/DatePickerModal';

const ACCOUNT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'wallet-outline',
  bank: 'business-outline',
  wallet: 'phone-portrait-outline',
  savings: 'save-outline',
  credit: 'card-outline',
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AddTransactionScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    accounts,
    addTransactionToStore,
    addLoanToStore,
    loadAppData,
    defaultCategoryId,
    defaultAccountId,
    currencySymbol,
    currency,
  } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';
  const { isKeyboardVisible, keyboardHeight } = useKeyboard();
  const scrollRef = useRef<ScrollView>(null);

  // Form state
  const [type, setType] = useState<'expense' | 'income' | 'transfer' | 'loan'>('expense');
  const [transferPreset, setTransferPreset] = useState<'atm' | 'custom'>('atm');
  const [selectedToAccountId, setSelectedToAccountId] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('lent');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId || '');
  const [note, setNote] = useState('');
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  useEffect(() => {
    if (isKeyboardVisible && isNotesFocused) {
      const t1 = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      const t2 = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 280);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isKeyboardVisible, isNotesFocused]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

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

  // Load categories from DB when type changes (only for expense/income)
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
      } else if (defaultCategoryId && cats.some((c) => c.id === defaultCategoryId)) {
        setSelectedCategoryId(defaultCategoryId);
      } else if (cats.length > 0) {
        setSelectedCategoryId((prev) => (cats.some((c) => c.id === prev) ? prev : cats[0].id));
      }
    } catch (e) {
      console.error('[AddTransaction] Failed to load categories:', e);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [defaultCategoryId]);

  useEffect(() => {
    if (type === 'expense' || type === 'income') {
      void loadCategories(type);
    }
  }, [type, loadCategories]);

  // Auto-select pre-selected default account or first account
  useEffect(() => {
    if (accounts.length > 0 && (!selectedAccountId || !accounts.some((a) => a.id === selectedAccountId))) {
      if (defaultAccountId && accounts.some((a) => a.id === defaultAccountId)) {
        setSelectedAccountId(defaultAccountId);
      } else {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [accounts, selectedAccountId, defaultAccountId]);

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

    // ─── Transfer / ATM Withdrawal Flow ──────────────────────────────────────
    if (type === 'transfer') {
      if (!selectedToAccountId) {
        setAlertConfig({
          visible: true,
          title: 'Destination Account Required',
          message: 'Please select the destination account (e.g. Cash Wallet).',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      if (selectedAccountId === selectedToAccountId) {
        setAlertConfig({
          visible: true,
          title: 'Invalid Transfer',
          message: 'Source and destination accounts must be different.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      setIsSaving(true);
      try {
        const defaultNote = transferPreset === 'atm' ? 'ATM Withdrawal' : 'Account Transfer';
        const tx = await transactionRepository.create({
          type: 'transfer',
          amount: numAmount,
          account_id: selectedAccountId,
          to_account_id: selectedToAccountId,
          category_id: null,
          date: selectedDate.toISOString(),
          note: note.trim() || defaultNote,
        });

        addTransactionToStore(tx);
        await loadAppData();
        router.back();
      } catch (e) {
        console.error('[AddTransaction] Save transfer failed:', e);
        setAlertConfig({
          visible: true,
          title: 'Save Failed',
          message: 'Something went wrong saving the transfer. Please try again.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ─── Loan Save Flow ──────────────────────────────────────────────────────
    if (type === 'loan') {
      if (!personName.trim()) {
        setAlertConfig({
          visible: true,
          title: 'Person Name Required',
          message:
            loanType === 'lent'
              ? 'Please enter the name of the person you gave this loan to.'
              : 'Please enter the name of the person you borrowed this loan from.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }

      setIsSaving(true);
      try {
        const loan = await loanRepository.create({
          type: loanType,
          person_name: personName.trim(),
          amount: numAmount,
          account_id: selectedAccountId,
          date: selectedDate.toISOString(),
          due_date: dueDate ? dueDate.toISOString() : null,
          note: note.trim() || null,
        });

        addLoanToStore(loan);
        await loadAppData();
        router.back();
      } catch (e) {
        console.error('[AddTransaction] Save loan failed:', e);
        setAlertConfig({
          visible: true,
          title: 'Save Failed',
          message: 'Something went wrong saving the loan. Please try again.',
          type: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ─── Regular Transaction Flow ────────────────────────────────────────────
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

  const handleTypeSwitch = (newType: 'expense' | 'income' | 'transfer' | 'loan') => {
    setType(newType);
    if (newType === 'transfer') {
      setSelectedCategoryId('');
      setTransferPreset('atm');
      // Preset Bank -> Cash
      const bank = accounts.find((a) => a.type === 'bank') || accounts[0];
      const cash = accounts.find((a) => a.type === 'cash') || accounts.find((a) => a.id !== bank?.id);
      if (bank) setSelectedAccountId(bank.id);
      if (cash) setSelectedToAccountId(cash.id);
    } else if (newType !== 'loan') {
      setSelectedCategoryId('');
    }
  };

  const themeAccentColor =
    type === 'loan'
      ? loanType === 'lent'
        ? '#F59E0B'
        : '#8B5CF6'
      : type === 'transfer'
      ? '#0EA5E9'
      : type === 'income'
      ? colors.income
      : colors.expense;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText variant="title3" style={{ color: colors.text, fontWeight: '700' }}>
              {type === 'loan'
                ? 'Add Loan Record'
                : type === 'transfer'
                ? transferPreset === 'atm'
                  ? 'ATM Withdrawal'
                  : 'Transfer Funds'
                : 'Add Transaction'}
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && { paddingBottom: 220 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* 4-way Segmented Toggle: Expense | Income | Transfer | Loan */}
            <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('expense')}
                style={[styles.togglePill, type === 'expense' && { backgroundColor: colors.expense }]}
              >
                <Ionicons name="arrow-up" size={12} color={type === 'expense' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 2 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'expense' && { color: '#FFFFFF', fontWeight: '700' }]} numberOfLines={1}>
                  Expense
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('income')}
                style={[styles.togglePill, type === 'income' && { backgroundColor: colors.income }]}
              >
                <Ionicons name="arrow-down" size={12} color={type === 'income' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 2 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'income' && { color: '#FFFFFF', fontWeight: '700' }]} numberOfLines={1}>
                  Income
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('transfer')}
                style={[styles.togglePill, type === 'transfer' && { backgroundColor: '#0EA5E9' }]}
              >
                <Ionicons name="swap-horizontal" size={12} color={type === 'transfer' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 2 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'transfer' && { color: '#FFFFFF', fontWeight: '700' }]} numberOfLines={1}>
                  Transfer
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTypeSwitch('loan')}
                style={[
                  styles.togglePill,
                  type === 'loan' && { backgroundColor: loanType === 'lent' ? '#F59E0B' : '#8B5CF6' },
                ]}
              >
                <Ionicons name="repeat" size={12} color={type === 'loan' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 2 }} />
                <ThemedText style={[styles.toggleText, { color: colors.textSecondary }, type === 'loan' && { color: '#FFFFFF', fontWeight: '700' }]} numberOfLines={1}>
                  Loan
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* If Transfer: Preset Toggle (ATM Withdrawal vs Custom Transfer) */}
            {type === 'transfer' && (
              <View style={styles.section}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  TRANSFER TYPE
                </ThemedText>
                <View style={styles.loanDirectionRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setTransferPreset('atm');
                      const bank = accounts.find((a) => a.type === 'bank') || accounts[0];
                      const cash = accounts.find((a) => a.type === 'cash') || accounts.find((a) => a.id !== bank?.id);
                      if (bank) setSelectedAccountId(bank.id);
                      if (cash) setSelectedToAccountId(cash.id);
                    }}
                    style={[
                      styles.loanDirectionCard,
                      {
                        backgroundColor: transferPreset === 'atm' ? (isDark ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE') : colors.surface,
                        borderColor: transferPreset === 'atm' ? '#0EA5E9' : colors.borderSubtle,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cash-outline" size={22} color={transferPreset === 'atm' ? '#0EA5E9' : colors.textSecondary} />
                    <ThemedText style={[styles.loanDirectionTitle, { color: transferPreset === 'atm' ? '#0EA5E9' : colors.text }]}>
                      ATM Withdrawal
                    </ThemedText>
                    <ThemedText style={[styles.loanDirectionSub, { color: colors.textSecondary }]}>
                      Bank Account ➔ Cash Wallet (Net worth stays unchanged)
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setTransferPreset('custom')}
                    style={[
                      styles.loanDirectionCard,
                      {
                        backgroundColor: transferPreset === 'custom' ? (isDark ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE') : colors.surface,
                        borderColor: transferPreset === 'custom' ? '#0EA5E9' : colors.borderSubtle,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="swap-horizontal" size={22} color={transferPreset === 'custom' ? '#0EA5E9' : colors.textSecondary} />
                    <ThemedText style={[styles.loanDirectionTitle, { color: transferPreset === 'custom' ? '#0EA5E9' : colors.text }]}>
                      Custom Transfer
                    </ThemedText>
                    <ThemedText style={[styles.loanDirectionSub, { color: colors.textSecondary }]}>
                      Move funds between any two accounts
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* If Loan: Direction Toggle (Lent vs Borrowed) */}
            {type === 'loan' && (
              <View style={styles.section}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  LOAN TYPE / DIRECTION
                </ThemedText>
                <View style={styles.loanDirectionRow}>
                  <TouchableOpacity
                    onPress={() => setLoanType('lent')}
                    style={[
                      styles.loanDirectionCard,
                      {
                        backgroundColor: loanType === 'lent' ? (isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7') : colors.surface,
                        borderColor: loanType === 'lent' ? '#F59E0B' : colors.borderSubtle,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-up-circle" size={22} color={loanType === 'lent' ? '#F59E0B' : colors.textSecondary} />
                    <ThemedText style={[styles.loanDirectionTitle, { color: loanType === 'lent' ? '#F59E0B' : colors.text }]}>
                      I Lent (Given)
                    </ThemedText>
                    <ThemedText style={[styles.loanDirectionSub, { color: colors.textSecondary }]}>
                      Money leaves my account, I expect it back
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setLoanType('borrowed')}
                    style={[
                      styles.loanDirectionCard,
                      {
                        backgroundColor: loanType === 'borrowed' ? (isDark ? 'rgba(139, 92, 246, 0.18)' : '#EDE9FE') : colors.surface,
                        borderColor: loanType === 'borrowed' ? '#8B5CF6' : colors.borderSubtle,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-down-circle" size={22} color={loanType === 'borrowed' ? '#8B5CF6' : colors.textSecondary} />
                    <ThemedText style={[styles.loanDirectionTitle, { color: loanType === 'borrowed' ? '#8B5CF6' : colors.text }]}>
                      I Borrowed (Taken)
                    </ThemedText>
                    <ThemedText style={[styles.loanDirectionSub, { color: colors.textSecondary }]}>
                      Money enters my account, I owe it back
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* If Loan: Person Name Field */}
            {type === 'loan' && (
              <View style={styles.section}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  {loanType === 'lent' ? 'BORROWER NAME (PERSON GIVEN TO)' : 'LENDER NAME (PERSON BORROWED FROM)'}
                </ThemedText>
                <TextInput
                  value={personName}
                  onChangeText={setPersonName}
                  placeholder="e.g. Ahmed, Cousin, Shopkeeper"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInputFull,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                      color: colors.text,
                    },
                  ]}
                />
              </View>
            )}

            {/* Amount Input */}
            <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
              <ThemedText variant="caption" style={[styles.amountLabel, { color: colors.textSecondary }]}>ENTER AMOUNT</ThemedText>
              <View style={styles.amountInputRow}>
                <ThemedText style={[styles.currencyPrefix, { color: themeAccentColor }]}>
                  {sym}
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
              <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {type === 'loan' ? 'LOAN DATE' : 'TRANSACTION DATE'}
              </ThemedText>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={themeAccentColor} style={{ marginRight: 10 }} />
                <ThemedText style={[styles.dateText, { color: colors.text }]}>
                  {formatDate(selectedDate, 'medium')}
                </ThemedText>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            {/* If Loan: Optional Expected Due Date */}
            {type === 'loan' && (
              <View style={styles.section}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  EXPECTED RETURN DATE (OPTIONAL)
                </ThemedText>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 }]}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={dueDate ? themeAccentColor : colors.textSecondary} style={{ marginRight: 10 }} />
                  <ThemedText style={[styles.dateText, { color: dueDate ? colors.text : colors.textSecondary }]}>
                    {dueDate ? formatDate(dueDate, 'medium') : 'Tap to set expected return date'}
                  </ThemedText>
                  {dueDate ? (
                    <TouchableOpacity onPress={() => setDueDate(null)} style={{ marginLeft: 'auto', padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Category Selector (Expense & Income only) */}
            {(type === 'expense' || type === 'income') && (
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
                      const meta = getCategoryMeta(cat.id, categories);
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
            )}

            {/* Account Selector (From & To if Transfer, Single Account otherwise) */}
            {type === 'transfer' ? (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      FROM ACCOUNT (MONEY WITHDRAWN)
                    </ThemedText>
                  </View>
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
                            isSelected && { borderColor: '#EF4444', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2' },
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={16}
                            color={isSelected ? '#EF4444' : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText
                            style={[styles.accountChipText, { color: colors.textSecondary }, isSelected && { color: '#EF4444', fontWeight: '700' }]}
                          >
                            {acc.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      TO ACCOUNT (MONEY RECEIVED)
                    </ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountRow}>
                    {accounts.map((acc: AccountRecord) => {
                      const isSelected = selectedToAccountId === acc.id;
                      const icon = ACCOUNT_ICON_MAP[acc.type] ?? 'wallet-outline';
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          onPress={() => setSelectedToAccountId(acc.id)}
                          style={[
                            styles.accountChip,
                            { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.15 : 0.03 },
                            isSelected && { borderColor: '#10B981', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5' },
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={16}
                            color={isSelected ? '#10B981' : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText
                            style={[styles.accountChipText, { color: colors.textSecondary }, isSelected && { color: '#10B981', fontWeight: '700' }]}
                          >
                            {acc.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Transfer Info Banner */}
                <View style={[styles.transferInfoBanner, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF', borderColor: '#0EA5E9' + '40' }]}>
                  <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" style={{ marginTop: 1 }} />
                  <ThemedText style={[styles.transferInfoText, { color: colors.text }]}>
                    Transfers move money between your accounts. Net worth remains unchanged and no duplicate income or expense is created.
                  </ThemedText>
                </View>
              </>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    {type === 'loan'
                      ? loanType === 'lent'
                        ? 'ACCOUNT DEBITED (MONEY GIVEN FROM)'
                        : 'ACCOUNT CREDITED (MONEY DEPOSITED TO)'
                      : 'PAID VIA / ACCOUNT'}
                  </ThemedText>
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
                            isSelected && { borderColor: themeAccentColor, backgroundColor: themeAccentColor + '20' },
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={16}
                            color={isSelected ? themeAccentColor : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText
                            style={[styles.accountChipText, { color: colors.textSecondary }, isSelected && { color: themeAccentColor, fontWeight: '700' }]}
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
            )}

            {/* Note / Description */}
            <View style={styles.section}>
              <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                NOTES (OPTIONAL)
              </ThemedText>
              <TextInput
                value={note}
                onChangeText={setNote}
                onFocus={() => {
                  setIsNotesFocused(true);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 280);
                }}
                onBlur={() => setIsNotesFocused(false)}
                placeholder={
                  type === 'loan'
                    ? 'e.g. For medical emergency, promised repayment soon'
                    : type === 'transfer'
                    ? transferPreset === 'atm'
                      ? 'e.g. Cash withdrawal from HBL ATM'
                      : 'e.g. Transferred for monthly cash expenses'
                    : 'e.g. Dinner with family at Monal'
                }
                placeholderTextColor={colors.textTertiary}
                style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, color: colors.text }]}
                multiline
                numberOfLines={2}
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle, backgroundColor: colors.background }]}>
            <ThemedButton
              title={
                type === 'loan'
                  ? loanType === 'lent'
                    ? 'Save Loan (Lent)'
                    : 'Save Loan (Borrowed)'
                  : type === 'transfer'
                  ? transferPreset === 'atm'
                    ? 'Record ATM Withdrawal'
                    : 'Record Transfer'
                  : 'Save Transaction'
              }
              variant="cta"
              size="lg"
              fullWidth
              onPress={handleSave}
              disabled={isSaving}
              loading={isSaving}
              style={[
                styles.saveButton,
                { backgroundColor: themeAccentColor },
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

      {/* Due Date Picker Modal (for Loans) */}
      <DatePickerModal
        visible={showDueDatePicker}
        selected={dueDate || new Date()}
        onConfirm={(date) => { setDueDate(date); setShowDueDatePicker(false); }}
        onClose={() => setShowDueDatePicker(false)}
      />

      {/* Add Custom Category Modal */}
      <AddCategoryModal
        visible={showAddCategoryModal}
        initialType={type === 'income' ? 'income' : 'expense'}
        onClose={() => setShowAddCategoryModal(false)}
        onCategoryCreated={(newCat) => {
          void loadCategories(type === 'income' ? 'income' : 'expense', newCat.id);
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
    paddingBottom: Spacing.xl * 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: 3,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  togglePill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  toggleText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  loanDirectionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  loanDirectionCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    alignItems: 'flex-start',
    gap: 4,
  },
  loanDirectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  loanDirectionSub: {
    fontSize: 10,
    lineHeight: 14,
  },
  textInputFull: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '500',
  },
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
  },
  sectionLabel: { letterSpacing: 0.6, fontSize: 11, fontWeight: '700', marginBottom: Spacing.sm },
  transferInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  transferInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
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
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryItem: {
    width: '23%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
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
