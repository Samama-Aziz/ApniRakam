import ThemedText from '@/components/common/ThemedText';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import { AddCategoryModal } from '@/components/modals/AddCategoryModal';
import { EditTransactionModal } from '@/components/modals/EditTransactionModal';
import { ManageHubModal } from '@/components/modals/ManageHubModal';
import { Radius, Spacing } from '@/constants/theme';
import type { TransactionRecord } from '@/database/repositories/types';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { ACCOUNT_TYPE_OPTIONS, getCategoryDisplayName, getCategoryMeta } from '@/utils/categoryMeta';
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

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { transactions, accounts, categories, budgets, isLoadingData, userName } = useAppStore();

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
      else monthExpense += tx.amount;
    }
    return { monthIncome, monthExpense };
  }, [monthTxs]);

  // Total balance across all time (all accounts opening balance + transactions)
  const totalBalance = useMemo(() => {
    let bal = accounts.reduce((s, a) => s + a.opening_balance, 0);
    for (const tx of transactions) {
      bal += tx.type === 'income' ? tx.amount : -tx.amount;
    }
    return bal;
  }, [accounts, transactions]);

  // Account balances map (opening balance + net transactions per account)
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((acc) => {
      map[acc.id] = acc.opening_balance || 0;
    });
    transactions.forEach((tx) => {
      if (tx.deleted_at) return;
      if (map[tx.account_id] !== undefined) {
        map[tx.account_id] += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    return map;
  }, [accounts, transactions]);

  // Modals state
  const [showManageHub, setShowManageHub] = React.useState(false);
  const [manageHubTab, setManageHubTab] = React.useState<'accounts' | 'categories'>('accounts');
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = React.useState<TransactionRecord | null>(null);
  const [editModalVisible, setEditModalVisible] = React.useState(false);

  // Category breakdown for the month (expenses only) with budget knowledge
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of monthTxs) {
      if (tx.type !== 'expense') continue;
      map[tx.category_id] = (map[tx.category_id] ?? 0) + tx.amount;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    const budgetMap: Record<string, number> = {};
    budgets.forEach((b) => {
      budgetMap[b.category_id] = b.amount;
    });

    return Object.entries(map)
      .map(([cat_id, amt]) => {
        const budgetLimit = budgetMap[cat_id] ?? 0;
        const budgetPct = budgetLimit > 0 ? Math.round((amt / budgetLimit) * 100) : null;
        return {
          cat_id,
          amount: amt,
          percent: Math.round((amt / total) * 100),
          budgetLimit,
          budgetPct,
          isOverBudget: budgetLimit > 0 && amt > budgetLimit,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthTxs, budgets]);

  // Recent 5 transactions
  const recentTxs = useMemo(() => monthTxs.slice(0, 5), [monthTxs]);

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
                <ThemedText style={[styles.currencyBadgeText, { color: colors.primary }]}>PKR</ThemedText>
              </View>
            </View>

            {isLoadingData ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <ThemedText variant="amountLarge" style={[styles.balanceNumber, { color: colors.text }]}>
                {formatCurrency(totalBalance, { symbol: 'PKR' })}
              </ThemedText>
            )}

            <View style={[styles.subStatsRow, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.borderSubtle }]}>
              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: colors.incomeLight }]}>
                  <Ionicons name="arrow-down" size={14} color={colors.income} />
                </View>
                <View>
                  <ThemedText style={[styles.subStatTitle, { color: colors.textSecondary }]}>Income</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: colors.income }]}>
                    {formatCurrency(monthIncome, { symbol: 'PKR' })}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: colors.expenseLight }]}>
                  <Ionicons name="arrow-up" size={14} color={colors.expense} />
                </View>
                <View>
                  <ThemedText style={[styles.subStatTitle, { color: colors.textSecondary }]}>Expenses</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: colors.expense }]}>
                    {formatCurrency(monthExpense, { symbol: 'PKR' })}
                  </ThemedText>
                </View>
              </View>
            </View>
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

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountScrollList}>
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
                    style={[styles.accountOverviewCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}
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
                      {formatCurrency(bal, { symbol: 'PKR' })}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setShowAddAccount(true)}
                style={[styles.accountAddCard, { borderColor: colors.primary + '50', backgroundColor: colors.primaryLight }]}
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
                onPress={() => {
                  setManageHubTab('categories');
                  setShowManageHub(true);
                }}
                style={styles.cleanSectionAction}
                activeOpacity={0.7}
              >
                <Ionicons name="grid-outline" size={14} color={colors.primary} />
                <ThemedText style={[styles.cleanSectionActionText, { color: colors.primary }]}>Categories</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
              {categoryBreakdown.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="pie-chart-outline" size={32} color={colors.borderSubtle} />
                  <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No expenses this month</ThemedText>
                </View>
              ) : (
                <>
                  <View style={styles.progressBarsContainer}>
                    {categoryBreakdown.map((cat) => {
                      const meta = getCategoryMeta(cat.cat_id, categories);
                      const displayName = getCategoryDisplayName(cat.cat_id, categories);
                      const progressPct = Math.min(100, cat.budgetLimit > 0 ? (cat.budgetPct || 0) : cat.percent);
                      return (
                        <View key={cat.cat_id} style={styles.categoryItemBlock}>
                          <View style={styles.categoryProgressRow}>
                            <View style={styles.categoryInfo}>
                              <View style={[styles.categoryDot, { backgroundColor: meta.color }]} />
                              <ThemedText style={[styles.categoryLabel, { color: colors.text }]}>{displayName}</ThemedText>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                              <ThemedText style={[styles.categoryAmountSub, { color: colors.textSecondary }]}>
                                PKR {cat.amount.toLocaleString()}
                                {cat.budgetLimit > 0 ? ` / ${cat.budgetLimit.toLocaleString()}` : ''}
                              </ThemedText>
                              <ThemedText style={[styles.categoryPercentText, { color: cat.isOverBudget ? colors.expense : meta.color }]}>
                                {cat.budgetLimit > 0 ? (cat.isOverBudget ? `OVER ${cat.budgetPct}%` : `${cat.budgetPct}%`) : `${cat.percent}%`}
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
                                  backgroundColor: cat.isOverBudget ? colors.expense : meta.color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</ThemedText>
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
              {recentTxs.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="receipt-outline" size={32} color={colors.borderSubtle} />
                  <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet</ThemedText>
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => router.push('/add-transaction')}
                  >
                    <ThemedText style={[styles.emptyActionText, { color: colors.primary }]}>+ Add your first transaction</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                recentTxs.map((tx) => {
                  const meta = getCategoryMeta(tx.category_id, categories);
                  const title = tx.note || getCategoryDisplayName(tx.category_id, categories);
                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[styles.activityItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}
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
                        <ThemedText style={[styles.activityTitle, { color: colors.text }]}>{title}</ThemedText>
                        <ThemedText style={[styles.activityMeta, { color: colors.textSecondary }]}>
                          {accountMap[tx.account_id] ?? 'Account'} • {formatDate(tx.date, 'short')}
                        </ThemedText>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                        <ThemedText style={[styles.activityAmount, { color: tx.type === 'income' ? colors.income : colors.expense }]}>
                          {tx.type === 'income' ? '+' : '-'}PKR {tx.amount.toLocaleString()}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 100 },

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

  // Accounts Horizontal Carousel
  accountScrollList: { gap: Spacing.sm, paddingRight: Spacing.md },
  accountOverviewCard: { width: 148, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, justifyContent: 'space-between', shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  accountCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  accountIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accountTypeBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  accountCardName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  accountCardBal: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  accountAddCard: { width: 124, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
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
  activityItem: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  activityIconCircle: { width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  activityDetails: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activityMeta: { fontSize: 11 },
  activityAmount: { fontSize: 14, fontWeight: '700' },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 13 },
  emptyAction: { marginTop: Spacing.xs },
  emptyActionText: { fontSize: 13, fontWeight: '600' },
});
