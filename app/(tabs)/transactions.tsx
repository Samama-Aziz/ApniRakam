import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';

const ALL_TRANSACTIONS = [
  {
    id: '1',
    title: 'Monal Restaurant',
    category: 'Food & Dining',
    icon: 'fast-food-outline' as const,
    iconColor: '#F59E0B',
    account: 'Meezan Bank',
    amount: 2450,
    type: 'expense' as const,
    date: 'Today, 2:30 PM',
  },
  {
    id: '2',
    title: 'Monthly Salary',
    category: 'Income',
    icon: 'cash-outline' as const,
    iconColor: '#10B981',
    account: 'Bank Transfer',
    amount: 85000,
    type: 'income' as const,
    date: 'Yesterday',
  },
  {
    id: '3',
    title: 'Shell Petrol Station',
    category: 'Transport',
    icon: 'car-outline' as const,
    iconColor: '#3B82F6',
    account: 'SadaPay',
    amount: 3200,
    type: 'expense' as const,
    date: '18 Aug',
  },
  {
    id: '4',
    title: 'IESCO Electricity Bill',
    category: 'Bills & Utilities',
    icon: 'flash-outline' as const,
    iconColor: '#EF4444',
    account: 'EasyPaisa',
    amount: 8450,
    type: 'expense' as const,
    date: '17 Aug',
  },
  {
    id: '5',
    title: 'Freelance Project Payout',
    category: 'Income',
    icon: 'laptop-outline' as const,
    iconColor: '#8B5CF6',
    account: 'Nayapay',
    amount: 25000,
    type: 'income' as const,
    date: '15 Aug',
  },
  {
    id: '6',
    title: 'Imtiaz Super Market',
    category: 'Groceries',
    icon: 'basket-outline' as const,
    iconColor: '#14B8A6',
    account: 'Cash in Hand',
    amount: 6300,
    type: 'expense' as const,
    date: '14 Aug',
  },
];

export default function TransactionsScreen() {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = ALL_TRANSACTIONS.filter((t) => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="title2" style={{ color: '#FFFFFF', fontWeight: '800' }}>
            Activity History
          </ThemedText>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Filter Pills (Figma Screen 5) */}
        <View style={styles.filterRow}>
          {(['all', 'expense', 'income'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                filter === f && {
                  backgroundColor: f === 'expense' ? '#EF4444' : '#10B981',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  filter === f && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions Grouped List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.listContainer}>
            {filteredTransactions.map((tx) => (
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: '#151D2A',
    borderWidth: 1,
    borderColor: '#222F45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: '#151D2A',
    borderWidth: 1,
    borderColor: '#222F45',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'] + 20,
  },
  listContainer: {
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
