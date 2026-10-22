import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getCategoryMeta, getCategoryDisplayName } from '@/utils/categoryMeta';
import { EditTransactionModal } from '@/components/modals/EditTransactionModal';
import { LoanDetailsModal } from '@/components/modals/LoanDetailsModal';
import type { TransactionRecord, LoanRecord } from '@/database/repositories/types';

export type ActivityHistoryItem =
  | { kind: 'transaction'; data: TransactionRecord; date: string }
  | { kind: 'loan'; data: LoanRecord; date: string };

// Group activity items by human-readable date header
function groupByDate(itemList: ActivityHistoryItem[]) {
  const groups: { label: string; items: ActivityHistoryItem[] }[] = [];
  const map: Record<string, ActivityHistoryItem[]> = {};
  const order: string[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of itemList) {
    const d = new Date(item.date);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = formatDate(item.date, 'medium');

    if (!map[label]) {
      map[label] = [];
      order.push(label);
    }
    map[label].push(item);
  }

  for (const label of order) groups.push({ label, items: map[label] });
  return groups;
}

type FilterType = 'all' | 'expense' | 'income' | 'transfer' | 'loans';

export default function TransactionsScreen() {
  const { transactions, accounts, categories, loans, currencySymbol, currency } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  // Edit / Delete transaction modal state
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransactionRecord | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Loan details modal state
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<LoanRecord | null>(null);
  const [loanDetailsModalVisible, setLoanDetailsModalVisible] = useState(false);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  // Combined & Filtered Activities
  const filtered = useMemo(() => {
    const list: ActivityHistoryItem[] = [];

    // Transactions
    if (filter !== 'loans') {
      for (const tx of transactions) {
        if (tx.deleted_at) continue;
        if (filter !== 'all' && tx.type !== filter) continue;
        list.push({ kind: 'transaction', data: tx, date: tx.date });
      }
    }

    // Loans
    if (filter === 'all' || filter === 'loans') {
      for (const loan of loans) {
        if (loan.deleted_at) continue;
        list.push({ kind: 'loan', data: loan, date: loan.date });
      }
    }

    // Sort chronologically descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter((item) => {
        if (item.kind === 'transaction') {
          const tx = item.data;
          const inNote = tx.note?.toLowerCase().includes(q) ?? false;
          const catName = tx.category_id ? getCategoryDisplayName(tx.category_id, categories).toLowerCase() : 'transfer';
          const inCatName = catName.includes(q);
          const inAcc = (accountMap[tx.account_id] ?? '').toLowerCase().includes(q);
          const inToAcc = tx.to_account_id ? (accountMap[tx.to_account_id] ?? '').toLowerCase().includes(q) : false;
          const inType = tx.type.toLowerCase().includes(q);
          return inNote || inCatName || inAcc || inToAcc || inType;
        } else {
          const loan = item.data;
          const inPerson = loan.person_name.toLowerCase().includes(q);
          const inNote = loan.note?.toLowerCase().includes(q) ?? false;
          const inAcc = (accountMap[loan.account_id] ?? '').toLowerCase().includes(q);
          const inType = loan.type.toLowerCase().includes(q);
          const inStatus = loan.status.toLowerCase().includes(q);
          return inPerson || inNote || inAcc || inType || inStatus;
        }
      });
    }

    return list;
  }, [transactions, loans, filter, searchQuery, accountMap, categories]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Activity History</ThemedText>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => { setSearchVisible((v) => !v); setSearchQuery(''); }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={searchVisible ? 'close-outline' : 'search-outline'} size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {searchVisible && (
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by note, category, account, borrower…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        )}

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScrollView}
        >
          {(
            [
              { id: 'all', label: 'All', color: colors.primary },
              { id: 'expense', label: 'Expense', color: colors.expense },
              { id: 'income', label: 'Income', color: colors.income },
              { id: 'transfer', label: 'Transfer', color: '#0EA5E9' },
              { id: 'loans', label: 'Loans', color: '#F59E0B' },
            ] as { id: FilterType; label: string; color: string }[]
          ).map((f) => {
            const isSelected = filter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setFilter(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? f.color : colors.surface,
                    borderColor: isSelected ? f.color : isDark ? colors.borderSubtle : colors.border,
                    shadowColor: colors.cardShadow,
                    shadowOpacity: isDark ? 0.15 : 0.03,
                  },
                ]}
              >
                <ThemedText style={[styles.filterText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }, isSelected && { fontWeight: '700' }]}>
                  {f.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
          <ThemedText style={[styles.countBadge, { color: colors.textMuted }]}>{filtered.length} total</ThemedText>
        </ScrollView>

        {/* Activity List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {grouped.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={48} color={colors.borderSubtle} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No Activity Found</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery ? 'No results for your search query.' : 'Add your first transaction or loan using the + button.'}
              </ThemedText>
            </View>
          ) : (
            grouped.map(({ label, items }) => (
              <View key={label}>
                <ThemedText style={[styles.dateHeader, { color: colors.textSecondary }]}>{label}</ThemedText>
                <View style={styles.listContainer}>
                  {items.map((item) => {
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
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerActionBtn: { padding: 8, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  filterScrollView: {
    marginBottom: Spacing.md,
    flexGrow: 0,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: { fontSize: 13, fontWeight: '500' },
  countBadge: { marginLeft: Spacing.sm, fontSize: 12, fontWeight: '600' },

  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  dateHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  listContainer: { gap: Spacing.sm },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
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
  },
  activityAmountContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: 4,
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

  emptyBox: { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
