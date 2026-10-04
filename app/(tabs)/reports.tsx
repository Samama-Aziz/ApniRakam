import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import { CustomAlert } from '@/components/common/CustomAlert';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryMeta, getCategoryDisplayName } from '@/utils/categoryMeta';

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown'>('overview');
  const [monthOffset, setMonthOffset] = useState(0);
  const [showSummaryAlert, setShowSummaryAlert] = useState(false);
  const { transactions, categories } = useAppStore();
  const { colors, isDark } = useTheme();

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const { start, end } = useMemo(() => monthBounds(selectedDate), [selectedDate]);

  const monthTxs = useMemo(() =>
    transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= start && d <= end;
    }),
  [transactions, start, end]);

  // Income vs expense totals
  const { income, expense } = useMemo(() => {
    let income = 0; let expense = 0;
    for (const tx of monthTxs) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [monthTxs]);

  const netSavings  = income - expense;
  const hasIncome   = income > 0;
  const savingsRate = hasIncome ? Math.round((netSavings / income) * 100) : (expense > 0 ? -100 : 0);
  const statusProgressPct = hasIncome
    ? (netSavings >= 0 ? Math.min(100, savingsRate) : Math.min(100, Math.round((expense / income) * 100)))
    : (expense > 0 ? 100 : 0);

  // Data-driven bar heights — taller bar fills the full track, shorter is proportional
  const BAR_TRACK_H = 110;
  const maxVal = Math.max(income, expense, 1);
  const incomeBarH  = Math.max(6, Math.round((income  / maxVal) * BAR_TRACK_H));
  const expenseBarH = Math.max(6, Math.round((expense / maxVal) * BAR_TRACK_H));

  // Category breakdown (expenses)
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of monthTxs) {
      if (tx.type !== 'expense') continue;
      map[tx.category_id] = (map[tx.category_id] ?? 0) + tx.amount;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    return Object.entries(map)
      .map(([cat_id, amt]) => ({ cat_id, amount: amt, percent: Math.round((amt / total) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTxs]);

  const handleExport = () => {
    setShowSummaryAlert(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Financial Reports</ThemedText>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleExport}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="download-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

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

        {/* Tab Selector */}
        <View style={[styles.tabSelector, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={[styles.tabPill, activeTab === 'overview' && { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'overview' && { color: '#FFFFFF', fontWeight: '700' }]}>
              Income vs Expense
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('breakdown')}
            style={[styles.tabPill, activeTab === 'breakdown' && { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'breakdown' && { color: '#FFFFFF', fontWeight: '700' }]}>
              Categories
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {activeTab === 'overview' ? (
            <>
              {/* Cashflow Summary Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.35 : 0.06 }]}>
                <View style={styles.cardHeaderRow}>
                  <ThemedText style={[styles.cardTitle, { color: colors.text }]}>Cashflow Comparison</ThemedText>
                </View>

                {/* Data-driven bar chart */}
                <View style={styles.barChartRow}>
                  <View style={[styles.barColumn, { opacity: income === 0 ? 0.35 : 1 }]}>
                    <ThemedText style={[styles.barAmount, { color: colors.text }]}>PKR {formatCompact(income)}</ThemedText>
                    {/* Track is fixed height; fill grows from bottom */}
                    <View style={[styles.barTrack, { height: BAR_TRACK_H, backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7' }]}>
                      <View style={[styles.barFill, { height: incomeBarH, backgroundColor: colors.income }]} />
                    </View>
                    <ThemedText style={[styles.barLabel, { color: colors.income }]}>Income</ThemedText>
                  </View>

                  <View style={[styles.barColumn, { opacity: expense === 0 ? 0.35 : 1 }]}>
                    <ThemedText style={[styles.barAmount, { color: colors.text }]}>PKR {formatCompact(expense)}</ThemedText>
                    <View style={[styles.barTrack, { height: BAR_TRACK_H, backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7' }]}>
                      <View style={[styles.barFill, { height: expenseBarH, backgroundColor: colors.expense }]} />
                    </View>
                    <ThemedText style={[styles.barLabel, { color: colors.expense }]}>Expense</ThemedText>
                  </View>
                </View>

                {/* Status Bar / Progress Indicator calculated accurately from monthly cashflow */}
                <View style={[styles.statusBarSection, { borderTopColor: colors.borderSubtle }]}>
                  <View style={styles.statusBarHeaderRow}>
                    <ThemedText style={[styles.statusBarLabel, { color: colors.textSecondary }]}>
                      {netSavings >= 0 ? 'NET SAVINGS RATIO' : 'OVERSPENDING RATIO'}
                    </ThemedText>
                    <ThemedText style={[styles.statusBarPercent, { color: netSavings >= 0 ? colors.income : colors.expense }]}>
                      {hasIncome ? `${Math.abs(savingsRate)}%` : (expense > 0 ? '100%' : '0%')}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBarTrack, { backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7' }]}>
                    <View
                      style={[
                        styles.statusBarFill,
                        {
                          width: `${statusProgressPct}%`,
                          backgroundColor: netSavings >= 0 ? colors.income : colors.expense,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Net Savings Box */}
                <View style={[styles.savingsBox, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.borderSubtle }]}>
                  <View>
                    <ThemedText style={[styles.savingsLabel, { color: colors.textSecondary }]}>NET SAVINGS</ThemedText>
                    <ThemedText style={[styles.savingsValue, { color: netSavings >= 0 ? colors.income : colors.expense }]}>
                      {netSavings >= 0 ? '+' : '-'}PKR {Math.abs(netSavings).toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={[styles.savingsBadge, { backgroundColor: netSavings >= 0 ? colors.incomeLight : colors.expenseLight, borderColor: netSavings >= 0 ? colors.income + '40' : colors.expense + '40' }]}>
                    <ThemedText style={[styles.savingsBadgeText, { color: netSavings >= 0 ? colors.income : colors.expense }]}>
                      {Math.abs(savingsRate)}% {savingsRate >= 0 ? 'Saved' : 'Overspent'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Overview Metrics Cards */}
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
                  <ThemedText style={[styles.metricCardLabel, { color: colors.textSecondary }]}>TOTAL TRANSACTIONS</ThemedText>
                  <ThemedText style={[styles.metricCardValue, { color: colors.text }]}>{monthTxs.length}</ThemedText>
                  <ThemedText style={[styles.metricCardSub, { color: colors.textTertiary }]}>recorded this month</ThemedText>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
                  <ThemedText style={[styles.metricCardLabel, { color: colors.textSecondary }]}>SAVINGS RATIO</ThemedText>
                  <ThemedText style={[styles.metricCardValue, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>
                    {savingsRate}%
                  </ThemedText>
                  <ThemedText style={[styles.metricCardSub, { color: colors.textTertiary }]}>of total income</ThemedText>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Category Breakdown */}
              <View style={styles.sectionHeader}>
                <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Expense Breakdown</ThemedText>
                <ThemedText style={[styles.sectionSub, { color: colors.textSecondary }]}>{categoryBreakdown.length} categories</ThemedText>
              </View>

              {categoryBreakdown.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="pie-chart-outline" size={48} color={colors.borderSubtle} />
                  <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No Expenses Recorded</ThemedText>
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>Add expense transactions this month to see the breakdown.</ThemedText>
                </View>
              ) : (
                <View style={styles.categoryList}>
                  {categoryBreakdown.map((cat) => {
                    const meta = getCategoryMeta(cat.cat_id, categories);
                    const categoryName = getCategoryDisplayName(cat.cat_id, categories);
                    return (
                      <View key={cat.cat_id} style={[styles.categoryRowCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.2 : 0.04 }]}>
                        <View style={styles.categoryCardTop}>
                          <View style={styles.categoryInfoLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: meta.color + '20' }]}>
                              <Ionicons name={meta.icon} size={18} color={meta.color} />
                            </View>
                            <ThemedText style={[styles.categoryTitle, { color: colors.text }]}>{categoryName}</ThemedText>
                          </View>
                          <View style={styles.categoryCardRight}>
                            <ThemedText style={[styles.categoryAmount, { color: colors.textSecondary }]}>
                              {formatCurrency(cat.amount, { symbol: 'PKR' })}
                            </ThemedText>
                            <ThemedText style={[styles.categoryBarPercentText, { color: meta.color }]}>
                              {cat.percent}%
                            </ThemedText>
                          </View>
                        </View>
                        {/* Full-width Progress Bar */}
                        <View style={[styles.categoryBarTrack, { backgroundColor: isDark ? colors.backgroundSecondary : '#EDF2F7' }]}>
                          <View
                            style={[
                              styles.categoryBarFill,
                              { width: `${cat.percent}%`, backgroundColor: meta.color },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Custom ApniRakam Monthly Report Summary Alert */}
      <CustomAlert
        visible={showSummaryAlert}
        type="info"
        title="Monthly Report Summary"
        message={`Period: ${monthLabel(selectedDate)}\n\n• Income: PKR ${income.toLocaleString()}\n• Expenses: PKR ${expense.toLocaleString()}\n• Net Savings: PKR ${netSavings.toLocaleString()} (${savingsRate}%)\n• Total Transactions: ${monthTxs.length}`}
        buttons={[{ text: 'Close', style: 'default' }]}
        onClose={() => setShowSummaryAlert(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  safeArea:          { flex: 1 },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  headerTitle:       { fontSize: 24, fontWeight: '800' },
  headerActionBtn:   { padding: 8, alignItems: 'center', justifyContent: 'center' },

  monthNavContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 1 },
  monthNavBtn:       { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  monthLabelWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthNavLabel:     { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  currentMonthDot:   { width: 5, height: 5, borderRadius: 2.5 },

  tabSelector:       { flexDirection: 'row', marginHorizontal: Spacing.xl, borderRadius: Radius.xl, padding: 4, borderWidth: 1, marginBottom: Spacing.lg },
  tabPill:           { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  tabText:           { fontSize: 13, fontWeight: '600' },

  scrollContent:     { paddingHorizontal: Spacing.xl, paddingBottom: 100 },

  card:              { borderRadius: Radius['2xl'], padding: Spacing.lg, borderWidth: 1, marginBottom: Spacing.lg, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  cardHeaderRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  cardTitle:         { fontSize: 16, fontWeight: '700' },
  cardSub:           { fontSize: 12 },

  barChartRow:       { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginBottom: Spacing.lg, paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },
  barColumn:         { alignItems: 'center', justifyContent: 'flex-end' },
  barAmount:         { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  barTrack:          { width: 48, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:           { width: '100%', borderRadius: 10 },
  barLabel:          { fontSize: 12, fontWeight: '700', marginTop: 8 },

  statusBarSection:  { paddingTop: Spacing.md, borderTopWidth: 1, marginBottom: Spacing.md },
  statusBarHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBarLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  statusBarPercent:  { fontSize: 12, fontWeight: '800' },
  statusBarTrack:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  statusBarFill:     { height: '100%', borderRadius: 3 },

  savingsBox:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1 },
  savingsLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  savingsValue:      { fontSize: 18, fontWeight: '900', marginTop: 2 },
  savingsBadge:      { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1 },
  savingsBadgeText:  { fontSize: 12, fontWeight: '700' },

  metricsGrid:       { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  metricCard:        { flex: 1, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  metricCardLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
  metricCardValue:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  metricCardSub:     { fontSize: 11 },

  sectionHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:      { fontSize: 16, fontWeight: '700' },
  sectionSub:        { fontSize: 12 },

  categoryList:      { gap: Spacing.sm },
  categoryRowCard:   { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, gap: Spacing.sm, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  categoryCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryInfoLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  categoryCardRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconCircle:        { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  categoryTitle:     { fontSize: 14, fontWeight: '600' },
  categoryAmount:    { fontSize: 13, fontWeight: '600' },
  categoryBarTrack:  { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  categoryBarFill:   { height: '100%', borderRadius: 3 },
  categoryBarPercentText: { fontSize: 13, fontWeight: '800' },

  emptyBox:          { alignItems: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.sm },
  emptyTitle:        { fontSize: 16, fontWeight: '700' },
  emptyText:         { fontSize: 13, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
