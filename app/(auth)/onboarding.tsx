import React, { useState, useRef } from 'react';
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

const CURRENCY_LIST = Object.values(SUPPORTED_CURRENCIES);

const ACCOUNT_TYPES = [
  { value: 'cash',   label: 'Cash',   icon: 'cash-outline' as const },
  { value: 'bank',   label: 'Bank',   icon: 'business-outline' as const },
  { value: 'wallet', label: 'Wallet', icon: 'wallet-outline' as const },
  { value: 'credit', label: 'Credit', icon: 'card-outline' as const },
] as const;

type AccountType = 'cash' | 'bank' | 'wallet' | 'credit';

type Step = 1 | 2 | 3;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { setOnboarded, setUserName, setCurrency, setDefaultAccount, loadAppData } = useAppStore();

  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 – Name
  const [name, setName] = useState('');

  // Step 2 – Account
  const [accountName, setAccountName] = useState('');
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

  const handleStep2Continue = () => {
    if (!accountName.trim()) {
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
      const account = await accountRepository.create({
        name: accountName.trim() || 'My Account',
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

          {/* Progress segments — 3 steps */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
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
              <StepName name={name} setName={setName} colors={colors} isDark={isDark} />
            )}
            {step === 2 && (
              <StepAccount
                accountName={accountName} setAccountName={setAccountName}
                accountType={accountType} setAccountType={setAccountType}
                openingBalance={openingBalance} setOpeningBalance={setOpeningBalance}
                colors={colors} isDark={isDark}
              />
            )}
            {step === 3 && (
              <StepCurrency
                selectedCurrencyCode={selectedCurrencyCode}
                setSelectedCurrencyCode={setSelectedCurrencyCode}
                colors={colors} isDark={isDark}
              />
            )}
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            {step < 3 ? (
              <ThemedButton
                title="Continue"
                variant="cta"
                size="lg"
                fullWidth
                onPress={step === 1 ? goForward : handleStep2Continue}
                iconRight={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
                style={styles.ctaButton}
              />
            ) : (
              <ThemedButton
                title={isSaving ? 'Setting up…' : 'Get Started'}
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
              Step {step} of 3
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

// ─── Step 1: Name ─────────────────────────────────────────────────────────────

function StepName({ name, setName, colors, isDark }: {
  name: string; setName: (v: string) => void; colors: any; isDark: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        />
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Account ──────────────────────────────────────────────────────────

function StepAccount({
  accountName, setAccountName, accountType, setAccountType,
  openingBalance, setOpeningBalance, colors, isDark,
}: {
  accountName: string; setAccountName: (v: string) => void;
  accountType: AccountType; setAccountType: (v: AccountType) => void;
  openingBalance: string; setOpeningBalance: (v: string) => void;
  colors: any; isDark: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              onPress={() => setAccountType(t.value as AccountType)}
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

      {/* Account Name */}
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="create-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Account name (e.g. Cash in Hand)"
          placeholderTextColor={colors.textTertiary}
          value={accountName}
          onChangeText={setAccountName}
          returnKeyType="next"
          maxLength={40}
        />
      </View>

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
        />
      </View>
    </ScrollView>
  );
}

// ─── Step 3: Currency ─────────────────────────────────────────────────────────

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
    height: 56,
    width: '100%',
  },
  inputIcon: { marginRight: Spacing.sm },
  textInput: { flex: 1, fontSize: 16, fontWeight: '500' },

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
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeLabel: { fontSize: 11, fontWeight: '700' },

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

  footer: {
    paddingBottom: Spacing.base,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  ctaButton: { borderRadius: Radius.xl },
  stepLabel: { textAlign: 'center', fontSize: 12, fontWeight: '500' },
});
