import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';

const BUDGET_ITEMS = [
  {
    id: '1',
    category: 'Food & Dining',
    icon: 'fast-food-outline' as const,
    color: '#F59E0B',
    spent: 14200,
    total: 20000,
  },
  {
    id: '2',
    category: 'Bills & Utilities',
    icon: 'flash-outline' as const,
    color: '#EF4444',
    spent: 9500,
    total: 15000,
  },
  {
    id: '3',
    category: 'Transport',
    icon: 'car-outline' as const,
    color: '#3B82F6',
    spent: 6100,
    total: 8000,
  },
  {
    id: '4',
    category: 'Shopping',
    icon: 'cart-outline' as const,
    color: '#EC4899',
    spent: 4100,
    total: 7000,
  },
];

export default function BudgetsScreen() {
  const router = useRouter();

  const totalSpent = BUDGET_ITEMS.reduce((sum, item) => sum + item.spent, 0);
  const totalLimit = BUDGET_ITEMS.reduce((sum, item) => sum + item.total, 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallPercentage = Math.round((totalSpent / totalLimit) * 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
            Monthly Budgets
          </ThemedText>
          <TouchableOpacity
            onPress={() => router.push('/add-transaction')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Budget Summary Card (Figma Screen 7) */}
          <View style={styles.mainBudgetCard}>
            <View style={styles.cardHeaderRow}>
              <ThemedText variant="caption" style={{ color: '#94A3B8', fontWeight: '700' }}>
                TOTAL BUDGET REMAINING
              </ThemedText>
              <View style={styles.monthBadge}>
                <ThemedText style={styles.monthText}>August 2026</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.remainingAmount}>
              PKR {totalRemaining.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.budgetSubText}>
              Spent PKR {totalSpent.toLocaleString()} of PKR {totalLimit.toLocaleString()} ({overallPercentage}%)
            </ThemedText>

            {/* Overall Progress Bar */}
            <View style={styles.overallProgressBarBg}>
              <View
                style={[
                  styles.overallProgressBarFill,
                  { width: `${overallPercentage}%` },
                ]}
              />
            </View>
          </View>

          {/* Category Budgets Header */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="title3" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              Category Budgets
            </ThemedText>
            <ThemedText variant="caption" style={{ color: '#94A3B8' }}>
              {BUDGET_ITEMS.length} active
            </ThemedText>
          </View>

          {/* Category Budget Items */}
          <View style={styles.budgetList}>
            {BUDGET_ITEMS.map((item) => {
              const percent = Math.min(100, Math.round((item.spent / item.total) * 100));
              const remaining = item.total - item.spent;
              return (
                <View key={item.id} style={styles.budgetItemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemCategoryInfo}>
                      <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View>
                        <ThemedText style={styles.itemTitle}>{item.category}</ThemedText>
                        <ThemedText style={styles.itemRemaining}>
                          PKR {remaining.toLocaleString()} left
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText style={styles.itemPercent}>{percent}%</ThemedText>
                  </View>

                  <View style={styles.itemProgressBarBg}>
                    <View
                      style={[
                        styles.itemProgressBarFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: percent > 85 ? '#EF4444' : item.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.itemFooter}>
                    <ThemedText style={styles.spentText}>
                      Spent: PKR {item.spent.toLocaleString()}
                    </ThemedText>
                    <ThemedText style={styles.limitText}>
                      Limit: PKR {item.total.toLocaleString()}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Set New Budget CTA */}
          <View style={styles.ctaContainer}>
            <ThemedButton
              title="+ Set New Budget"
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => router.push('/add-transaction')}
              style={styles.setBudgetBtn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#151D2A',
    borderWidth: 1,
    borderColor: '#222F45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'] + 20,
  },
  mainBudgetCard: {
    backgroundColor: '#151D2A',
    borderRadius: Radius['2xl'],
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#222F45',
    marginBottom: Spacing.xl,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  monthBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  monthText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  remainingAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: Spacing.xs,
  },
  budgetSubText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  overallProgressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  overallProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  budgetList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  budgetItemCard: {
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#222F45',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemRemaining: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '500',
  },
  itemPercent: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#111827',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  itemProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spentText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  limitText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  ctaContainer: {
    marginTop: Spacing.xs,
  },
  setBudgetBtn: {
    borderColor: '#10B981',
    borderRadius: Radius.xl,
  },
});
