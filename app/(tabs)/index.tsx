import ThemedText from '@/components/common/ThemedText';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import { AddCategoryModal } from '@/components/modals/AddCategoryModal';
import { EditTransactionModal } from '@/components/modals/EditTransactionModal';
import { LoanDetailsModal } from '@/components/modals/LoanDetailsModal';
import { ManageHubModal } from '@/components/modals/ManageHubModal';
import { Radius, Spacing } from '@/constants/theme';
import type { TransactionRecord, LoanRecord } from '@/database/repositories/types';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { ACCOUNT_TYPE_OPTIONS, DISTINCT_CATEGORY_PALETTE, getCategoryDisplayName, getCategoryMeta } from '@/utils/categoryMeta';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Current month start/end helpers
function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

type RecentActivityItem =
  | { kind: 'transaction'; data: TransactionRecord; date: string }
  | { kind: 'loan'; data: LoanRecord; date: string };

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { transactions, accounts, categories, budgets, loans, loanRepayments, isLoadingData, userName, currencySymbol, currency } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';

  // Month navigation state
  const [monthOffset, setMonthOffset] = React.useState(0);
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const { start, end } = useMemo(() => monthBounds(selectedDate), [selectedDate]);

  // Filter transactions for selected month
  const monthTxs = useMemo(() =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    }),
    [transactions, start, end]);

  // Totals for the selected month
  const { monthIncome, monthExpense } = useMemo(() => {
    let monthIncome = 0;
    let monthExpense = 0;
    for (const tx of monthTxs) {
      if (tx.type === 'income') monthIncome += tx.amount;
      else if (tx.type === 'expense') monthExpense += tx.amount;
    }
    return { monthIncome, monthExpense };
  }, [monthTxs]);

  // Total balance across all time (all accounts opening balance + net transactions + loans + repayments)
  const totalBalance = useMemo(() => {
    let bal = accounts.reduce((s, a) => s + (a.opening_balance || 0), 0);
    for (const tx of transactions) {
      if (tx.deleted_at) continue;
      if (tx.type === 'income') bal += tx.amount;
      else if (tx.type === 'expense') bal -= tx.amount;
      // Transfer between accounts preserves totalBalance
    }
    for (const loan of loans) {
      if (loan.deleted_at) continue;
      bal += loan.type === 'lent' ? -loan.amount : loan.amount;
    }
    const loanMap: Record<string, LoanRecord> = {};
    for (const l of loans) loanMap[l.id] = l;
    for (const rep of loanRepayments) {
      const l = loanMap[rep.loan_id];
      if (!l || l.deleted_at) continue;
      bal += l.type === 'lent' ? rep.amount : -rep.amount;
    }
    return bal;
  }, [accounts, transactions, loans, loanRepayments]);

  // Account balances map (opening balance + net transactions + loans + repayments per account)
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((acc) => {
      map[acc.id] = acc.opening_balance || 0;
    });
    transactions.forEach((tx) => {
      if (tx.deleted_at) return;
      if (tx.type === 'income') {
        if (map[tx.account_id] !== undefined) map[tx.account_id] += tx.amount;
      } else if (tx.type === 'expense') {
        if (map[tx.account_id] !== undefined) map[tx.account_id] -= tx.amount;
      } else if (tx.type === 'transfer') {
        // Source account debited
        if (map[tx.account_id] !== undefined) map[tx.account_id] -= tx.amount;
        // Destination account credited
        if (tx.to_account_id && map[tx.to_account_id] !== undefined) {
          map[tx.to_account_id] += tx.amount;
        }
      }
    });
    loans.forEach((l) => {
      if (l.deleted_at) return;
      if (map[l.account_id] !== undefined) {
        map[l.account_id] += l.type === 'lent' ? -l.amount : l.amount;
      }
    });
    const loanMap: Record<string, LoanRecord> = {};
    for (const l of loans) loanMap[l.id] = l;
    loanRepayments.forEach((rep) => {
      const l = loanMap[rep.loan_id];
      if (!l || l.deleted_at) return;
      if (map[rep.account_id] !== undefined) {
        map[rep.account_id] += l.type === 'lent' ? rep.amount : -rep.amount;
      }
    });
    return map;
  }, [accounts, transactions, loans, loanRepayments]);

  // Outstanding loan stats (Lent vs Borrowed)
  const loanStats = useMemo(() => {
    let lentOutstanding = 0;
    let borrowedOutstanding = 0;
    for (const l of loans) {
      if (l.deleted_at || l.status === 'paid') continue;
      const repaid = l.paid_amount || 0;
      const remaining = Math.max(0, l.amount - repaid);
      if (l.type === 'lent') {
        lentOutstanding += remaining;
      } else {
        borrowedOutstanding += remaining;
      }
    }
    return { lentOutstanding, borrowedOutstanding };
  }, [loans]);

  // Modals state
  const [showManageHub, setShowManageHub] = React.useState(false);
  const [manageHubTab, setManageHubTab] = React.useState<'accounts' | 'categories'>('accounts');
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = React.useState<TransactionRecord | null>(null);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = React.useState<LoanRecord | null>(null);
  const [loanDetailsModalVisible, setLoanDetailsModalVisible] = React.useState(false);

  // Category breakdown: top 8 budgeted categories prioritized by recent transaction activity
  const categoryBreakdown = useMemo(() => {
    // 1. Month spending per category
    const monthSpendingMap: Record<string, number> = {};
    for (const tx of monthTxs) {
      if (tx.type !== 'expense' || !tx.category_id) continue;
      monthSpendingMap[tx.category_id] = (monthSpendingMap[tx.category_id] ?? 0) + tx.amount;
    }
    const totalMonthExpense = Object.values(monthSpendingMap).reduce((s, v) => s + v, 0);

    // 2. Budget limits - ONLY categories with an assigned budget
    const budgetMap: Record<string, number> = {};
    budgets.forEach((b) => {
      if (b.amount > 0) {
        budgetMap[b.category_id] = b.amount;
      }
    });

    const budgetedCatIds = Object.keys(budgetMap);
    if (budgetedCatIds.length === 0) return [];

    // 3. Find most recent transaction activity timestamp across transactions
    const lastActivityMap: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.category_id && budgetMap[tx.category_id]) {
        const time = new Date(tx.date).getTime();
        if (!lastActivityMap[tx.category_id] || time > lastActivityMap[tx.category_id]) {
          lastActivityMap[tx.category_id] = time;
        }
      }
    }

    // 4. Return top 8 budgeted categories
    return budgetedCatIds
      .map((cat_id) => {
        const amt = monthSpendingMap[cat_id] ?? 0;
        const budgetLimit = budgetMap[cat_id];
        const budgetPct = Math.round((amt / budgetLimit) * 100);
        const percent = totalMonthExpense > 0 ? Math.round((amt / totalMonthExpense) * 100) : 0;
        const isOverBudget = amt > budgetLimit;
        const remaining = budgetLimit - amt;
        const lastTxTime = lastActivityMap[cat_id] ?? 0;

        return {
          cat_id,
          amount: amt,
          percent,
          budgetLimit,
          budgetPct,
          isOverBudget,
          remaining,
          lastTxTime,
        };
      })
      .sort((a, b) => {
        // Prioritize by recent transaction activity
        if (b.lastTxTime !== a.lastTxTime) {
          return b.lastTxTime - a.lastTxTime;
        }
        // Then by current spending amount
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }
        // Then by budget size
        return b.budgetLimit - a.budgetLimit;
      })
      .slice(0, 8);
  }, [monthTxs, budgets, transactions]);

  // Unified Activities (Transactions + Loans) for the selected month
  const recentActivities: RecentActivityItem[] = useMemo(() => {
    const list: RecentActivityItem[] = [
      ...monthTxs.map((t) => ({ kind: 'transaction' as const, data: t, date: t.date })),
      ...loans
        .filter((l) => {
          if (l.deleted_at) return false;
          const d = new Date(l.date);
          return d >= start && d <= end;
        })
        .map((l) => ({ kind: 'loan' as const, data: l, date: l.date })),
    ];
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [monthTxs, loans, start, end]);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={[styles.headerSub, { color: colors.textSecondary }]}>WELCOME BACK{userName ? `, ${userName.toUpperCase()}` : ''}</ThemedText>
              <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Apni Rakam</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  setManageHubTab('accounts');
                  setShowManageHub(true);
                }}
                style={styles.headerActionBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.offlinePill, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                <View style={[styles.greenPulseDot, { backgroundColor: colors.primary }]} />
                <ThemedText style={[styles.offlinePillText, { color: colors.primary }]}>100% OFFLINE</ThemedText>
              </View>
            </View>
          </View>

          {/* Month Navigator */}
          <View style={[styles.monthNavContainer, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
            <TouchableOpacity
              onPress={() => setMonthOffset((o) => o - 1)}
              style={styles.monthNavBtn}
              activeOpacity={0.7}
            >
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

          {/* Balance Hero Card */}
          <View style={[styles.balanceHeroCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.35 : 0.06 }]}>
            <View style={styles.balanceCardTop}>
              <ThemedText style={[styles.balanceLabel, { color: colors.textSecondary }]}>TOTAL BALANCE</ThemedText>
              <View style={[styles.currencyBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '30' }]}>
                <ThemedText style={[styles.currencyBadgeText, { color: colors.primary }]}>{currency || sym}</ThemedText>
              </View>
            </View>

            {isLoadingData ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <ThemedText variant="amountLarge" style={[styles.balanceNumber, { color: colors.text }]}>
                {formatCurrency(totalBalance, { symbol: sym })}
              </ThemedText>
            )}

            <View style={[styles.subStatsRow, { backgroundColor: isDark ? colors.backgroundSecondary : colors.surfaceMuted, borderColor: isDark ? colors.borderSubtle : colors.border }]}>
              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: colors.incomeLight }]}>
                  <Ionicons name="arrow-down" size={14} color={colors.income} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.subStatTitle, { color: colors.textSecondary }]}>Income</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: colors.income }]}>
                    {formatCurrency(monthIncome, { symbol: sym })}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.statDivider, { backgroundColor: isDark ? colors.borderSubtle : colors.border }]} />

              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: colors.expenseLight }]}>
                  <Ionicons name="arrow-up" size={14} color={colors.expense} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.subStatTitle, { color: colors.textSecondary }]}>Expenses</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: colors.expense }]}>
                    {formatCurrency(monthExpense, { symbol: sym })}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Active Loans summary banner if any */}
            {(loanStats.lentOutstanding > 0 || loanStats.borrowedOutstanding > 0) && (
              <View style={[styles.loanSummaryBar, { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted, borderColor: isDark ? colors.borderSubtle : colors.border }]}>
                {loanStats.lentOutstanding > 0 && (
                  <View style={styles.loanSummaryItem}>
                    <Ionicons name="arrow-up-circle" size={16} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.loanSummaryLabel, { color: colors.textSecondary }]}>Lent (To Collect)</ThemedText>
                      <ThemedText style={[styles.loanSummaryValue, { color: '#F59E0B' }]}>
                        {formatCurrency(loanStats.lentOutstanding, { symbol: sym })}
                      </ThemedText>
                    </View>
                  </View>
                )}
                {loanStats.lentOutstanding > 0 && loanStats.borrowedOutstanding > 0 && (
                  <View style={[styles.statDivider, { backgroundColor: isDark ? colors.borderSubtle : colors.border, height: 24 }]} />
                )}
                {loanStats.borrowedOutstanding > 0 && (
                  <View style={styles.loanSummaryItem}>
                    <Ionicons name="arrow-down-circle" size={16} color="#8B5CF6" />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.loanSummaryLabel, { color: colors.textSecondary }]}>Borrowed (To Repay)</ThemedText>
                      <ThemedText style={[styles.loanSummaryValue, { color: '#8B5CF6' }]}>
                        {formatCurrency(loanStats.borrowedOutstanding, { symbol: sym })}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Accounts & Wallets Carousel */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Accounts & Wallets</ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setManageHubTab('accounts');
                  setShowManageHub(true);
                }}
                style={styles.cleanSectionAction}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.cleanSectionActionText, { color: colors.primary }]}>Manage</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountScrollList}
              style={styles.accountScroll}
            >
              {accounts.map((acc) => {
                const bal = accountBalances[acc.id] ?? acc.opening_balance;
                const typeOption = ACCOUNT_TYPE_OPTIONS.find((t) => t.type === acc.type);
                return (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => {
                      setManageHubTab('accounts');
                      setShowManageHub(true);
                    }}
                    style={[
                      styles.accountOverviewCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isDark ? colors.borderSubtle : colors.border,
                        shadowColor: colors.cardShadow,
                        shadowOpacity: isDark ? 0.3 : 0.08,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.accountCardTop}>
                      <View style={[styles.accountIconCircle, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name={typeOption?.icon || 'wallet-outline'} size={16} color={colors.primary} />
                      </View>
                      <ThemedText style={[styles.accountTypeBadge, { color: colors.textMuted }]}>{acc.type.toUpperCase()}</ThemedText>
                    </View>
                    <ThemedText style={[styles.accountCardName, { color: colors.text }]} numberOfLines={1}>{acc.name}</ThemedText>
                    <ThemedText style={[styles.accountCardBal, { color: bal < 0 ? colors.expense : colors.text }]}>
                      {formatCurrency(bal, { symbol: sym })}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setShowAddAccount(true)}
                style={[
                  styles.accountAddCard,
                  {
                    borderColor: colors.primary + (isDark ? '50' : '40'),
                    backgroundColor: isDark ? colors.primaryLight : '#F0FDF4',
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.accountAddCircle, { backgroundColor: colors.surface }]}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
                <ThemedText style={[styles.accountAddText, { color: colors.primary }]}>+ Add Account</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Spending by Category */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</ThemedText>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/budgets')}
                style={styles.cleanSectionAction}
                activeOpacity={0.7}
              >
                <Ionicons name="wallet-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.cleanSectionActionText, { color: colors.primary }]}>Manage Budgets</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
              {categoryBreakdown.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="pie-chart-outline" size={32} color={colors.borderSubtle} />
                  <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No budgeted categories yet</ThemedText>
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => router.push('/(tabs)/budgets')}
                  >
                    <ThemedText style={[styles.emptyActionText, { color: colors.primary }]}>
                      Tap to set limits in Manage Budgets
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.progressBarsContainer}>
                    {(() => {
                      const usedColors = new Set<string>();
                      return categoryBreakdown.map((cat) => {
                        const meta = getCategoryMeta(cat.cat_id, categories);
                        const displayName = getCategoryDisplayName(cat.cat_id, categories);
                        const hasBudget = cat.budgetLimit > 0;
                        const progressPct = Math.min(100, hasBudget ? (cat.budgetPct || 0) : cat.percent);

                        let catColor = meta.color;
                        if (usedColors.has(catColor)) {
                          const fallback = DISTINCT_CATEGORY_PALETTE.find((c) => !usedColors.has(c));
                          if (fallback) catColor = fallback;
                        }
                        usedColors.add(catColor);

                        return (
                          <View key={cat.cat_id} style={styles.categoryItemBlock}>
                            <View style={styles.categoryProgressRow}>
                              <View style={styles.categoryInfo}>
                                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                                <ThemedText style={[styles.categoryLabel, { color: colors.text }]}>{displayName}</ThemedText>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                <ThemedText style={[styles.categoryAmountSub, { color: colors.textSecondary }]}>
                                  {sym} {cat.amount.toLocaleString()}
                                  {hasBudget ? ` / ${cat.budgetLimit.toLocaleString()}` : ''}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.categoryPercentText,
                                    { color: cat.isOverBudget ? colors.expense : catColor },
                                  ]}
                                >
                                  {hasBudget
                                    ? cat.isOverBudget
                                      ? `OVER ${cat.budgetPct}%`
                                      : `${cat.budgetPct}%`
                                    : `${cat.percent}%`}
                                </ThemedText>
                              </View>
                            </View>

                            {/* Full-width Progress Bar */}
                            <View style={[styles.categoryItemTrack, { backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7', width: '100%' }]}>
                              <View
                                style={[
                                  styles.categoryItemFill,
                                  {
                                    width: `${progressPct}%`,
                                    backgroundColor: cat.isOverBudget ? colors.expense : catColor,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* All Activities */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>All Activities</ThemedText>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/transactions')}
                style={styles.cleanSectionAction}
                activeOpacity={0.7}
              >
                <Ionicons name="receipt-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.cleanSectionActionText, { color: colors.primary }]}>All Activity</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {recentActivities.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={32} color={colors.borderSubtle} />
                  <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity yet</ThemedText>
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => router.push('/add-transaction')}
                  >
                    <ThemedText style={[styles.emptyActionText, { color: colors.primary }]}>+ Add your first transaction or loan</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                recentActivities.map((item) => {
                  if (item.kind === 'transaction') {
                    const tx = item.data;
                    const isTransfer = tx.type === 'transfer';
                    const meta = isTransfer
                      ? { icon: 'swap-horizontal' as const, color: '#0EA5E9' }
                      : tx.category_id
                      ? getCategoryMeta(tx.category_id, categories)
                      : { icon: 'pricetag-outline' as const, color: colors.primary };
                    const categoryName = isTransfer
                      ? 'Transfer'
                      : tx.category_id
                      ? getCategoryDisplayName(tx.category_id, categories)
                      : 'General';
                    const hasNote = Boolean(tx.note && tx.note.trim());

                    return (
                      <TouchableOpacity
                        key={`tx-${tx.id}`}
                        style={[
                          styles.activityItem,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isDark ? colors.borderSubtle : colors.border,
                            shadowColor: colors.cardShadow,
                            shadowOpacity: isDark ? 0.2 : 0.04,
                          },
                        ]}
                        onPress={() => {
                          setSelectedTxForEdit(tx);
                          setEditModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.activityIconCircle, { backgroundColor: meta.color + '20' }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={styles.activityDetails}>
                          <ThemedText style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                            {categoryName}
                          </ThemedText>
                          {hasNote ? (
                            <ThemedText style={[styles.activityNoteSub, { color: colors.textSecondary }]} numberOfLines={1}>
                              {tx.note}
                            </ThemedText>
                          ) : null}
                          <View style={styles.activityMetaRow}>
                            <ThemedText style={[styles.activityMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                              {isTransfer
                                ? `${accountMap[tx.account_id] ?? 'Account'} ➔ ${accountMap[tx.to_account_id || ''] ?? 'Cash Wallet'} • ${formatDate(tx.date, 'short')}`
                                : `${accountMap[tx.account_id] ?? 'Account'} • ${formatDate(tx.date, 'short')}`}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.activityAmountContainer}>
                          <ThemedText
                            style={[
                              styles.activityAmount,
                              {
                                color: isTransfer
                                  ? '#0EA5E9'
                                  : tx.type === 'income'
                                  ? colors.income
                                  : colors.expense,
                              },
                            ]}
                          >
                            {isTransfer
                              ? `${sym} ${tx.amount.toLocaleString()}`
                              : tx.type === 'income'
                              ? `${sym} +${tx.amount.toLocaleString()}`
                              : `${sym} -${tx.amount.toLocaleString()}`}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  } else {
                    const loan = item.data;
                    const isLent = loan.type === 'lent';
                    const accentColor = isLent ? '#F59E0B' : '#8B5CF6';
                    const statusColor =
                      loan.status === 'paid' ? colors.income : loan.status === 'partially_paid' ? colors.primary : '#F59E0B';
                    const statusLabel =
                      loan.status === 'paid' ? 'PAID' : loan.status === 'partially_paid' ? 'PARTIALLY PAID' : 'PENDING';
                    const remaining = Math.max(0, loan.amount - (loan.paid_amount || 0));

                    return (
                      <TouchableOpacity
                        key={`loan-${loan.id}`}
                        style={[
                          styles.activityItem,
                          {
                            backgroundColor: colors.surface,
                            borderColor: isDark ? colors.borderSubtle : colors.border,
                            shadowColor: colors.cardShadow,
                            shadowOpacity: isDark ? 0.2 : 0.04,
                          },
                        ]}
                        onPress={() => {
                          setSelectedLoanForDetails(loan);
                          setLoanDetailsModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.activityIconCircle, { backgroundColor: accentColor + '20' }]}>
                          <Ionicons name={isLent ? 'arrow-up-circle' : 'arrow-down-circle'} size={22} color={accentColor} />
                        </View>
                        <View style={styles.activityDetails}>
                          <ThemedText style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                            {isLent ? `Lent to ${loan.person_name}` : `Borrowed from ${loan.person_name}`}
                          </ThemedText>
                          {loan.note && loan.note.trim() ? (
                            <ThemedText style={[styles.activityNoteSub, { color: colors.textSecondary }]} numberOfLines={1}>
                              {loan.note}
                            </ThemedText>
                          ) : null}
                          <View style={styles.activityMetaRow}>
                            <View style={[styles.statusMiniBadge, { backgroundColor: statusColor + '20' }]}>
                              <ThemedText style={[styles.statusMiniText, { color: statusColor }]}>{statusLabel}</ThemedText>
                            </View>
                            <View style={[styles.loanTypeBadge, { backgroundColor: accentColor + '18' }]}>
                              <ThemedText style={[styles.loanTypeBadgeText, { color: accentColor }]}>
                                {isLent ? 'Lent' : 'Borrowed'}
                              </ThemedText>
                            </View>
                            <ThemedText style={[styles.activityMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                              {accountMap[loan.account_id] ?? 'Account'} • {formatDate(loan.date, 'short')}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.activityAmountContainer}>
                          <ThemedText style={[styles.activityAmount, { color: accentColor }]}>
                            {sym} {loan.amount.toLocaleString()}
                          </ThemedText>
                          {loan.status === 'partially_paid' && (
                            <ThemedText style={[styles.remainingSubText, { color: colors.textMuted }]}>
                              Rem: {sym} {remaining.toLocaleString()}
                            </ThemedText>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  }
                })
              )}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Manage Accounts & Categories Hub Modal */}
      <ManageHubModal
        visible={showManageHub}
        initialTab={manageHubTab}
        onClose={() => setShowManageHub(false)}
      />

      {/* Direct Add Account Modal */}
      <AddAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
      />

      {/* Direct Add Category Modal */}
      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
      />

      {/* Edit / Delete Transaction Modal */}
      <EditTransactionModal
        visible={editModalVisible}
        transaction={selectedTxForEdit}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTxForEdit(null);
        }}
      />

      {/* Loan Details & Repayments Modal */}
      <LoanDetailsModal
        visible={loanDetailsModalVisible}
        loan={selectedLoanForDetails}
        onClose={() => {
          setLoanDetailsModalVisible(false);
          setSelectedLoanForDetails(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 150 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerSub: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  manageIconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  offlinePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm + 2, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, gap: 6 },
  greenPulseDot: { width: 6, height: 6, borderRadius: 3 },
  offlinePillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Month nav
  monthNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginBottom: Spacing.lg, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1 },
  monthNavBtn: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  monthLabelWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthNavLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  currentMonthDot: { width: 5, height: 5, borderRadius: 2.5 },

  // Balance card
  balanceHeroCard: { borderRadius: Radius['2xl'], padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.xl, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  balanceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xs },
  balanceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  currencyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  currencyBadgeText: { fontSize: 11, fontWeight: '800' },
  balanceNumber: { fontSize: 34, lineHeight: 46, fontWeight: '900', marginVertical: Spacing.xs, paddingVertical: 4, letterSpacing: -0.5, includeFontPadding: false },
  subStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1 },
  subStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statDivider: { width: 1, height: 28, marginHorizontal: Spacing.xs },
  subStatIconCircle: { width: 28, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  subStatTitle: { fontSize: 11, fontWeight: '500' },
  subStatValue: { fontSize: 13, fontWeight: '700' },

  // Sections
  sectionContainer: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontWeight: '700', fontSize: 16 },
  sectionBadge: { fontWeight: '600', fontSize: 12 },
  headerActionBtn: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  cleanSectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 2 },
  cleanSectionActionText: { fontSize: 13, fontWeight: '700' },

  // Loan summary bar
  loanSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  loanSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  loanSummaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loanSummaryValue: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Accounts Horizontal Carousel
  accountScroll: { overflow: 'visible', marginHorizontal: -Spacing.xl },
  accountScrollList: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  accountOverviewCard: {
    minWidth: 165,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  accountCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  accountIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  accountTypeBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  accountCardName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  accountCardBal: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  accountAddCard: {
    width: 135,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  accountAddCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accountAddText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // Category card
  categoryCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.md, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  progressBarsContainer: { gap: Spacing.md },
  categoryItemBlock: { gap: 6 },
  categoryProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  categoryDot: { width: 8, height: 8, borderRadius: Radius.full },
  categoryLabel: { fontSize: 13, fontWeight: '500' },
  categoryAmountSub: { fontSize: 11, fontWeight: '500' },
  categoryPercentText: { fontSize: 12, fontWeight: '800' },
  categoryItemTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  categoryItemFill: { height: '100%', borderRadius: 3 },

  // Activity
  activityList: { gap: Spacing.sm },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  activityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  activityDetails: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.xs,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    flexShrink: 1,
  },
  activityHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  loanTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  loanTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityNoteSub: {
    fontSize: 11,
    marginBottom: 3,
    flexShrink: 1,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  inlineCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  inlineCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
  },
  statusMiniText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activityMeta: {
    fontSize: 11,
    flexShrink: 1,
  },
  activityAmountContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: Spacing.xs,
    maxWidth: '38%',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  remainingSubText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 13 },
  emptyAction: { marginTop: Spacing.xs },
  emptyActionText: { fontSize: 13, fontWeight: '600' },
});
