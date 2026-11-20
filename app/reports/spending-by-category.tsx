import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getCategoryMeta, getCategoryDisplayName } from '@/utils/categoryMeta';
import type { BudgetRecord, TransactionRecord, CategoryRecord } from '@/database/repositories/types';

// ─── Filter Types ─────────────────────────────────────────────────────────────
type DatePreset = 'all_time' | 'this_year' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
type SortOption = 'spending_desc' | 'spending_asc' | 'budget_desc' | 'percent_desc' | 'name_asc';

interface EnrichedCategory {
  category: CategoryRecord;
  totalSpending: number;
  budget: BudgetRecord | null;
  hasBudget: boolean;
  remainingBudget: number | null;
  budgetPercentage: number | null;
  shareOfTotal: number;
  transactions: TransactionRecord[];
}

export default function SpendingByCategoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { transactions, categories, budgets, accounts, currencySymbol, currency } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';

  // ── Filters State ───────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>('all_time');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('spending_desc');
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  // ── Modals State ────────────────────────────────────────────────────────────
  const [showDateModal, setShowDateModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // ── Date Range Calculation ──────────────────────────────────────────────────
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === 'all_time') {
      return { start: null, end: null, label: 'All Time (From Beginning)' };
    }
    if (datePreset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return { start, end, label: `This Year (${now.getFullYear()})` };
    }
    if (datePreset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end: now, label: 'Last 30 Days' };
    }
    if (datePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    }
    if (datePreset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        start,
        end,
        label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    }
    if (datePreset === 'custom') {
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : null;
      let label = 'Custom Range';
      if (customStart && customEnd) label = `${customStart} to ${customEnd}`;
      else if (customStart) label = `From ${customStart}`;
      else if (customEnd) label = `Until ${customEnd}`;
      return { start, end, label };
    }
    return { start: null, end: null, label: 'All Time' };
  }, [datePreset, customStart, customEnd]);

  // ── Filtered Transactions ───────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.deleted_at) return false;
      if (tx.type !== 'expense') return false;

      // Account filter
      if (selectedAccountId !== 'all' && tx.account_id !== selectedAccountId) {
        return false;
      }

      // Category filter
      if (selectedCategoryId !== 'all' && tx.category_id !== selectedCategoryId) {
        return false;
      }

      // Date filter
      if (dateRangeBounds.start || dateRangeBounds.end) {
        const txDate = new Date(tx.date);
        if (dateRangeBounds.start && txDate < dateRangeBounds.start) return false;
        if (dateRangeBounds.end && txDate > dateRangeBounds.end) return false;
      }

      return true;
    });
  }, [transactions, selectedAccountId, selectedCategoryId, dateRangeBounds]);

  // ── Category Aggregations & Enrichments ─────────────────────────────────────
  const { enrichedCategories, totalFilteredSpending, totalAllocatedBudget, totalBudgetRemaining } = useMemo(() => {
    // 1. Group transactions by category
    const catTxsMap: Record<string, TransactionRecord[]> = {};
    const catSpendingMap: Record<string, number> = {};

    let totalSpending = 0;
    for (const tx of filteredTransactions) {
      if (!tx.category_id) continue;
      if (!catTxsMap[tx.category_id]) {
        catTxsMap[tx.category_id] = [];
        catSpendingMap[tx.category_id] = 0;
      }
      catTxsMap[tx.category_id].push(tx);
      catSpendingMap[tx.category_id] += tx.amount;
      totalSpending += tx.amount;
    }

    // 2. Map latest budgets by category
    const budgetMap: Record<string, BudgetRecord> = {};
    for (const b of budgets) {
      if (!budgetMap[b.category_id]) {
        budgetMap[b.category_id] = b;
      }
    }

    // 3. Include ALL expense categories (even if 0 spending and even if unbudgeted)
    const expenseCategories = categories.filter((c) => c.type === 'expense');

    const list: EnrichedCategory[] = expenseCategories.map((category) => {
      const spending = catSpendingMap[category.id] || 0;
      const budget = budgetMap[category.id] || null;
      const hasBudget = budget !== null && budget.amount > 0;
      const remainingBudget = hasBudget ? budget.amount - spending : null;
      const budgetPercentage = hasBudget ? Math.round((spending / budget.amount) * 100) : null;
      const shareOfTotal = totalSpending > 0 ? Math.round((spending / totalSpending) * 100) : 0;
      const catTxs = catTxsMap[category.id] || [];

      return {
        category,
        totalSpending: spending,
        budget,
        hasBudget,
        remainingBudget,
        budgetPercentage,
        shareOfTotal,
        transactions: catTxs,
      };
    });

    let totalBudget = 0;
    let totalSpentOnBudgeted = 0;
    for (const item of list) {
      if (item.hasBudget && item.budget) {
        totalBudget += item.budget.amount;
        totalSpentOnBudgeted += item.totalSpending;
      }
    }


    return {
      enrichedCategories: list,
      totalFilteredSpending: totalSpending,
      totalAllocatedBudget: totalBudget,
      totalBudgetRemaining: totalBudget - totalSpentOnBudgeted,
    };
  }, [filteredTransactions, categories, budgets]);

  // ── Filter by Search Query & Sort ──────────────────────────────────────────
  const displayCategories = useMemo(() => {
    let result = enrichedCategories;

    // Filter by category picker if specific selected
    if (selectedCategoryId !== 'all') {
      result = result.filter((item) => item.category.id === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => item.category.name.toLowerCase().includes(q));
    }

    // Sort categories
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'spending_desc':
          if (b.totalSpending !== a.totalSpending) return b.totalSpending - a.totalSpending;
          return a.category.name.localeCompare(b.category.name);
        case 'spending_asc':
          if (a.totalSpending !== b.totalSpending) return a.totalSpending - b.totalSpending;
          return a.category.name.localeCompare(b.category.name);
        case 'budget_desc': {
          const bLimit = b.budget?.amount || 0;
          const aLimit = a.budget?.amount || 0;
          return bLimit - aLimit;
        }
        case 'percent_desc': {
          const bPct = b.budgetPercentage ?? -1;
          const aPct = a.budgetPercentage ?? -1;
          return bPct - aPct;
        }
        case 'name_asc':
          return a.category.name.localeCompare(b.category.name);
        default:
          return b.totalSpending - a.totalSpending;
      }
    });
  }, [enrichedCategories, selectedCategoryId, searchQuery, sortBy]);

  // Active filters count
  const activeFiltersCount =
    (datePreset !== 'all_time' ? 1 : 0) +
    (selectedAccountId !== 'all' ? 1 : 0) +
    (selectedCategoryId !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setDatePreset('all_time');
    setCustomStart('');
    setCustomEnd('');
    setSelectedAccountId('all');
    setSelectedCategoryId('all');
    setSearchQuery('');
  };

  const selectedAccountName = useMemo(() => {
    if (selectedAccountId === 'all') return 'All Accounts';
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return acc ? acc.name : 'All Accounts';
  }, [selectedAccountId, accounts]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === 'all') return 'All Categories';
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat ? cat.name : 'All Categories';
  }, [selectedCategoryId, categories]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>

        {/* ── Screen Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Spending by Category</ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {dateRangeBounds.label}
            </ThemedText>
          </View>
          {activeFiltersCount > 0 ? (
            <TouchableOpacity onPress={resetAllFilters} style={styles.resetBtn} activeOpacity={0.7}>
              <ThemedText style={[styles.resetBtnText, { color: colors.primary }]}>Reset</ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* ── Quick Filter Pills Row ── */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
            {/* Date Preset Pill */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                { backgroundColor: colors.surface, borderColor: datePreset !== 'all_time' ? colors.primary : colors.borderSubtle },
                datePreset !== 'all_time' && { backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setShowDateModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={datePreset !== 'all_time' ? colors.primary : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.filterPillText,
                  { color: datePreset !== 'all_time' ? colors.primary : colors.text },
                  datePreset !== 'all_time' && { fontWeight: '700' },
                ]}
              >
                {datePreset === 'all_time' ? 'All Time' : dateRangeBounds.label}
              </ThemedText>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Account Filter Pill */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                { backgroundColor: colors.surface, borderColor: selectedAccountId !== 'all' ? colors.primary : colors.borderSubtle },
                selectedAccountId !== 'all' && { backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setShowAccountModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="wallet-outline"
                size={14}
                color={selectedAccountId !== 'all' ? colors.primary : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.filterPillText,
                  { color: selectedAccountId !== 'all' ? colors.primary : colors.text },
                  selectedAccountId !== 'all' && { fontWeight: '700' },
                ]}
              >
                {selectedAccountName}
              </ThemedText>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Category Filter Pill */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                { backgroundColor: colors.surface, borderColor: selectedCategoryId !== 'all' ? colors.primary : colors.borderSubtle },
                selectedCategoryId !== 'all' && { backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setShowCategoryModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={selectedCategoryId !== 'all' ? colors.primary : colors.textSecondary}
              />
              <ThemedText
                style={[
                  styles.filterPillText,
                  { color: selectedCategoryId !== 'all' ? colors.primary : colors.text },
                  selectedCategoryId !== 'all' && { fontWeight: '700' },
                ]}
              >
                {selectedCategoryName}
              </ThemedText>
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Sort Pill */}
            <TouchableOpacity
              style={[styles.filterPill, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => setShowSortModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-vertical-outline" size={14} color={colors.textSecondary} />
              <ThemedText style={[styles.filterPillText, { color: colors.text }]}>Sort</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Summary Hero Card ── */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                shadowColor: colors.cardShadow,
                shadowOpacity: isDark ? 0.35 : 0.08,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View>
                <ThemedText style={[styles.heroLabel, { color: colors.textSecondary }]}>
                  TOTAL CATEGORY SPENDING
                </ThemedText>
                <ThemedText style={[styles.heroAmount, { color: colors.text }]}>
                  {formatCurrency(totalFilteredSpending, { symbol: sym })}
                </ThemedText>
              </View>
              <View style={[styles.heroBadge, { backgroundColor: colors.expenseLight, borderColor: colors.expense + '40' }]}>
                <Ionicons name="trending-down" size={14} color={colors.expense} />
                <ThemedText style={[styles.heroBadgeText, { color: colors.expense }]}>
                  {filteredTransactions.length} txs
                </ThemedText>
              </View>
            </View>

            {/* Budget Allocated Row */}
            {totalAllocatedBudget > 0 && (
              <View style={[styles.heroBudgetRow, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.heroBudgetCol}>
                  <ThemedText style={[styles.heroBudgetSub, { color: colors.textSecondary }]}>BUDGET ALLOCATED</ThemedText>
                  <ThemedText style={[styles.heroBudgetValue, { color: colors.text }]}>
                    {formatCurrency(totalAllocatedBudget, { symbol: sym })}
                  </ThemedText>
                </View>
                <View style={[styles.heroBudgetCol, { alignItems: 'flex-end' }]}>
                  <ThemedText style={[styles.heroBudgetSub, { color: colors.textSecondary }]}>REMAINING BUDGET</ThemedText>
                  <ThemedText
                    style={[
                      styles.heroBudgetValue,
                      { color: totalBudgetRemaining >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    {totalBudgetRemaining >= 0
                      ? `+${formatCurrency(totalBudgetRemaining, { symbol: sym })}`
                      : `-${formatCurrency(Math.abs(totalBudgetRemaining), { symbol: sym })}`}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Quick Metrics Bar */}
            <View style={[styles.heroFooterRow, { borderTopColor: colors.borderSubtle }]}>
              <View style={styles.heroFooterItem}>
                <Ionicons name="pie-chart-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.heroFooterText, { color: colors.textSecondary }]}>
                  {displayCategories.filter((c) => c.totalSpending > 0).length} of {displayCategories.length} categories active
                </ThemedText>
              </View>
              <View style={styles.heroFooterItem}>
                <Ionicons name="wallet-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.heroFooterText, { color: colors.textSecondary }]}>
                  {displayCategories.filter((c) => c.hasBudget).length} with budgets
                </ThemedText>
              </View>
            </View>
          </View>

          {/* ── Search Input ── */}
          <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search category name..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="done"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Section Title ── */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</ThemedText>
            <ThemedText style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {displayCategories.length} categories
            </ThemedText>
          </View>

          {/* ── Categories List ── */}
          {displayCategories.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Ionicons name="search-outline" size={44} color={colors.borderSubtle} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No categories found</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeFiltersCount > 0
                  ? 'No spending records match your active filters. Try clearing some filters.'
                  : 'No expense transactions recorded yet.'}
              </ThemedText>
              {activeFiltersCount > 0 && (
                <TouchableOpacity
                  style={[styles.emptyResetBtn, { backgroundColor: colors.primary }]}
                  onPress={resetAllFilters}
                >
                  <ThemedText style={styles.emptyResetBtnText}>Clear All Filters</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.categoryCardsList}>
              {displayCategories.map((item) => {
                const meta = getCategoryMeta(item.category.id, categories);
                const isExpanded = expandedCatId === item.category.id;
                const isOverBudget = item.hasBudget && (item.remainingBudget ?? 0) < 0;
                const budgetProgress = item.budgetPercentage !== null ? Math.min(100, item.budgetPercentage) : 0;

                return (
                  <View
                    key={item.category.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isExpanded ? meta.color + '60' : colors.borderSubtle,
                        shadowColor: colors.cardShadow,
                        shadowOpacity: isDark ? 0.25 : 0.05,
                      },
                    ]}
                  >
                    {/* Header Row */}
                    <TouchableOpacity
                      style={styles.categoryCardHeader}
                      onPress={() => setExpandedCatId(isExpanded ? null : item.category.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catLeftRow}>
                        <View style={[styles.catIconBox, { backgroundColor: meta.color + '22' }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.catNameWrap}>
                          <ThemedText style={[styles.catName, { color: colors.text }]}>
                            {getCategoryDisplayName(item.category.id, categories)}
                          </ThemedText>
                          <ThemedText style={[styles.catSubDetails, { color: colors.textSecondary }]}>
                            {item.transactions.length} {item.transactions.length === 1 ? 'transaction' : 'transactions'}
                            {item.shareOfTotal > 0 && ` · ${item.shareOfTotal}% of all`}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Right: Total Spending Amount */}
                      <View style={styles.catRightCol}>
                        <ThemedText style={[styles.catSpendingAmount, { color: colors.text }]}>
                          {formatCurrency(item.totalSpending, { symbol: sym })}
                        </ThemedText>
                        <View style={styles.expandChevronRow}>
                          {item.hasBudget && (
                            <View
                              style={[
                                styles.budgetBadgeMini,
                                {
                                  backgroundColor: isOverBudget ? colors.expenseLight : colors.incomeLight,
                                  borderColor: isOverBudget ? colors.expense + '40' : colors.income + '40',
                                },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.budgetBadgeMiniText,
                                  { color: isOverBudget ? colors.expense : colors.income },
                                ]}
                              >
                                {item.budgetPercentage}% used
                              </ThemedText>
                            </View>
                          )}
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.textSecondary}
                            style={{ marginLeft: 4 }}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Budget & Progress Tracking Section */}
                    <View style={styles.catBudgetSection}>
                      {item.hasBudget ? (
                        <>
                          <View style={styles.budgetMetaRow}>
                            <ThemedText style={[styles.budgetMetaLabel, { color: colors.textSecondary }]}>
                              Budget: {formatCurrency(item.budget?.amount, { symbol: sym })} ({item.budget?.period || 'monthly'})
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.budgetMetaRemaining,
                                { color: isOverBudget ? colors.expense : colors.income },
                              ]}
                            >
                              {isOverBudget
                                ? `${formatCurrency(Math.abs(item.remainingBudget || 0), { symbol: sym })} over!`
                                : `${formatCurrency(item.remainingBudget, { symbol: sym })} remaining`}
                            </ThemedText>
                          </View>

                          {/* Progress Bar */}
                          <View style={[styles.progressBarTrack, { backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7' }]}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${budgetProgress}%`,
                                  backgroundColor: isOverBudget ? colors.expense : meta.color,
                                },
                              ]}
                            />
                          </View>
                        </>
                      ) : (
                        <View style={styles.unbudgetedRow}>
                          <View style={[styles.unbudgetedBadge, { backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted }]}>
                            <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
                            <ThemedText style={[styles.unbudgetedText, { color: colors.textSecondary }]}>
                              No budget assigned
                            </ThemedText>
                          </View>
                          {totalFilteredSpending > 0 && (
                            <ThemedText style={[styles.shareText, { color: colors.textSecondary }]}>
                              {item.shareOfTotal}% of total spend
                            </ThemedText>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Expanded Transactions List Drawer */}
                    {isExpanded && (
                      <View style={[styles.expandedDrawer, { borderTopColor: colors.borderSubtle, backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted }]}>
                        <ThemedText style={[styles.drawerTitle, { color: colors.textSecondary }]}>
                          Transactions in this filter ({item.transactions.length})
                        </ThemedText>
                        {item.transactions.length === 0 ? (
                          <ThemedText style={[styles.noTxText, { color: colors.textSecondary }]}>
                            No expense transactions recorded in this period.
                          </ThemedText>
                        ) : (
                          item.transactions.slice(0, 10).map((tx) => {
                            const acc = accounts.find((a) => a.id === tx.account_id);
                            return (
                              <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.borderSubtle }]}>
                                <View style={{ flex: 1 }}>
                                  <ThemedText style={[styles.txDate, { color: colors.textSecondary }]}>
                                    {formatDate(tx.date, 'medium')} · {acc?.name || 'Account'}
                                  </ThemedText>
                                  {!!tx.note && (
                                    <ThemedText style={[styles.txNote, { color: colors.text }]} numberOfLines={1}>
                                      {tx.note}
                                    </ThemedText>
                                  )}
                                </View>
                                <ThemedText style={[styles.txAmount, { color: colors.expense }]}>
                                  -{formatCurrency(tx.amount, { symbol: sym })}
                                </ThemedText>
                              </View>
                            );
                          })
                        )}
                        {item.transactions.length > 10 && (
                          <ThemedText style={[styles.moreTxNotice, { color: colors.textSecondary }]}>
                            Showing 10 of {item.transactions.length} transactions
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Date Preset Modal ── */}
      <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDateModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Select Time Period</ThemedText>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {[
                { key: 'all_time', label: 'All Time (From Beginning)', desc: 'Show all spending records ever created' },
                { key: 'this_year', label: 'This Year', desc: 'Current calendar year' },
                { key: 'last_30_days', label: 'Last 30 Days', desc: 'Rolling past 30 days' },
                { key: 'this_month', label: 'This Month', desc: 'Current calendar month' },
                { key: 'last_month', label: 'Last Month', desc: 'Previous calendar month' },
                { key: 'custom', label: 'Custom Date Range', desc: 'Specify start and end dates' },
              ].map((opt) => {
                const isSelected = datePreset === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.modalOptionItem,
                      { borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setDatePreset(opt.key as DatePreset);
                      if (opt.key !== 'custom') setShowDateModal(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.modalOptionLabel, { color: isSelected ? colors.primary : colors.text }]}>
                        {opt.label}
                      </ThemedText>
                      <ThemedText style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                        {opt.desc}
                      </ThemedText>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {datePreset === 'custom' && (
              <View style={[styles.customDateBox, { backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted }]}>
                <ThemedText style={[styles.customDateTitle, { color: colors.textSecondary }]}>
                  ENTER DATE RANGE (YYYY-MM-DD)
                </ThemedText>
                <View style={styles.customDateInputsRow}>
                  <TextInput
                    style={[styles.customDateInput, { color: colors.text, borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
                    placeholder="Start: 2026-01-01"
                    placeholderTextColor={colors.textTertiary}
                    value={customStart}
                    onChangeText={setCustomStart}
                  />
                  <TextInput
                    style={[styles.customDateInput, { color: colors.text, borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}
                    placeholder="End: 2026-12-31"
                    placeholderTextColor={colors.textTertiary}
                    value={customEnd}
                    onChangeText={setCustomEnd}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.applyCustomBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDateModal(false)}
                >
                  <ThemedText style={styles.applyCustomBtnText}>Apply Range</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Account Filter Modal ── */}
      <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAccountModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Filter by Account</ThemedText>
              <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              <TouchableOpacity
                style={[
                  styles.modalOptionItem,
                  { borderColor: colors.borderSubtle },
                  selectedAccountId === 'all' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setSelectedAccountId('all');
                  setShowAccountModal(false);
                }}
              >
                <Ionicons name="wallet-outline" size={18} color={selectedAccountId === 'all' ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                <ThemedText style={[styles.modalOptionLabel, { flex: 1, color: selectedAccountId === 'all' ? colors.primary : colors.text }]}>
                  All Accounts
                </ThemedText>
                {selectedAccountId === 'all' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>

              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.modalOptionItem,
                      { borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSelectedAccountId(acc.id);
                      setShowAccountModal(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.modalOptionLabel, { color: isSelected ? colors.primary : colors.text }]}>
                        {acc.name}
                      </ThemedText>
                      <ThemedText style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                        {acc.type} · Balance: {formatCurrency(acc.opening_balance, { symbol: sym })}
                      </ThemedText>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Category Filter Modal ── */}
      <Modal visible={showCategoryModal} transparent animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCategoryModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Filter by Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <TouchableOpacity
                style={[
                  styles.modalOptionItem,
                  { borderColor: colors.borderSubtle },
                  selectedCategoryId === 'all' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => {
                  setSelectedCategoryId('all');
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons name="pricetags-outline" size={18} color={selectedCategoryId === 'all' ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                <ThemedText style={[styles.modalOptionLabel, { flex: 1, color: selectedCategoryId === 'all' ? colors.primary : colors.text }]}>
                  All Categories
                </ThemedText>
                {selectedCategoryId === 'all' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
              </TouchableOpacity>

              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => {
                  const meta = getCategoryMeta(cat.id, categories);
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.modalOptionItem,
                        { borderColor: colors.borderSubtle },
                        isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setShowCategoryModal(false);
                      }}
                    >
                      <View style={[styles.catIconBoxSmall, { backgroundColor: meta.color + '22', marginRight: 10 }]}>
                        <Ionicons name={meta.icon} size={15} color={meta.color} />
                      </View>
                      <ThemedText style={[styles.modalOptionLabel, { flex: 1, color: isSelected ? colors.primary : colors.text }]}>
                        {cat.name}
                      </ThemedText>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Sort Modal ── */}
      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Sort Categories</ThemedText>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalOptionsList}>
              {[
                { key: 'spending_desc', label: 'Highest Spending First', icon: 'arrow-down' },
                { key: 'spending_asc', label: 'Lowest Spending First', icon: 'arrow-up' },
                { key: 'budget_desc', label: 'Highest Budget Limit First', icon: 'wallet-outline' },
                { key: 'percent_desc', label: 'Highest % of Budget Used', icon: 'pie-chart-outline' },
                { key: 'name_asc', label: 'Category Name (A to Z)', icon: 'text-outline' },
              ].map((opt) => {
                const isSelected = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.modalOptionItem,
                      { borderColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSortBy(opt.key as SortOption);
                      setShowSortModal(false);
                    }}
                  >
                    <Ionicons name={opt.icon as any} size={16} color={isSelected ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
                    <ThemedText style={[styles.modalOptionLabel, { flex: 1, color: isSelected ? colors.primary : colors.text }]}>
                      {opt.label}
                    </ThemedText>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
    textAlign: 'center',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  filterBar: {
    paddingVertical: Spacing.sm,
  },
  filterPillsScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },

  heroCard: {
    borderRadius: Radius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.sm,
  },
  heroBudgetCol: {
    flex: 1,
  },
  heroBudgetSub: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroBudgetValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  heroFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroFooterText: {
    fontSize: 11,
    fontWeight: '500',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 9 : 5,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 12,
  },

  emptyContainer: {
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  emptyResetBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.lg,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  categoryCardsList: {
    gap: Spacing.sm,
  },
  categoryCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  catLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  catIconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconBoxSmall: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameWrap: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
  },
  catSubDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  catRightCol: {
    alignItems: 'flex-end',
  },
  catSpendingAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  expandChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  budgetBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  budgetBadgeMiniText: {
    fontSize: 10,
    fontWeight: '700',
  },

  catBudgetSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  budgetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  budgetMetaLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  budgetMetaRemaining: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  unbudgetedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  unbudgetedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  unbudgetedText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  shareText: {
    fontSize: 11,
    fontWeight: '500',
  },

  expandedDrawer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  drawerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  noTxText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txDate: {
    fontSize: 10.5,
  },
  txNote: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  moreTxNotice: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  bottomSpacer: {
    height: 40,
  },

  // ── Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalOptionsList: {
    gap: Spacing.xs,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  modalOptionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },

  customDateBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  customDateTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  customDateInputsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  customDateInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  applyCustomBtn: {
    paddingVertical: 9,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  applyCustomBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
});
