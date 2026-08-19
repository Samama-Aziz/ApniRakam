import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedCard from '@/components/common/ThemedCard';
import ApniRakamLogo from '@/components/logo/ApniRakamLogo';

interface RecentTransaction {
  id: string;
  title: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  account: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

const SAMPLE_RECENT_TRANSACTIONS: RecentTransaction[] = [
  {
    id: '1',
    title: 'Monal Restaurant',
    category: 'Food & Dining',
    icon: 'fast-food-outline',
    iconColor: '#F59E0B',
    account: 'Meezan Bank',
    amount: 2450,
    type: 'expense',
    date: 'Today, 2:30 PM',
  },
  {
    id: '2',
    title: 'Monthly Salary',
    category: 'Income',
    icon: 'cash-outline',
    iconColor: '#10B981',
    account: 'Bank Transfer',
    amount: 85000,
    type: 'income',
    date: 'Yesterday',
  },
  {
    id: '3',
    title: 'Shell Petrol Station',
    category: 'Transport',
    icon: 'car-outline',
    iconColor: '#3B82F6',
    account: 'SadaPay',
    amount: 3200,
    type: 'expense',
    date: '18 Aug',
  },
  {
    id: '4',
    title: 'IESCO Electricity Bill',
    category: 'Bills & Utilities',
    icon: 'flash-outline',
    iconColor: '#EF4444',
    account: 'EasyPaisa',
    amount: 8450,
    type: 'expense',
    date: '17 Aug',
  },
];

const CATEGORY_BREAKDOWN = [
  { name: 'Food & Dining', percent: 42, color: '#F59E0B', amount: 14200 },
  { name: 'Bills & Utilities', percent: 28, color: '#EF4444', amount: 9500 },
  { name: 'Transport', percent: 18, color: '#3B82F6', amount: 6100 },
  { name: 'Shopping', percent: 12, color: '#EC4899', amount: 4100 },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { totalBalance, totalIncome, totalExpenses } = useAppStore();

  const today = formatDate(new Date(), 'full');
  const displayBalance = totalBalance === 0 ? 45230 : totalBalance;
  const displayIncome = totalIncome === 0 ? 85000 : totalIncome;
  const displayExpenses = totalExpenses === 0 ? 33900 : totalExpenses;

  const handleAddTransaction = () => {
    router.push('/add-transaction');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Row (Figma Screen 3) */}
          <View style={styles.header}>
            <View>
              <ThemedText variant="caption" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>
                WELCOME BACK
              </ThemedText>
              <ThemedText variant="title2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                Apni Rakam
              </ThemedText>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/add-transaction')}
              style={styles.notificationBadge}
            >
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>

          {/* Balance Hero Card */}
          <View style={styles.balanceHeroCard}>
            <View style={styles.balanceCardTop}>
              <View>
                <ThemedText style={styles.balanceLabel}>TOTAL BALANCE</ThemedText>
                <ThemedText style={styles.balanceUrdu}>کل بیلنس</ThemedText>
              </View>
              <View style={styles.currencyBadge}>
                <ThemedText style={styles.currencyBadgeText}>PKR</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.balanceNumber}>
              {formatCurrency(displayBalance, { symbol: 'PKR' })}
            </ThemedText>

            {/* Income & Expense Quick Sub-Bars */}
            <View style={styles.subStatsRow}>
              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="arrow-down" size={14} color="#10B981" />
                </View>
                <View>
                  <ThemedText style={styles.subStatTitle}>Income</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: '#10B981' }]}>
                    {formatCurrency(displayIncome, { symbol: 'PKR' })}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.subStatItem}>
                <View style={[styles.subStatIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="arrow-up" size={14} color="#EF4444" />
                </View>
                <View>
                  <ThemedText style={styles.subStatTitle}>Expenses</ThemedText>
                  <ThemedText style={[styles.subStatValue, { color: '#EF4444' }]}>
                    {formatCurrency(displayExpenses, { symbol: 'PKR' })}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* Spending by Category Widget (Figma Screen 3) */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText variant="title3" style={styles.sectionTitle}>
                Spending by Category
              </ThemedText>
              <ThemedText variant="caption" style={{ color: '#10B981', fontWeight: '600' }}>
                This Month
              </ThemedText>
            </View>

            <ThemedCard variant="elevated" padding="md" style={styles.categoryCard}>
              <View style={styles.progressBarsContainer}>
                {CATEGORY_BREAKDOWN.map((cat, idx) => (
                  <View key={idx} style={styles.categoryProgressRow}>
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <ThemedText style={styles.categoryLabel}>{cat.name}</ThemedText>
                    </View>
                    <ThemedText style={styles.categoryPercent}>{cat.percent}%</ThemedText>
                  </View>
                ))}
              </View>

              {/* Visual Multi-Segment Bar */}
              <View style={styles.multiProgressBar}>
                {CATEGORY_BREAKDOWN.map((cat, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: `${cat.percent}%`,
                      height: '100%',
                      backgroundColor: cat.color,
                      borderTopLeftRadius: idx === 0 ? 4 : 0,
                      borderBottomLeftRadius: idx === 0 ? 4 : 0,
                      borderTopRightRadius: idx === CATEGORY_BREAKDOWN.length - 1 ? 4 : 0,
                      borderBottomRightRadius: idx === CATEGORY_BREAKDOWN.length - 1 ? 4 : 0,
                    }}
                  />
                ))}
              </View>
            </ThemedCard>
          </View>

          {/* Recent Activity Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <ThemedText variant="title3" style={styles.sectionTitle}>
                Recent Activity
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <ThemedText variant="caption" style={{ color: '#10B981', fontWeight: '600' }}>
                  See All
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {SAMPLE_RECENT_TRANSACTIONS.map((tx) => (
                <View key={tx.id} style={styles.activityItem}>
                  <View style={[styles.activityIconCircle, { backgroundColor: tx.iconColor + '20' }]}>
                    <Ionicons name={tx.icon} size={20} color={tx.iconColor} />
                  </View>

                  <View style={styles.activityDetails}>
                    <ThemedText style={styles.activityTitle}>{tx.title}</ThemedText>
                    <ThemedText style={styles.activityMeta}>
                      {tx.account} • {tx.date}
                    </ThemedText>
                  </View>

                  <ThemedText
                    style={[
                      styles.activityAmount,
                      { color: tx.type === 'income' ? '#10B981' : '#FFFFFF' },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}PKR {tx.amount.toLocaleString()}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17', // Figma Obsidian
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'] + 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  notificationBadge: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: '#151D2A',
    borderWidth: 1,
    borderColor: '#222F45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceHeroCard: {
    backgroundColor: '#151D2A',
    borderRadius: Radius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222F45',
    marginBottom: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  balanceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balanceUrdu: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  currencyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  currencyBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  balanceNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: Spacing.sm,
    letterSpacing: -0.5,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  subStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#222F45',
    marginHorizontal: Spacing.xs,
  },
  subStatIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subStatTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  subStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  categoryCard: {
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#222F45',
    padding: Spacing.md,
  },
  progressBarsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  categoryProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  categoryLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  categoryPercent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  multiProgressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  activityList: {
    gap: Spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#222F45',
  },
  activityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityMeta: {
    color: '#94A3B8',
    fontSize: 11,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
