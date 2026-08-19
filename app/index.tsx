import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import ApniRakamLogo from '@/components/logo/ApniRakamLogo';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { Spacing } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { isOnboarded } = useAppStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleProceed();
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  const handleProceed = () => {
    if (isOnboarded) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#042F1E" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Centered Brand Emblem */}
          <ApniRakamLogo size="splash" layout="vertical" showTagline={false} showUrdu={true} />

          <View style={styles.badgeContainer}>
            <View style={styles.pillBadge}>
              <ThemedText style={styles.badgeText}>
                OWN YOUR DATA • 100% OFFLINE
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <ThemedButton
            title="Get Started"
            variant="cta"
            size="lg"
            fullWidth
            onPress={handleProceed}
            style={styles.ctaButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#042F1E', // Figma deep forest emerald
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    marginTop: Spacing['3xl'],
    alignItems: 'center',
  },
  pillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footer: {
    paddingBottom: Spacing.base,
    width: '100%',
  },
  ctaButton: {
    backgroundColor: '#10B981',
  },
});
