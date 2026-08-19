import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';

const MONTHLY_CATEGORIES = [
  { name: 'Food & Dining', percent: 42, color: '#F59E0B', amount: 14200 },
  { name: 'Bills & Utilities', percent: 28, color: '#EF4444', amount: 9500 },
  { name: 'Transport', percent: 18, color: '#3B82F6', amount: 6100 },
  { name: 'Shopping', percent: 12, color: '#EC4899', amount: 4100 },
];

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown'>('overview');

  const income = 85000;
  const expense = 33900;
  const netSavings = income - expense;
  const savingsRate = Math.round((netSavings / income) * 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
            Financial Reports
          </ThemedText>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={20} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            onPress={() => setActiveTab('overview')}
            style={[
              styles.tabPill,
              activeTab === 'overview' && { backgroundColor: '#10B981' },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'overview' && { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              Income vs Expense
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('breakdown')}
            style={[
              styles.tabPill,
              activeTab === 'breakdown' && { backgroundColor: '#10B981' },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'breakdown' && { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              Categories
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Income vs Expense Bar Widget (Figma Screen 8) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText variant="title3" style={{ color: '#FFFFFF', fontWeight: '700' }}>
                Cashflow Summary
              </ThemedText>
              <ThemedText variant="caption" style={{ color: '#94A3B8' }}>
                August 2026
              </ThemedText>
            </View>

            {/* Visual Bar Comparison */}
            <View style={styles.barChartRow}>
              <View style={styles.barColumn}>
                <ThemedText style={styles.barAmount}>PKR 85K</ThemedText>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: '100%', backgroundColor: '#10B981' }]} />
                </View>
                <ThemedText style={[styles.barLabel, { color: '#10B981' }]}>Income</ThemedText>
              </View>

              <View style={styles.barColumn}>
                <ThemedText style={styles.barAmount}>PKR 34K</ThemedText>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: '40%', backgroundColor: '#EF4444' }]} />
                </View>
                <ThemedText style={[styles.barLabel, { color: '#EF4444' }]}>Expense</ThemedText>
              </View>
            </View>

            {/* Net Savings Box */}
            <View style={styles.savingsBox}>
              <View>
                <ThemedText style={styles.savingsLabel}>NET SAVINGS</ThemedText>
                <ThemedText style={styles.savingsValue}>
                  +PKR {netSavings.toLocaleString()}
                </ThemedText>
              </View>
              <View style={styles.savingsBadge}>
                <ThemedText style={styles.savingsBadgeText}>{savingsRate}% Saved</ThemedText>
              </View>
            </View>
          </View>

          {/* Category Breakdown Details */}
          <View style={styles.sectionHeader}>
            <ThemedText variant="title3" style={{ color: '#FFFFFF', fontWeight: '700' }}>
              Expense Breakdown
            </ThemedText>
          </View>

          <View style={styles.categoryList}>
            {MONTHLY_CATEGORIES.map((cat, idx) => (
              <View key={idx} style={styles.categoryRowCard}>
                <View style={styles.categoryInfoLeft}>
                  <View style={[styles.categoryIndicator, { backgroundColor: cat.color }]} />
                  <View>
                    <ThemedText style={styles.categoryTitle}>{cat.name}</ThemedText>
                    <ThemedText style={styles.categorySub}>{cat.percent}% of total</ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.categoryAmount}>
                  PKR {cat.amount.toLocaleString()}
                </ThemedText>
              </View>
            ))}
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
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#151D2A',
    borderWidth: 1,
    borderColor: '#222F45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#151D2A',
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: '#222F45',
    marginBottom: Spacing.lg,
  },
  tabPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'] + 20,
  },
  card: {
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
    marginBottom: Spacing.lg,
  },
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  barTrack: {
    width: 36,
    height: 100,
    backgroundColor: '#111827',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  savingsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  savingsLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  savingsValue: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  savingsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  savingsBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  categoryList: {
    gap: Spacing.sm,
  },
  categoryRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151D2A',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#222F45',
  },
  categoryInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: Radius.xs,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  categoryAmount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
