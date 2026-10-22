import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboard } from '@/hooks/useKeyboard';
import { transactionRepository, categoryRepository } from '@/database';
import { formatDate } from '@/utils/formatters';
import { getCategoryMeta, getCategoryDisplayName } from '@/utils/categoryMeta';
import { AddCategoryModal } from './AddCategoryModal';
import { AddAccountModal } from './AddAccountModal';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';
import type { TransactionRecord, CategoryRecord, AccountRecord } from '@/database/repositories/types';

import { DatePickerModal } from './DatePickerModal';

const ACCOUNT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'wallet-outline',
  bank: 'business-outline',
  wallet: 'phone-portrait-outline',
  savings: 'save-outline',
  credit: 'card-outline',
};

// ─── Edit Transaction Modal ─────────────────────────────────────────────────

export interface EditTransactionModalProps {
  visible: boolean;
  transaction: TransactionRecord | null;
  onClose: () => void;
  onUpdated?: (tx: TransactionRecord) => void;
  onDeleted?: (id: string) => void;
}

export function EditTransactionModal({
  visible,
  transaction,
  onClose,
  onUpdated,
  onDeleted,
}: EditTransactionModalProps) {
  const { colors, isDark } = useTheme();
  const { accounts, updateTransactionInStore, removeTransactionFromStore, loadAppData, currencySymbol, currency } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const scrollRef = useRef<ScrollView>(null);

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedToAccountId, setSelectedToAccountId] = useState('');
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modals for adding custom categories & accounts
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Custom alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  // DB-loaded categories
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Populate from transaction on opening
  useEffect(() => {
    if (transaction && visible) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setSelectedCategoryId(transaction.category_id || '');
      setSelectedAccountId(transaction.account_id);
      setSelectedToAccountId(transaction.to_account_id || '');
      setNote(transaction.note || '');
      setSelectedDate(new Date(transaction.date));
    }
  }, [transaction, visible]);

  // Load categories matching selected type
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
      }
    } catch (e) {
      console.error('[EditTransaction] Failed to load categories:', e);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (visible && (type === 'expense' || type === 'income')) {
      void loadCategories(type, selectedCategoryId);
    }
  }, [visible, type, loadCategories]);

  const handleTypeSwitch = (newType: 'expense' | 'income') => {
    setType(newType);
    void loadCategories(newType);
  };

  const handleSave = async () => {
    if (!transaction) return;

    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Amount Required',
        message: 'Please enter a valid amount greater than 0.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (!selectedAccountId) {
      setAlertConfig({
        visible: true,
        title: 'Account Required',
        message: 'Please select an account.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (type === 'transfer') {
      if (!selectedToAccountId) {
        setAlertConfig({
          visible: true,
          title: 'Destination Account Required',
          message: 'Please select the destination account.',
          buttons: [{ text: 'OK' }],
        });
        return;
      }
      if (selectedAccountId === selectedToAccountId) {
        setAlertConfig({
          visible: true,
          title: 'Invalid Transfer',
          message: 'Source and destination accounts must be different.',
          buttons: [{ text: 'OK' }],
        });
        return;
      }
    } else if (!selectedCategoryId) {
      setAlertConfig({
        visible: true,
        title: 'Category Required',
        message: 'Please select a category for this transaction.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await transactionRepository.update(transaction.id, {
        type,
        amount: numAmount,
        account_id: selectedAccountId,
        to_account_id: type === 'transfer' ? selectedToAccountId : null,
        category_id: type === 'transfer' ? null : selectedCategoryId,
        date: selectedDate.toISOString(),
        note: note.trim() || null,
      });

      if (updated) {
        updateTransactionInStore(updated);
        await loadAppData();
        if (onUpdated) onUpdated(updated);
      }

      onClose();
    } catch (e) {
      console.error('[EditTransaction] Update failed:', e);
      setAlertConfig({
        visible: true,
        title: 'Save Failed',
        message: 'Could not update transaction. Please try again.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;

    setAlertConfig({
      visible: true,
      title: 'Delete Transaction',
      message: `Are you sure you want to delete this ${transaction.type} transaction of ${sym} ${transaction.amount.toLocaleString()}? This action cannot be undone.`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const success = await transactionRepository.delete(transaction.id);
              if (success) {
                removeTransactionFromStore(transaction.id);
                await loadAppData();
                if (onDeleted) onDeleted(transaction.id);
                onClose();
              } else {
                setAlertConfig({
                  visible: true,
                  title: 'Error',
                  message: 'Could not delete transaction.',
                  type: 'destructive',
                  buttons: [{ text: 'OK' }],
                });
              }
            } catch (err) {
              console.error('Failed to delete transaction:', err);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'An error occurred while deleting transaction.',
                type: 'destructive',
                buttons: [{ text: 'OK' }],
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
  };

  if (!transaction) return null;

  return (
    <>
      <Modal visible={visible} transparent statusBarTranslucent={true} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={[styles.overlay, Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                shadowColor: colors.cardShadow,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 16,
                elevation: 16,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <ThemedText variant="title3" style={[styles.title, { color: colors.text }]}>
                  {type === 'transfer' ? 'Edit Transfer' : 'Edit Transaction'}
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {type === 'transfer' ? 'Modify transfer amount, accounts, date or note' : 'Modify amount, category, account or note'}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
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
              {/* Type Switcher */}
              {type === 'transfer' ? (
                <View
                  style={[
                    styles.toggleContainer,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary,
                      borderColor: '#0EA5E9' + '40',
                    },
                  ]}
                >
                  <View style={[styles.togglePill, { backgroundColor: '#0EA5E9' }]}>
                    <Ionicons name="swap-horizontal" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <ThemedText style={[styles.toggleText, { color: '#FFFFFF', fontWeight: '700' }]}>
                      Transfer / ATM Withdrawal
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.toggleContainer,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleTypeSwitch('expense')}
                    style={[
                      styles.togglePill,
                      type === 'expense' && { backgroundColor: colors.expense },
                    ]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={14}
                      color={type === 'expense' ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.toggleText,
                        { color: colors.textSecondary },
                        type === 'expense' && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      Expense
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleTypeSwitch('income')}
                    style={[
                      styles.togglePill,
                      type === 'income' && { backgroundColor: colors.income },
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={14}
                      color={type === 'income' ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.toggleText,
                        { color: colors.textSecondary },
                        type === 'income' && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      Income
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Amount Input */}
              <View
                style={[
                  styles.amountCard,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                    shadowColor: colors.cardShadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.2 : 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  },
                ]}
              >
                <ThemedText variant="caption" style={[styles.amountLabel, { color: colors.textSecondary }]}>
                  AMOUNT
                </ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText
                    style={[
                      styles.currencyPrefix,
                      { color: type === 'transfer' ? '#0EA5E9' : type === 'income' ? colors.income : colors.expense },
                    ]}
                  >
                    {sym}
                  </ThemedText>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.amountInput, { color: colors.text }]}
                  />
                </View>
              </View>

              {/* Date Button */}
              <View style={styles.section}>
                <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  DATE
                </ThemedText>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                  <ThemedText style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(selectedDate, 'medium')}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>

              {/* Category Selector (Expense & Income only) */}
              {(type === 'expense' || type === 'income') && (
                <View style={styles.section}>
                  <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    CATEGORY
                  </ThemedText>

                  {isLoadingCategories ? (
                    <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 12 }} />
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
                              {
                                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                                borderColor: isSelected ? meta.color : colors.borderSubtle,
                              },
                              isSelected && {
                                borderWidth: 1.5,
                                backgroundColor: meta.color + (isDark ? '25' : '15'),
                              },
                            ]}
                          >
                            <View style={[styles.categoryIconCircle, { backgroundColor: meta.color + '25' }]}>
                              <Ionicons name={meta.icon} size={20} color={meta.color} />
                            </View>
                            <ThemedText
                              style={[
                                styles.categoryName,
                                { color: colors.textSecondary },
                                isSelected && { color: colors.text, fontWeight: '700' },
                              ]}
                              numberOfLines={1}
                            >
                              {cat.name}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Clean inline "+ New" category option */}
                      <TouchableOpacity
                        onPress={() => setShowAddCategoryModal(true)}
                        style={[
                          styles.categoryItem,
                          styles.addCategoryItem,
                          {
                            borderColor: isDark ? colors.borderSubtle : '#CBD5E1',
                            borderStyle: 'dashed',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.categoryIconCircle,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
                          ]}
                        >
                          <Ionicons name="add" size={20} color={colors.textSecondary} />
                        </View>
                        <ThemedText style={[styles.categoryName, { color: colors.textSecondary }]} numberOfLines={1}>
                          + New
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Account Selector (From & To for Transfer, single account for others) */}
              {type === 'transfer' ? (
                <>
                  <View style={styles.section}>
                    <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      FROM ACCOUNT (DEBITED)
                    </ThemedText>
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
                              {
                                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                                borderColor: isSelected ? '#EF4444' : colors.borderSubtle,
                              },
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
                                borderWidth: 1.5,
                              },
                            ]}
                          >
                            <Ionicons
                              name={icon}
                              size={16}
                              color={isSelected ? '#EF4444' : colors.textSecondary}
                              style={{ marginRight: 6 }}
                            />
                            <ThemedText
                              style={[
                                styles.accountChipText,
                                { color: colors.textSecondary },
                                isSelected && { color: '#EF4444', fontWeight: '700' },
                              ]}
                            >
                              {acc.name}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.section}>
                    <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                      TO ACCOUNT (CREDITED)
                    </ThemedText>
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
                              {
                                backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                                borderColor: isSelected ? '#10B981' : colors.borderSubtle,
                              },
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
                                borderWidth: 1.5,
                              },
                            ]}
                          >
                            <Ionicons
                              name={icon}
                              size={16}
                              color={isSelected ? '#10B981' : colors.textSecondary}
                              style={{ marginRight: 6 }}
                            />
                            <ThemedText
                              style={[
                                styles.accountChipText,
                                { color: colors.textSecondary },
                                isSelected && { color: '#10B981', fontWeight: '700' },
                              ]}
                            >
                              {acc.name}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </>
              ) : (
                <View style={styles.section}>
                  <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    ACCOUNT
                  </ThemedText>

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
                            {
                              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                              borderColor: isSelected ? colors.primary : colors.borderSubtle,
                            },
                            isSelected && {
                              backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : colors.primaryLight,
                              borderWidth: 1.5,
                            },
                          ]}
                        >
                          <Ionicons
                            name={icon}
                            size={16}
                            color={isSelected ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <ThemedText
                            style={[
                              styles.accountChipText,
                              { color: colors.textSecondary },
                              isSelected && { color: colors.text, fontWeight: '700' },
                            ]}
                          >
                            {acc.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}

                    {/* Clean inline "+ New Account" chip */}
                    <TouchableOpacity
                      onPress={() => setShowAddAccountModal(true)}
                      style={[
                        styles.accountChip,
                        styles.addAccountChip,
                        {
                          borderColor: isDark ? colors.borderSubtle : '#CBD5E1',
                          borderStyle: 'dashed',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                        },
                      ]}
                    >
                      <Ionicons name="add" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                      <ThemedText style={[styles.accountChipText, { color: colors.textSecondary }]}>
                        New Account
                      </ThemedText>
                    </TouchableOpacity>
                  </ScrollView>
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
                  placeholder="e.g. Dinner with family at Monal"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                      borderColor: colors.borderSubtle,
                      color: colors.text,
                    },
                  ]}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Footer Buttons: Delete + Save */}
            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                onPress={handleDelete}
                style={[
                  styles.deleteBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FFE4E6',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECDD3',
                  },
                ]}
                disabled={isDeleting || isSaving}
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.expense} size="small" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color={colors.expense} />
                )}
              </TouchableOpacity>
              <ThemedButton
                title={isSaving ? 'Updating…' : 'Update Transaction'}
                variant="cta"
                onPress={handleSave}
                disabled={isSaving || isDeleting}
                style={[
                  styles.saveBtn,
                  { backgroundColor: type === 'income' ? colors.income : colors.expense },
                ]}
              />
            </View>
          </View>

          {/* Custom alert within modal presentation */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            buttons={alertConfig.buttons}
            onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
            isInsideModal={true}
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selected={selectedDate}
        onConfirm={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        visible={showAddCategoryModal}
        initialType={type === 'income' ? 'income' : 'expense'}
        onClose={() => setShowAddCategoryModal(false)}
        onCategoryCreated={(newCat) => {
          void loadCategories(type === 'income' ? 'income' : 'expense', newCat.id);
        }}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAccountCreated={(newAcc) => {
          setSelectedAccountId(newAcc.id);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  toggleExpenseActive: {},
  toggleIncomeActive: {},
  toggleText: { fontSize: 13, fontWeight: '600' },
  amountCard: {
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  amountLabel: { marginBottom: 4, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencyPrefix: { fontSize: 20, fontWeight: '800', marginRight: Spacing.sm },
  amountInput: {
    fontSize: 32, fontWeight: '800',
    minWidth: 100, textAlign: 'left', padding: 0,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: { letterSpacing: 0.6, fontSize: 11, fontWeight: '700', marginBottom: Spacing.sm },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  addInlineText: { fontSize: 11, fontWeight: '700' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
  },
  dateText: { fontSize: 14, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryItem: {
    width: '22.5%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addCategoryItem: {
    borderWidth: 1.5,
  },
  categoryIconCircle: {
    width: 36, height: 36,
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
  },
  addAccountChip: {
    borderWidth: 1.5,
  },
  accountChipText: { fontSize: 12, fontWeight: '500' },
  noteInput: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 64,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  saveBtn: {
    flex: 1,
    borderRadius: Radius.xl,
  },
});

export default EditTransactionModal;

