import React from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import ApniRakamLogo from '@/components/logo/ApniRakamLogo';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setOnboarded } = useAppStore();

  const handleFinishOnboarding = () => {
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <ApniRakamLogo size="sm" layout="horizontal" showUrdu={false} />
          <ThemedButton
            title="Skip"
            variant="ghost"
            size="sm"
            onPress={handleFinishOnboarding}
            textStyle={{ color: colors.textSecondary }}
          />
        </View>

        {/* Center Illuminated Illustration Graphic */}
        <View style={styles.centerSection}>
          <View style={styles.outerGlowRing}>
            <View style={styles.innerGraphicCircle}>
              <View style={styles.cardGraphic}>
                <View style={styles.cardGraphicHeader}>
                  <View style={styles.chipGraphic} />
                  <Ionicons name="wifi-outline" size={16} color="#064E3B" />
                </View>
                <ThemedText style={styles.cardGraphicText}>PKR</ThemedText>
                <ThemedText style={styles.cardGraphicSub}>Apni Rakam</ThemedText>
              </View>
            </View>
          </View>

          {/* Main Headline */}
          <ThemedText variant="display" align="center" style={styles.mainTitle}>
            Track Every Rupee
          </ThemedText>
          <ThemedText
            variant="subtitle"
            color="textSecondary"
            align="center"
            style={styles.mainSubtitle}
          >
            Simple, fast, and secure personal finance tracking tailored for you.
          </ThemedText>
        </View>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <ThemedButton
            title="Get Started"
            variant="cta"
            size="lg"
            fullWidth
            onPress={handleFinishOnboarding}
            iconRight={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            style={styles.getStartedButton}
          />
        </View>
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
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  outerGlowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
  },
  innerGraphicCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGraphic: {
    width: 120,
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: Spacing.sm,
    justifyContent: 'space-between',
  },
  cardGraphicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipGraphic: {
    width: 16,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  cardGraphicText: {
    color: '#064E3B',
    fontWeight: '800',
    fontSize: 14,
  },
  cardGraphicSub: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 10,
  },
  mainTitle: {
    color: '#FFFFFF',
    marginBottom: Spacing.md,
    fontWeight: '800',
  },
  mainSubtitle: {
    color: '#94A3B8',
    lineHeight: 22,
    maxWidth: 290,
  },
  footer: {
    paddingBottom: Spacing.base,
  },
  getStartedButton: {
    backgroundColor: '#10B981',
    borderRadius: Radius.xl,
  },
});
