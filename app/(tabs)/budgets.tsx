import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboard } from '@/hooks/useKeyboard';
import { budgetRepository } from '@/database';
import type { BudgetRecord, CategoryRecord } from '@/database/repositories/types';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryMeta, getCategoryDisplayName } from '@/utils/categoryMeta';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── "Others always last" sort ────────────────────────────────────────────────
function sortCategoriesOthersLast<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aOther = a.name.toLowerCase().includes('other');
    const bOther = b.name.toLowerCase().includes('other');
    if (aOther && !bOther) return 1;
    if (!aOther && bOther) return -1;
    return 0;
  });
}

// ─── Add/Edit Budget Sheet ────────────────────────────────────────────────────
type BudgetPeriod = 'monthly' | 'weekly';

interface BudgetSheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: CategoryRecord[];
  existingBudget?: BudgetRecord | null; // null = create mode
  currencySymbol: string;
}

function BudgetSheet({ visible, onClose, onSaved, categories, existingBudget, currencySymbol }: BudgetSheetProps) {
  const { colors, isDark } = useTheme();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const scrollRef = useRef<ScrollView>(null);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  React.useEffect(() => {
    if (isKeyboardVisible && isAmountFocused) {
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
  }, [isKeyboardVisible, isAmountFocused]);

  const expenseCategories = useMemo(() => {
    const list = categories.filter((c) => c.type === 'expense');
    return sortCategoriesOthersLast(list.length > 0 ? list : [
      { id: 'default-expense-food', name: 'Food', type: 'expense' as const, icon: null, is_default: 1, created_at: '', updated_at: '' },
    ]);
  }, [categories]);

  const isEditMode = !!existingBudget;

  const { defaultBudgetPeriod, defaultCategoryId } = useAppStore();
  const resolvedPeriod: BudgetPeriod = defaultBudgetPeriod === 'weekly' ? 'weekly' : 'monthly';
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>(resolvedPeriod);
  const [saving, setSaving] = useState(false);

  // Seed values from existingBudget when editing, or use defaults
  React.useEffect(() => {
    if (visible) {
      if (existingBudget) {
        setSelectedCat(existingBudget.category_id);
        setAmount(String(existingBudget.amount));
        setPeriod((existingBudget.period as BudgetPeriod) || 'monthly');
      } else {
        setAmount('');
        setPeriod(resolvedPeriod);
        const defaultMatch = expenseCategories.find((c) => c.id === defaultCategoryId);
        if (defaultMatch) {
          setSelectedCat(defaultMatch.id);
        } else if (expenseCategories.length > 0) {
          setSelectedCat(expenseCategories[0].id);
        }
      }
    }
  }, [visible, existingBudget, defaultBudgetPeriod, defaultCategoryId, expenseCategories]);

  const buildDates = (p: BudgetPeriod) => {
    const now = new Date();
    if (p === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        start_date: startOfWeek.toISOString().split('T')[0],
        end_date: endOfWeek.toISOString().split('T')[0],
      };
    }
    return {
      start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  };

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid spending limit amount.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    if (!selectedCat) {
      setAlertConfig({
        visible: true,
        title: 'Select Category',
        message: 'Please select a category.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    setSaving(true);
    try {
      const { start_date, end_date } = buildDates(period);
      if (isEditMode && existingBudget) {
        await budgetRepository.update(existingBudget.id, { amount: val, period, start_date, end_date });
      } else {
        await budgetRepository.create({ category_id: selectedCat, amount: val, period, start_date, end_date });
      }
      setAmount('');
      onSaved();
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Could not save budget.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={[
          ms.outerWrap,
          Platform.OS === 'android' && isKeyboardVisible && { paddingBottom: keyboardHeight },
        ]}
      >
        <TouchableOpacity style={ms.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[ms.sheet, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={[ms.handle, { backgroundColor: colors.border }]} />

          <View style={[ms.header, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <ThemedText style={[ms.sheetTitle, { color: colors.text }]}>
                {isEditMode ? 'Edit Budget' : 'Set New Budget'}
              </ThemedText>
              <ThemedText style={[ms.sheetSub, { color: colors.textSecondary }]}>
                {isEditMode ? 'Update the spending limit for this category.' : 'Choose a category and set a spending limit.'}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[ms.closeBtn, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              ms.scrollContent,
              isKeyboardVisible && { paddingBottom: 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* Category Picker — only in create mode */}
            {!isEditMode && (
              <>
                <ThemedText style={[ms.fieldLabel, { color: colors.textSecondary }]}>CATEGORY</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.catRow} keyboardShouldPersistTaps="handled">
                  {expenseCategories.map((cat) => {
                    const meta = getCategoryMeta(cat.id, categories);
                    const isSelected = selectedCat === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setSelectedCat(cat.id)}
                        style={[
                          ms.catChip,
                          { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSubtle },
                          isSelected && { borderColor: meta.color, backgroundColor: meta.color + '25' },
                        ]}
                      >
                        <Ionicons name={meta.icon} size={14} color={isSelected ? meta.color : colors.textSecondary} />
                        <ThemedText style={[ms.catChipText, { color: colors.textSecondary }, isSelected && { color: meta.color, fontWeight: '700' }]}>
                          {cat.name}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Period Selector */}
            <ThemedText style={[ms.fieldLabel, { color: colors.textSecondary }]}>BUDGET PERIOD</ThemedText>
            <View style={[ms.periodRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSubtle }]}>
              {(['monthly', 'weekly'] as BudgetPeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    ms.periodPill,
                    period === p && { backgroundColor: colors.primary },
                  ]}
                >
                  <ThemedText style={[ms.periodText, { color: period === p ? '#FFFFFF' : colors.textSecondary }, period === p && { fontWeight: '700' }]}>
                    {p === 'monthly' ? 'Monthly' : 'Weekly'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <ThemedText style={[ms.fieldLabel, { color: colors.textSecondary }]}>
              {period === 'monthly' ? 'MONTHLY' : 'WEEKLY'} LIMIT ({currencySymbol})
            </ThemedText>
            <View style={[ms.amountRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSubtle }]}>
              <ThemedText style={[ms.currencyPfx, { color: colors.primary }]}>{currencySymbol}</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                onFocus={() => {
                  setIsAmountFocused(true);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 280);
                }}
                onBlur={() => setIsAmountFocused(false)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                style={[ms.amountInput, { color: colors.text }]}
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <View style={[ms.actions, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity style={[ms.cancelBtn, { borderColor: colors.borderSubtle }]} onPress={onClose}>
              <ThemedText style={[ms.cancelText, { color: colors.textSecondary }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[ms.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <ThemedText style={ms.saveText}>{isEditMode ? 'Save Changes' : 'Set Budget'}</ThemedText>
              }
            </TouchableOpacity>
          </View>

          {/* Custom alert within sheet */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            buttons={alertConfig.buttons}
            onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
            isInsideModal={true}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const { budgets, transactions, categories, loadAppData, currencySymbol } = useAppStore();
  const { colors, isDark } = useTheme();
  const [showSheet, setShowSheet] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const { start, end } = useMemo(() => monthBounds(selectedDate), [selectedDate]);

  // Compute spending per category_id for the selected month
  const spentByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense' || !tx.category_id) continue;
      const d = new Date(tx.date);
      if (d < start || d > end) continue;
      map[tx.category_id] = (map[tx.category_id] ?? 0) + tx.amount;
    }
    return map;
  }, [transactions, start, end]);

  // Enrich budgets
  const enrichedBudgets = useMemo(() =>
    budgets.map((b) => ({
      ...b,
      spent: spentByCat[b.category_id] ?? 0,
    })),
  [budgets, spentByCat]);

  const totalLimit     = enrichedBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent     = enrichedBudgets.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallPct     = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;

  const sym = currencySymbol || 'PKR';

  const handleSaved = useCallback(async () => {
    setShowSheet(false);
    setEditingBudget(null);
    await loadAppData();
  }, [loadAppData]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const handleEditBudget = (budget: BudgetRecord) => {
    setEditingBudget(budget);
    setShowSheet(true);
  };

  const handleDeleteBudget = (budget: BudgetRecord) => {
    const catName = getCategoryDisplayName(budget.category_id, categories);
    setAlertConfig({
      visible: true,
      title: 'Remove Budget',
      message: `Are you sure you want to remove the budget for ${catName}?`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await budgetRepository.delete(budget.id);
            await loadAppData();
          },
        },
      ],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title1" style={[styles.headerTitle, { color: colors.text }]}>Budgets</ThemedText>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => { setEditingBudget(null); setShowSheet(true); }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Month Navigator */}
          <View style={[styles.monthNavContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
            <TouchableOpacity onPress={() => setMonthOffset((o) => o - 1)} style={styles.monthNavBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.monthLabelWrapper}>
              <ThemedText style={[styles.monthNavLabel, { color: colors.text }]}>{monthLabel(selectedDate)}</ThemedText>
              {monthOffset === 0 && <View style={[styles.currentMonthDot, { backgroundColor: colors.primary }]} />}
            </View>
            <TouchableOpacity
              onPress={() => setMonthOffset((o) => Math.min(0, o + 1))}
              style={styles.monthNavBtn}
              disabled={monthOffset === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={16} color={monthOffset === 0 ? colors.borderSubtle : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Main Summary Card */}
          {enrichedBudgets.length > 0 && (
            <View style={[styles.mainBudgetCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.35 : 0.06 }]}>
              <View style={styles.cardHeaderRow}>
                <ThemedText style={[styles.cardHeaderLabel, { color: colors.textSecondary }, totalRemaining < 0 && { color: colors.expense }]}>
                  {totalRemaining < 0 ? 'OVER BUDGET' : 'TOTAL BUDGET REMAINING'}
                </ThemedText>
                <View style={[styles.monthBadge, { backgroundColor: totalRemaining < 0 ? colors.expenseLight : colors.primaryLight, borderColor: totalRemaining < 0 ? colors.expense + '40' : colors.primary + '30' }]}>
                  <ThemedText style={[styles.monthText, { color: totalRemaining < 0 ? colors.expense : colors.primary }]}>
                    {overallPct}% used
                  </ThemedText>
                </View>
              </View>

              <ThemedText variant="amountLarge" style={[styles.remainingAmount, { color: colors.text }, totalRemaining < 0 && { color: colors.expense }]}>
                {formatCurrency(totalRemaining, { symbol: sym })}
              </ThemedText>
              <ThemedText style={[styles.budgetSubText, { color: colors.textSecondary }]}>
                Spent {formatCurrency(totalSpent, { symbol: sym })} of {formatCurrency(totalLimit, { symbol: sym })}
              </ThemedText>

              <View style={[styles.overallProgressBarBg, { backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.overallProgressBarFill,
                    { width: `${overallPct}%`, backgroundColor: overallPct > 85 ? colors.expense : colors.primary },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Category Budgets Header */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Category Budgets</ThemedText>
            <ThemedText style={[styles.sectionSub, { color: colors.textSecondary }]}>{enrichedBudgets.length} active</ThemedText>
          </View>

          {/* Budget Items */}
          {enrichedBudgets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="wallet-outline" size={48} color={colors.borderSubtle} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No Budgets Set</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap + to set a spending limit for any category.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.budgetList}>
              {enrichedBudgets.map((item) => {
                const meta = getCategoryMeta(item.category_id, categories);
                const categoryName = getCategoryDisplayName(item.category_id, categories);
                const pct  = item.amount > 0 ? Math.min(100, Math.round((item.spent / item.amount) * 100)) : 0;
                const remaining = item.amount - item.spent;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.budgetItemCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}
                    onPress={() => handleEditBudget(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemCategoryInfo}>
                        <View style={[styles.iconCircle, { backgroundColor: meta.color + '20' }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View>
                          <ThemedText style={[styles.itemTitle, { color: colors.text }]}>{categoryName}</ThemedText>
                          <ThemedText style={[styles.itemRemaining, { color: remaining < 0 ? colors.expense : colors.income }]}>
                            {remaining >= 0
                              ? `${sym} ${remaining.toLocaleString()} left`
                              : `${sym} ${Math.abs(remaining).toLocaleString()} over!`}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ThemedText style={[styles.itemPercent, { color: colors.text }, pct > 85 && { color: colors.expense }]}>
                          {pct}%
                        </ThemedText>
                        {/* Edit */}
                        <TouchableOpacity
                          onPress={() => handleEditBudget(item)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {/* Delete */}
                        <TouchableOpacity
                          onPress={() => handleDeleteBudget(item)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.itemProgressBarBg, { backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted }]}>
                      <View
                        style={[
                          styles.itemProgressBarFill,
                          { width: `${pct}%`, backgroundColor: pct > 85 ? colors.expense : meta.color },
                        ]}
                      />
                    </View>

                    <View style={styles.itemFooter}>
                      <ThemedText style={[styles.spentText, { color: colors.textSecondary }]}>Spent: {formatCurrency(item.spent, { symbol: sym })}</ThemedText>
                      <ThemedText style={[styles.limitText, { color: colors.textSecondary }]}>Limit: {formatCurrency(item.amount, { symbol: sym })}</ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Set New Budget CTA */}
          <View style={styles.ctaContainer}>
            <ThemedButton
              title="+ Set New Budget"
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => { setEditingBudget(null); setShowSheet(true); }}
              style={styles.setBudgetBtn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <BudgetSheet
        visible={showSheet}
        categories={categories}
        onClose={() => { setShowSheet(false); setEditingBudget(null); }}
        onSaved={handleSaved}
        existingBudget={editingBudget}
        currencySymbol={sym}
      />

      {/* Custom alert for screen level actions */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:             { flex: 1 },
  safeArea:              { flex: 1 },
  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  headerTitle:           { fontSize: 24, lineHeight: 32, fontWeight: '800', paddingVertical: 2, includeFontPadding: false },
  headerActionBtn:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scrollContent:         { paddingHorizontal: Spacing.xl, paddingBottom: 100 },

  monthNavContainer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginBottom: Spacing.lg, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1 },
  monthNavBtn:           { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  monthLabelWrapper:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthNavLabel:         { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  currentMonthDot:       { width: 5, height: 5, borderRadius: 2.5 },

  mainBudgetCard:        { borderRadius: Radius['2xl'], padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.xl, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  cardHeaderRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  cardHeaderLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  monthBadge:            { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  monthText:             { fontSize: 11, fontWeight: '700' },
  remainingAmount:       { fontSize: 32, lineHeight: 42, fontWeight: '900', marginVertical: Spacing.xs, paddingVertical: 4, letterSpacing: -0.5, includeFontPadding: false },
  budgetSubText:         { fontSize: 12, marginBottom: Spacing.md },
  overallProgressBarBg:  { height: 10, borderRadius: 5, overflow: 'hidden' },
  overallProgressBarFill:{ height: '100%', borderRadius: 5 },

  sectionHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:          { fontSize: 16, fontWeight: '700' },
  sectionSub:            { fontSize: 12 },

  budgetList:            { gap: Spacing.md, marginBottom: Spacing.xl },
  budgetItemCard:        { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  itemHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemCategoryInfo:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle:            { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemTitle:             { fontSize: 14, fontWeight: '600' },
  itemRemaining:         { fontSize: 11, fontWeight: '500' },
  itemPercent:           { fontSize: 14, fontWeight: '700' },
  actionBtn:             { padding: 4, borderRadius: 6 },
  itemProgressBarBg:     { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.xs },
  itemProgressBarFill:   { height: '100%', borderRadius: 3 },
  itemFooter:            { flexDirection: 'row', justifyContent: 'space-between' },
  spentText:             { fontSize: 11 },
  limitText:             { fontSize: 11 },

  ctaContainer:          { marginTop: Spacing.xs },
  setBudgetBtn:          { borderRadius: Radius.xl },

  emptyBox:              { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle:            { fontSize: 16, fontWeight: '700' },
  emptyText:             { fontSize: 13, textAlign: 'center' },
});

// ─── Budget Sheet Styles ──────────────────────────────────────────────────────

const ms = StyleSheet.create({
  outerWrap:     { flex: 1, justifyContent: 'flex-end' },
  backdrop:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, maxHeight: '85%' },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xs },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  sheetTitle:    { fontSize: 18, fontWeight: '800' },
  sheetSub:      { fontSize: 12, marginTop: 2 },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.lg },
  fieldLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: Spacing.sm },
  catRow:        { flexDirection: 'row', marginBottom: Spacing.xl },
  catChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, marginRight: Spacing.sm },
  catChipText:   { fontSize: 12, fontWeight: '500' },
  periodRow:     { flexDirection: 'row', borderRadius: Radius.md, padding: 3, borderWidth: 1, gap: 3, marginBottom: Spacing.xl },
  periodPill:    { flex: 1, paddingVertical: 9, borderRadius: Radius.sm, alignItems: 'center' },
  periodText:    { fontSize: 13, fontWeight: '600' },
  amountRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, marginBottom: Spacing.xl },
  currencyPfx:   { fontSize: 16, fontWeight: '800', marginRight: Spacing.sm },
  amountInput:   { flex: 1, fontSize: 24, fontWeight: '800', paddingVertical: Spacing.md },
  actions:       { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 36 : 24, borderTopWidth: 1 },
  cancelBtn:     { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center' },
  cancelText:    { fontWeight: '600' },
  saveBtn:       { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.xl, alignItems: 'center' },
  saveText:      { color: '#FFFFFF', fontWeight: '700' },
});
