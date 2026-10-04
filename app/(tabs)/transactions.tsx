import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
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
import type { TransactionRecord } from '@/database/repositories/types';

// Group transactions by human-readable date header
function groupByDate(txList: TransactionRecord[]) {
  const groups: { label: string; items: TransactionRecord[] }[] = [];
  const map: Record<string, TransactionRecord[]> = {};
  const order: string[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const tx of txList) {
    const d = new Date(tx.date);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = formatDate(tx.date, 'medium');

    if (!map[label]) { map[label] = []; order.push(label); }
    map[label].push(tx);
  }

  for (const label of order) groups.push({ label, items: map[label] });
  return groups;
}

type FilterType = 'all' | 'income' | 'expense';

export default function TransactionsScreen() {
  const { transactions, accounts, categories } = useAppStore();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  // Edit / Delete transaction modal state
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransactionRecord | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inNote = tx.note?.toLowerCase().includes(q) ?? false;
        const inCatId = tx.category_id.toLowerCase().includes(q);
        const catName = getCategoryDisplayName(tx.category_id, categories).toLowerCase();
        const inCatName = catName.includes(q);
        const inAcc  = (accountMap[tx.account_id] ?? '').toLowerCase().includes(q);
        if (!inNote && !inCatId && !inCatName && !inAcc) return false;
      }
      return true;
    });
  }, [transactions, filter, searchQuery, accountMap, categories]);

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
              placeholder="Search by note, category, account…"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as FilterType[]).map((f) => {
            const isSelected = filter === f;
            const activeBg = f === 'expense' ? colors.expense : f === 'income' ? colors.income : colors.primary;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? activeBg : colors.surface,
                    borderColor: isSelected ? activeBg : colors.borderSubtle,
                    shadowColor: colors.cardShadow,
                    shadowOpacity: isDark ? 0.15 : 0.03,
                  },
                ]}
              >
                <ThemedText style={[styles.filterText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }, isSelected && { fontWeight: '700' }]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
          <ThemedText style={[styles.countBadge, { color: colors.textMuted }]}>{filtered.length} total</ThemedText>
        </View>

        {/* Transaction List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {grouped.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={48} color={colors.borderSubtle} />
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No Transactions</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery ? 'No results for your search.' : 'Add your first transaction using the + button.'}
              </ThemedText>
            </View>
          ) : (
            grouped.map(({ label, items }) => (
              <View key={label}>
                <ThemedText style={[styles.dateHeader, { color: colors.textSecondary }]}>{label}</ThemedText>
                <View style={styles.listContainer}>
                  {items.map((tx) => {
                    const meta = getCategoryMeta(tx.category_id, categories);
                    const categoryName = getCategoryDisplayName(tx.category_id, categories);
                    const title = tx.note || categoryName;
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
                            {accountMap[tx.account_id] ?? 'Account'} • {categoryName}
                          </ThemedText>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                          <ThemedText style={[styles.activityAmount, { color: tx.type === 'income' ? colors.income : colors.expense }]}>
                            {tx.type === 'income' ? '+' : '-'}PKR {tx.amount.toLocaleString()}
                          </ThemedText>
                          <ThemedText style={[styles.activityTime, { color: colors.textMuted }]}>{formatDate(tx.date, 'short')}</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  safeArea:         { flex: 1 },

  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  headerTitle:      { fontSize: 24, fontWeight: '800' },
  headerActionBtn:  { padding: 8, alignItems: 'center', justifyContent: 'center' },

  searchBar:        { marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  searchInput:      { flex: 1, fontSize: 14, padding: 0 },

  filterRow:        { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: Spacing.sm, marginBottom: Spacing.md, alignItems: 'center' },
  filterPill:       { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 },
  filterText:       { fontSize: 13, fontWeight: '500' },
  countBadge:       { marginLeft: 'auto', fontSize: 12, fontWeight: '600' },

  scrollContent:    { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  dateHeader:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  listContainer:    { gap: Spacing.sm },

  activityItem:     { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  activityIconCircle:{ width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  activityDetails:  { flex: 1 },
  activityTitle:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activityMeta:     { fontSize: 11 },
  activityAmount:   { fontSize: 14, fontWeight: '700' },
  activityTime:     { fontSize: 10, marginTop: 2 },

  emptyBox:         { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle:       { fontSize: 16, fontWeight: '700' },
  emptyText:        { fontSize: 13, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
