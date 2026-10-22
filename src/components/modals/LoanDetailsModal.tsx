import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';
import { loanRepository } from '@/database';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboard } from '@/hooks/useKeyboard';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { LoanRecord, LoanRepaymentRecord } from '@/database/repositories/types';

interface LoanDetailsModalProps {
  visible: boolean;
  loan: LoanRecord | null;
  onClose: () => void;
  onLoanUpdated?: (loan: LoanRecord) => void;
  onLoanDeleted?: (loanId: string) => void;
}

export function LoanDetailsModal({
  visible,
  loan,
  onClose,
  onLoanUpdated,
  onLoanDeleted,
}: LoanDetailsModalProps) {
  const { colors, isDark } = useTheme();
  const { keyboardHeight } = useKeyboard();
  const { accounts, updateLoanInStore, removeLoanFromStore, addRepaymentToStore, loadAppData, currencySymbol, currency } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';
  const scrollRef = React.useRef<ScrollView>(null);

  const [repayments, setRepayments] = useState<LoanRepaymentRecord[]>([]);
  const [isLoadingRepayments, setIsLoadingRepayments] = useState(false);

  // Repayment form state
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayNote, setRepayNote] = useState('');
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  // Map of account id -> account name
  const accountMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [accounts]);

  // Load repayments when modal opens
  useEffect(() => {
    if (loan && visible) {
      setIsLoadingRepayments(true);
      setRepayAccountId(loan.account_id || (accounts[0]?.id ?? ''));
      loanRepository
        .getRepayments(loan.id)
        .then((items) => {
          setRepayments(items);
        })
        .catch((err) => {
          console.error('[LoanDetailsModal] Failed to load repayments:', err);
        })
        .finally(() => {
          setIsLoadingRepayments(false);
        });
    } else {
      setShowRepaymentForm(false);
      setRepayAmount('');
      setRepayNote('');
    }
  }, [loan, visible, accounts]);

  if (!loan) return null;

  const isLent = loan.type === 'lent';
  const remaining = Math.max(0, loan.amount - loan.paid_amount);
  const progressPercent = Math.min(100, Math.round((loan.paid_amount / loan.amount) * 100));

  const statusColor =
    loan.status === 'paid' ? colors.income : loan.status === 'partially_paid' ? colors.primary : '#F59E0B';

  const statusLabel =
    loan.status === 'paid' ? 'PAID' : loan.status === 'partially_paid' ? 'PARTIALLY PAID' : 'PENDING';

  const handleRecordRepayment = async () => {
    const numAmount = parseFloat(repayAmount.replace(/,/g, ''));
    if (!repayAmount || isNaN(numAmount) || numAmount <= 0) {
      setAlertConfig({
        visible: true,
        title: 'Amount Required',
        message: 'Please enter a valid amount greater than 0.',
        type: 'warning',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (numAmount > remaining) {
      setAlertConfig({
        visible: true,
        title: 'Amount Exceeds Balance',
        message: `The maximum remaining balance for this loan is ${formatCurrency(remaining, { symbol: sym })}.`,
        type: 'warning',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    if (!repayAccountId) {
      setAlertConfig({
        visible: true,
        title: 'Account Required',
        message: 'Please select an account for this payment.',
        type: 'warning',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    try {
      setIsSubmittingRepay(true);
      const res = await loanRepository.addRepayment(
        loan.id,
        numAmount,
        repayAccountId,
        new Date().toISOString(),
        repayNote || undefined
      );

      addRepaymentToStore(res.repayment, res.loan);
      setRepayments((prev) => [res.repayment, ...prev]);
      await loadAppData();

      if (onLoanUpdated) {
        onLoanUpdated(res.loan);
      }

      setShowRepaymentForm(false);
      setRepayAmount('');
      setRepayNote('');

      setAlertConfig({
        visible: true,
        title: 'Repayment Recorded',
        message:
          res.loan.status === 'paid'
            ? 'This loan is now fully settled!'
            : `Recorded payment of ${formatCurrency(numAmount, { symbol: sym })}.`,
        type: 'success',
        buttons: [{ text: 'OK' }],
      });
    } catch (e) {
      console.error('[LoanDetailsModal] Failed to record repayment:', e);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Could not record repayment. Please try again.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  const handleDelete = () => {
    setAlertConfig({
      visible: true,
      title: 'Delete Loan',
      message: `Are you sure you want to delete this loan for ${loan.person_name}? Account balances will be adjusted.`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const success = await loanRepository.delete(loan.id);
              if (success) {
                removeLoanFromStore(loan.id);
                await loadAppData();
                if (onLoanDeleted) onLoanDeleted(loan.id);
                onClose();
              }
            } catch (err) {
              console.error('[LoanDetailsModal] Delete failed:', err);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Failed to delete loan.',
                type: 'destructive',
                buttons: [{ text: 'OK' }],
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={[styles.overlay, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              shadowColor: colors.cardShadow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.35 : 0.08,
              shadowRadius: 16,
              elevation: 16,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.typeIconCircle,
                    { backgroundColor: isLent ? '#F59E0B20' : '#8B5CF620' },
                  ]}
                >
                  <Ionicons
                    name={isLent ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={20}
                    color={isLent ? '#F59E0B' : '#8B5CF6'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="title3" style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {isLent ? `Lent to ${loan.person_name}` : `Borrowed from ${loan.person_name}`}
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {isLent ? 'Money Given (Receivable)' : 'Money Taken (Payable)'}
                  </ThemedText>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* Status & Key Metrics Card */}
            <View
              style={[
                styles.metricsCard,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={styles.metricsHeaderRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <ThemedText style={[styles.statusText, { color: statusColor }]}>{statusLabel}</ThemedText>
                </View>
                <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
                  {formatDate(loan.date, 'medium')}
                </ThemedText>
              </View>

              <View style={styles.amountsRow}>
                <View style={styles.amountCol}>
                  <ThemedText style={[styles.amountLabel, { color: colors.textSecondary }]}>TOTAL AMOUNT</ThemedText>
                  <ThemedText style={[styles.amountVal, { color: colors.text }]}>
                    {formatCurrency(loan.amount, { symbol: sym })}
                  </ThemedText>
                </View>
                <View style={styles.amountCol}>
                  <ThemedText style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    {isLent ? 'RETURNED' : 'REPAID'}
                  </ThemedText>
                  <ThemedText style={[styles.amountVal, { color: colors.income }]}>
                    {formatCurrency(loan.paid_amount, { symbol: sym })}
                  </ThemedText>
                </View>
                <View style={styles.amountCol}>
                  <ThemedText style={[styles.amountLabel, { color: colors.textSecondary }]}>REMAINING</ThemedText>
                  <ThemedText style={[styles.amountVal, { color: remaining > 0 ? (isLent ? '#F59E0B' : '#EF4444') : colors.textSecondary }]}>
                    {formatCurrency(remaining, { symbol: sym })}
                  </ThemedText>
                </View>
              </View>

              {/* Progress Track */}
              <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: loan.status === 'paid' ? colors.income : colors.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText style={[styles.progressText, { color: colors.textSecondary }]}>
                {progressPercent}% Settled {remaining > 0 ? `(${formatCurrency(remaining, { symbol: sym })} outstanding)` : ''}
              </ThemedText>
            </View>

            {/* Account & Details */}
            <View style={styles.detailsGroup}>
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Used</ThemedText>
                <ThemedText style={[styles.detailValue, { color: colors.text }]}>
                  {accountMap[loan.account_id] ?? 'Account'}
                </ThemedText>
              </View>
              {loan.due_date && (
                <View style={styles.detailRow}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Expected By</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: '#F59E0B', fontWeight: '700' }]}>
                    {formatDate(loan.due_date, 'medium')}
                  </ThemedText>
                </View>
              )}
              {loan.note ? (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <ThemedText style={[styles.detailLabel, { color: colors.textSecondary }]}>Note</ThemedText>
                  <ThemedText style={[styles.detailValue, { color: colors.text, flex: 1, textAlign: 'right' }]}>
                    {loan.note}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* Repayment Form (Expandable) */}
            {loan.status !== 'paid' && (
              <View style={styles.repaymentSection}>
                {!showRepaymentForm ? (
                  <ThemedButton
                    title={isLent ? '+ Record Payment Received' : '+ Record Payment Made'}
                    variant="cta"
                    onPress={() => setShowRepaymentForm(true)}
                    style={{ marginBottom: Spacing.md }}
                  />
                ) : (
                  <View
                    style={[
                      styles.repayFormCard,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <View style={styles.repayFormHeader}>
                      <ThemedText style={[styles.repayFormTitle, { color: colors.text }]}>
                        {isLent ? 'Record Payment Received' : 'Record Payment Sent'}
                      </ThemedText>
                      <TouchableOpacity onPress={() => setShowRepaymentForm(false)}>
                        <Ionicons name="close" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <ThemedText variant="label" style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      AMOUNT (MAX: {sym} {remaining.toLocaleString()})
                    </ThemedText>
                    <TextInput
                      value={repayAmount}
                      onChangeText={setRepayAmount}
                      placeholder={String(remaining)}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      onFocus={() => {
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                      }}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: isDark ? colors.surface : colors.surfaceMuted,
                          borderColor: colors.borderSubtle,
                          color: colors.text,
                        },
                      ]}
                      autoFocus={true}
                    />

                    <ThemedText variant="label" style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      ACCOUNT {isLent ? 'DEPOSITED TO' : 'PAID FROM'}
                    </ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accScroll}>
                      {accounts.map((acc) => {
                        const isSelected = repayAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            onPress={() => setRepayAccountId(acc.id)}
                            style={[
                              styles.accChip,
                              {
                                backgroundColor: isSelected ? colors.primaryLight : isDark ? colors.surface : colors.surfaceMuted,
                                borderColor: isSelected ? colors.primary : colors.borderSubtle,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.accChipText,
                                { color: isSelected ? colors.primary : colors.textSecondary },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {acc.name}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <ThemedText variant="label" style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      NOTE (OPTIONAL)
                    </ThemedText>
                    <TextInput
                      value={repayNote}
                      onChangeText={setRepayNote}
                      placeholder="e.g. Part payment via Sadapay"
                      placeholderTextColor={colors.textTertiary}
                      onFocus={() => {
                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                      }}
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: isDark ? colors.surface : colors.surfaceMuted,
                          borderColor: colors.borderSubtle,
                          color: colors.text,
                        },
                      ]}
                    />

                    <View style={styles.repayFormActions}>
                      <ThemedButton
                        title="Cancel"
                        variant="ghost"
                        onPress={() => setShowRepaymentForm(false)}
                        style={{ flex: 1, marginRight: Spacing.sm }}
                      />
                      <ThemedButton
                        title={isSubmittingRepay ? 'Saving…' : 'Confirm Payment'}
                        variant="cta"
                        onPress={handleRecordRepayment}
                        disabled={isSubmittingRepay}
                        loading={isSubmittingRepay}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Repayments History */}
            <View style={styles.historySection}>
              <ThemedText variant="label" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                PAYMENT HISTORY ({repayments.length})
              </ThemedText>

              {isLoadingRepayments ? (
                <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 16 }} />
              ) : repayments.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <ThemedText style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                    No payments recorded yet.
                  </ThemedText>
                </View>
              ) : (
                repayments.map((rep) => (
                  <View
                    key={rep.id}
                    style={[
                      styles.historyItem,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={[styles.historyDot, { backgroundColor: colors.income }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.historyAmount, { color: colors.text }]}>
                        {formatCurrency(rep.amount, { symbol: sym })}
                      </ThemedText>
                      <ThemedText style={[styles.historySub, { color: colors.textSecondary }]}>
                        {accountMap[rep.account_id] ?? 'Account'} • {formatDate(rep.date, 'short')}
                      </ThemedText>
                      {rep.note ? (
                        <ThemedText style={[styles.historyNote, { color: colors.textMuted }]}>
                          "{rep.note}"
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Footer with Delete Action */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                  borderColor: colors.borderSubtle,
                },
              ]}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={18} color={colors.expense} style={{ marginRight: 6 }} />
              <ThemedText style={[styles.deleteBtnText, { color: colors.expense }]}>
                {isDeleting ? 'Deleting…' : 'Delete Loan'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Alert Dialog */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            buttons={alertConfig.buttons}
            onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
            isInsideModal={true}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl * 3,
  },
  metricsCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metricsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 11,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  amountVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    textAlign: 'right',
  },
  detailsGroup: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs + 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  repaymentSection: {
    marginBottom: Spacing.lg,
  },
  repayFormCard: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  repayFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  repayFormTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  accScroll: {
    marginVertical: 4,
  },
  accChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  accChipText: {
    fontSize: 12,
  },
  repayFormActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  historySection: {
    marginTop: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  emptyHistory: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  historySub: {
    fontSize: 11,
    marginTop: 1,
  },
  historyNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default LoanDetailsModal;
