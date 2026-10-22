import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import ApniRakamLogo from '@/components/logo/ApniRakamLogo';
import { SUPPORTED_CURRENCIES } from '@/services/currency';
import { accountRepository } from '@/database';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';
import { useKeyboard } from '@/hooks/useKeyboard';

const CURRENCY_LIST = Object.values(SUPPORTED_CURRENCIES);

const ACCOUNT_TYPES = [
  { value: 'cash',   label: 'Cash / Cash Wallet', icon: 'cash-outline' as const },
  { value: 'bank',   label: 'Bank',               icon: 'business-outline' as const },
  { value: 'wallet', label: 'Wallet',             icon: 'wallet-outline' as const },
  { value: 'credit', label: 'Credit',             icon: 'card-outline' as const },
] as const;

type AccountType = 'cash' | 'bank' | 'wallet' | 'credit';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { setOnboarded, setUserName, setCurrency, setDefaultAccount, loadAppData } = useAppStore();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();

  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 – Name
  const [name, setName] = useState('');

  // Step 2 – Account
  const [accountName, setAccountName] = useState('Cash in Hand');
  const [accountType, setAccountType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState('');

  // Step 3 – Currency
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('PKR');

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (nextStep: Step, direction: 'forward' | 'back') => {
    const outVal = direction === 'forward' ? -1 : 1;
    const inVal = direction === 'forward' ? 1 : -1;
    Animated.timing(slideAnim, { toValue: outVal, duration: 260, useNativeDriver: true }).start(() => {
      setStep(nextStep);
      slideAnim.setValue(inVal);
      Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    });
  };

  const goForward = () => animateToStep((step + 1) as Step, 'forward');
  const goBack    = () => animateToStep((step - 1) as Step, 'back');

  const handleStepAccountContinue = () => {
    if (accountType !== 'cash' && !accountName.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Account Name Required',
        message: 'Please enter a name for your account.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    goForward();
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    try {
      // 1. User name
      const trimmedName = name.trim();
      if (trimmedName) await setUserName(trimmedName);

      // 2. Currency
      const selected = SUPPORTED_CURRENCIES[selectedCurrencyCode];
      if (selected) await setCurrency(selected.code, selected.symbol);

      // 3. Account
      const balance = parseFloat(openingBalance) || 0;
      const finalAccountName = accountType === 'cash' ? (accountName.trim() || 'Cash in Hand') : (accountName.trim() || 'My Account');
      const account = await accountRepository.create({
        name: finalAccountName,
        type: accountType,
        currency: selectedCurrencyCode,
        opening_balance: balance,
      });
      await setDefaultAccount(account.id);

      // 4. Finish
      await setOnboarded(true);
      await loadAppData();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('[Onboarding]', e);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const translateX = slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-40, 0, 40] });
  const opacity    = slideAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <ApniRakamLogo size="sm" layout="horizontal" />
            {step > 1 && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                <ThemedText style={[styles.backBtnText, { color: colors.textSecondary }]}>Back</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress segments — 4 steps */}
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressSegment,
                  { backgroundColor: s <= step ? colors.primary : colors.borderSubtle },
                ]}
              />
            ))}
          </View>

          {/* Animated step */}
          <Animated.View style={[styles.stepContent, { opacity, transform: [{ translateX }] }]}>
            {step === 1 && (
              <StepOverview colors={colors} isDark={isDark} />
            )}
            {step === 2 && (
              <StepName name={name} setName={setName} colors={colors} isDark={isDark} isKeyboardVisible={isKeyboardVisible} />
            )}
            {step === 3 && (
              <StepAccount
                accountName={accountName} setAccountName={setAccountName}
                accountType={accountType} setAccountType={setAccountType}
                openingBalance={openingBalance} setOpeningBalance={setOpeningBalance}
                colors={colors} isDark={isDark} isKeyboardVisible={isKeyboardVisible}
              />
            )}
            {step === 4 && (
              <StepCurrency
                selectedCurrencyCode={selectedCurrencyCode}
                setSelectedCurrencyCode={setSelectedCurrencyCode}
                colors={colors} isDark={isDark}
              />
            )}
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            {step < 4 ? (
              <ThemedButton
                title={step === 1 ? 'Get Started' : 'Continue'}
                variant="cta"
                size="lg"
                fullWidth
                onPress={step === 3 ? handleStepAccountContinue : goForward}
                iconRight={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
                style={styles.ctaButton}
              />
            ) : (
              <ThemedButton
                title={isSaving ? 'Setting up…' : 'Start Using ApniRakam'}
                variant="cta"
                size="lg"
                fullWidth
                onPress={handleFinishOnboarding}
                disabled={isSaving}
                iconRight={<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
                style={styles.ctaButton}
              />
            )}
            <ThemedText style={[styles.stepLabel, { color: colors.textTertiary }]}>
              Step {step} of 4
            </ThemedText>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Custom alert dialog */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
      />
    </View>
  );
}

// ─── Step 1: Overview (What this app does) ───────────────────────────────────

function StepOverview({ colors, isDark }: { colors: any; isDark: boolean }) {
  const features = [
    {
      icon: 'pie-chart-outline' as const,
      color: '#10B981',
      title: 'Track Daily Expenses & Income',
      desc: 'Log cash flow in seconds with smart categories, notes, and instant balance updates.',
    },
    {
      icon: 'wallet-outline' as const,
      color: '#0EA5E9',
      title: 'All Wallets & Accounts Together',
      desc: 'Manage bank accounts, mobile wallets (Easypaisa/JazzCash), and physical cash in one place.',
    },
    {
      icon: 'people-outline' as const,
      color: '#F59E0B',
      title: 'Smart Loan & Udhaar Manager',
      desc: 'Track money you lent or borrowed with due date reminders and partial payments.',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      color: '#8B5CF6',
      title: '100% Private & Fully Offline',
      desc: 'Your financial data is stored securely on your phone. No signups, no ads, no tracking.',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.illustrationRing}>
        <View style={styles.illustrationInner}>
          <Ionicons name="sparkles" size={44} color="#10B981" />
        </View>
      </View>

      <ThemedText variant="display" align="center" style={styles.mainTitle}>
        Take Control of{'\n'}Your Money
      </ThemedText>
      <ThemedText variant="subtitle" color="textSecondary" align="center" style={styles.mainSubtitle}>
        ApniRakam is your private companion to track spending, manage wallets, and organize debts effortlessly.
      </ThemedText>

      <View style={styles.featureList}>
        {features.map((f, i) => (
          <View
            key={i}
            style={[
              styles.featureCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                shadowColor: colors.cardShadow,
                shadowOpacity: isDark ? 0.25 : 0.04,
              },
            ]}
          >
            <View style={[styles.featureIconBox, { backgroundColor: f.color + '18' }]}>
              <Ionicons name={f.icon} size={22} color={f.color} />
            </View>
            <View style={styles.featureTextBox}>
              <ThemedText style={[styles.featureTitle, { color: colors.text }]}>
                {f.title}
              </ThemedText>
              <ThemedText style={[styles.featureDesc, { color: colors.textSecondary }]}>
                {f.desc}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Name ─────────────────────────────────────────────────────────────

function StepName({ name, setName, colors, isDark, isKeyboardVisible }: {
  name: string; setName: (v: string) => void; colors: any; isDark: boolean; isKeyboardVisible: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [isKeyboardVisible]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.scrollContent,
        isKeyboardVisible && { paddingBottom: 240 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.illustrationRing}>
        <View style={styles.illustrationInner}>
          <Ionicons name="person" size={44} color="#10B981" />
        </View>
      </View>
      <ThemedText variant="display" align="center" style={styles.mainTitle}>
        What should we{'\n'}call you?
      </ThemedText>
      <ThemedText variant="subtitle" color="textSecondary" align="center" style={styles.mainSubtitle}>
        We'll personalise the app experience just for you.
      </ThemedText>
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Your name (optional)"
          placeholderTextColor={colors.textTertiary}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          maxLength={40}
          onFocus={() => {
            setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 120);
          }}
        />
      </View>
    </ScrollView>
  );
}

// ─── Step 3: Account ──────────────────────────────────────────────────────────

function StepAccount({
  accountName, setAccountName, accountType, setAccountType,
  openingBalance, setOpeningBalance, colors, isDark, isKeyboardVisible,
}: {
  accountName: string; setAccountName: (v: string) => void;
  accountType: AccountType; setAccountType: (v: AccountType) => void;
  openingBalance: string; setOpeningBalance: (v: string) => void;
  colors: any; isDark: boolean; isKeyboardVisible: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [focusedField, setFocusedField] = useState<'name' | 'balance' | null>(null);

  useEffect(() => {
    if (isKeyboardVisible) {
      setTimeout(() => {
        if (focusedField === 'balance') {
          scrollRef.current?.scrollToEnd({ animated: true });
        } else if (focusedField === 'name') {
          scrollRef.current?.scrollTo({ y: 220, animated: true });
        }
      }, 150);
    }
  }, [isKeyboardVisible, focusedField]);

  const handleSelectType = (typeVal: AccountType) => {
    setAccountType(typeVal);
    if (typeVal === 'cash') {
      setAccountName('Cash in Hand');
    } else if (accountName === 'Cash in Hand') {
      setAccountName('');
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.scrollContent,
        isKeyboardVisible && { paddingBottom: 240 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.illustrationRing}>
        <View style={styles.illustrationInner}>
          <Ionicons name="wallet" size={44} color="#10B981" />
        </View>
      </View>
      <ThemedText variant="display" align="center" style={styles.mainTitle}>
        Add your first{'\n'}account
      </ThemedText>
      <ThemedText variant="subtitle" color="textSecondary" align="center" style={styles.mainSubtitle}>
        Set up an account to start tracking your money.
      </ThemedText>

      {/* Type Selector */}
      <View style={styles.typeGrid}>
        {ACCOUNT_TYPES.map((t) => {
          const isSelected = accountType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.typeCard,
                { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.borderSubtle },
                isSelected && { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : colors.primaryLight },
              ]}
              onPress={() => handleSelectType(t.value as AccountType)}
              activeOpacity={0.75}
            >
              <Ionicons name={t.icon} size={22} color={isSelected ? colors.primary : colors.textSecondary} />
              <ThemedText style={[styles.typeLabel, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                {t.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Account Name - Auto-configured card for Cash in Hand, TextInput for other types */}
      {accountType === 'cash' ? (
        <View style={[styles.autoNamedCard, { backgroundColor: colors.surface, borderColor: isDark ? colors.borderSubtle : colors.primary + '35' }]}>
          <View style={[styles.autoNamedIconCircle, { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : colors.primaryLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.autoNamedTitle, { color: colors.text }]}>
              Account Name: Cash in Hand
            </ThemedText>
            <ThemedText style={[styles.autoNamedSub, { color: colors.textSecondary }]}>
              Physical cash wallet configured automatically
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="create-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder={
              accountType === 'bank'
                ? 'Account name (e.g. Meezan Bank, HBL)'
                : accountType === 'wallet'
                ? 'Wallet name (e.g. Easypaisa, Sadapay)'
                : 'Account name (e.g. Credit Card)'
            }
            placeholderTextColor={colors.textTertiary}
            value={accountName === 'Cash in Hand' ? '' : accountName}
            onChangeText={setAccountName}
            returnKeyType="next"
            maxLength={40}
            onFocus={() => {
              setFocusedField('name');
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 220, animated: true });
              }, 120);
            }}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      )}

      {/* Opening Balance */}
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, marginTop: Spacing.sm }]}>
        <Ionicons name="cash-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Opening balance (optional, e.g. 5000)"
          placeholderTextColor={colors.textTertiary}
          value={openingBalance}
          onChangeText={setOpeningBalance}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={15}
          onFocus={() => {
            setFocusedField('balance');
            setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 120);
          }}
          onBlur={() => setFocusedField(null)}
        />
      </View>
    </ScrollView>
  );
}

// ─── Step 4: Currency ─────────────────────────────────────────────────────────

function StepCurrency({ selectedCurrencyCode, setSelectedCurrencyCode, colors, isDark }: {
  selectedCurrencyCode: string; setSelectedCurrencyCode: (v: string) => void; colors: any; isDark: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.illustrationRing}>
        <View style={styles.illustrationInner}>
          <Ionicons name="globe" size={44} color="#10B981" />
        </View>
      </View>
      <ThemedText variant="display" align="center" style={styles.mainTitle}>
        Choose your{'\n'}currency
      </ThemedText>
      <ThemedText variant="subtitle" color="textSecondary" align="center" style={styles.mainSubtitle}>
        This sets the default symbol shown throughout the app.
      </ThemedText>
      <View style={styles.currencyGrid}>
        {CURRENCY_LIST.map((cur) => {
          const isSelected = cur.code === selectedCurrencyCode;
          return (
            <TouchableOpacity
              key={cur.code}
              style={[
                styles.currencyCard,
                { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.borderSubtle },
                isSelected && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedCurrencyCode(cur.code)}
              activeOpacity={0.75}
            >
              <ThemedText style={[styles.currencySymbol, { color: colors.textSecondary }, isSelected && { color: colors.primary }]}>
                {cur.symbol}
              </ThemedText>
              <ThemedText style={[styles.currencyCode, { color: colors.text }, isSelected && { fontWeight: '800' }]}>
                {cur.code}
              </ThemedText>
              <ThemedText style={[styles.currencyName, { color: colors.textSecondary }]} numberOfLines={1}>
                {cur.name}
              </ThemedText>
              {isSelected && (
                <View style={[styles.selectedCheckmark, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backBtnText: { fontSize: 14, fontWeight: '500' },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  stepContent: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: Spacing.lg },

  illustrationRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16,185,129,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.18)',
    marginTop: Spacing.md,
  },
  illustrationInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainTitle: { marginBottom: Spacing.md, fontWeight: '800', lineHeight: 40 },
  mainSubtitle: { lineHeight: 22, maxWidth: 290, marginBottom: Spacing['2xl'] },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    minHeight: 56,
    paddingVertical: Spacing.xs,
    width: '100%',
  },
  inputIcon: { marginRight: Spacing.sm },
  textInput: { flex: 1, fontSize: 16, fontWeight: '500' },

  autoNamedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    width: '100%',
  },
  autoNamedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoNamedTitle: { fontSize: 15, fontWeight: '700' },
  autoNamedSub: { fontSize: 12, marginTop: 2 },



  typeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  typeCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  typeLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
    justifyContent: 'center',
  },
  currencyCard: {
    width: '30%',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
    position: 'relative',
  },
  currencySymbol: { fontSize: 18, fontWeight: '800' },
  currencyCode: { fontSize: 13, fontWeight: '700' },
  currencyName: { fontSize: 9, fontWeight: '500', textAlign: 'center' },
  selectedCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureList: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.md,
    width: '100%',
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextBox: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  footer: {
    paddingBottom: Spacing.base,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  ctaButton: { borderRadius: Radius.xl },
  stepLabel: { textAlign: 'center', fontSize: 12, fontWeight: '500' },
});
