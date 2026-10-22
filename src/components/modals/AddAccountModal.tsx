import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { accountRepository } from '@/database';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboard } from '@/hooks/useKeyboard';
import { ACCOUNT_TYPE_OPTIONS, AccountTypeOption } from '@/utils/categoryMeta';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';
import type { AccountRecord } from '@/database/repositories/types';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onAccountCreated?: (account: AccountRecord) => void;
}

export function AddAccountModal({ visible, onClose, onAccountCreated }: AddAccountModalProps) {
  const { colors, isDark } = useTheme();
  const { addAccountToStore, loadAppData, currency, currencySymbol } = useAppStore();
  const sym = currencySymbol || currency || 'PKR';
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountTypeOption['type']>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningBalanceFocused, setIsOpeningBalanceFocused] = useState(false);

  useEffect(() => {
    if (isKeyboardVisible && isOpeningBalanceFocused) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isKeyboardVisible, isOpeningBalanceFocused]);

  // Custom alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const resetForm = () => {
    setName('');
    setSelectedType('bank');
    setOpeningBalance('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const resolvedName = selectedType === 'cash' && !trimmedName ? 'Cash Wallet' : trimmedName;

    if (!resolvedName) {
      setAlertConfig({
        visible: true,
        title: 'Account Name Required',
        message: 'Please enter a name for the account (e.g. Meezan Bank, Easypaisa, Cash Wallet).',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    const parsedBalance = parseFloat(openingBalance.replace(/,/g, '')) || 0;

    try {
      setIsSubmitting(true);
      const newAccount = await accountRepository.create({
        name: resolvedName,
        type: selectedType,
        currency: currency || 'PKR',
        opening_balance: parsedBalance,
      });

      addAccountToStore(newAccount);
      await loadAppData();

      if (onAccountCreated) {
        onAccountCreated(newAccount);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to create account:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Could not create account. Please check your inputs and try again.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent={true} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={[
          styles.overlay,
          Platform.OS === 'android' && isKeyboardVisible && { paddingBottom: keyboardHeight },
        ]}
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
            <View>
              <ThemedText variant="title3" style={[styles.title, { color: colors.text }]}>
                Add New Account
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Track cash, bank accounts & mobile wallets
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
            {/* Account Name */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                ACCOUNT NAME
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={selectedType === 'cash' ? 'Cash Wallet' : 'e.g. Meezan Bank, Sadapay'}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                    color: colors.text,
                  },
                ]}
                autoFocus={true}
                onFocus={() => {
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
              />
            </View>

            {/* Account Type Selector */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                ACCOUNT TYPE
              </ThemedText>
              <View style={styles.typeList}>
                {ACCOUNT_TYPE_OPTIONS.map((item) => {
                  const isSelected = selectedType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      onPress={() => {
                        setSelectedType(item.type);
                        if (item.type === 'cash' && !name.trim()) {
                          setName('Cash Wallet');
                        }
                      }}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        },
                        isSelected && {
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : colors.primaryLight,
                          borderWidth: 1.5,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.typeIconCircle,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5')
                              : (isDark ? colors.surface : colors.backgroundSecondary),
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <View style={{ flex: 1, flexShrink: 1 }}>
                        <ThemedText
                          style={[
                            styles.typeName,
                            { color: colors.text },
                            isSelected && { color: colors.text, fontWeight: '700' },
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                        <ThemedText style={[styles.typeDesc, { color: colors.textSecondary }]}>
                          {item.subtitle}
                        </ThemedText>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Opening Balance */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                OPENING / CURRENT BALANCE ({sym})
              </ThemedText>
              <View
                style={[
                  styles.balanceInputWrapper,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <ThemedText style={[styles.currencyBadge, { color: colors.primary }]}>{sym}</ThemedText>
                <TextInput
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  style={[styles.balanceInput, { color: colors.text }]}
                  onFocus={() => {
                    setIsOpeningBalanceFocused(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 120);
                  }}
                  onBlur={() => setIsOpeningBalanceFocused(false)}
                />
              </View>
              <ThemedText style={[styles.helperText, { color: colors.textSecondary }]}>
                Initial balance in this account before logging new transactions
              </ThemedText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <ThemedButton
              title="Cancel"
              variant="ghost"
              onPress={handleClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <ThemedButton
              title={isSubmitting ? 'Creating…' : 'Create Account'}
              variant="cta"
              onPress={handleCreate}
              disabled={isSubmitting}
              style={{ flex: 2 }}
            />
          </View>

          {/* Custom alert within modal presentation */}
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
    maxHeight: '90%',
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
  title: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
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
    paddingBottom: Spacing.base,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.xs + 2,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  textInput: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  typeList: {
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  typeCardSelected: {},
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconCircleSelected: {},
  typeName: {
    fontSize: 14,
    fontWeight: '700',
  },
  typeNameSelected: {},
  typeDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  balanceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
  },
  currencyBadge: {
    fontWeight: '800',
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  balanceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Spacing.md,
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});

export default AddAccountModal;
