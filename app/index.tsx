import ThemedText from '@/components/common/ThemedText';
import ApniRakamLogo from '@/components/logo/ApniRakamLogo';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const router = useRouter();
  const { isOnboarded } = useAppStore();

  // Unified dark emerald green background matching native splash screen
  const splashBg = '#042F1E';
  const badgeBg = 'rgba(255, 255, 255, 0.12)';
  const badgeBorder = 'rgba(255, 255, 255, 0.20)';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [isOnboarded, router]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: splashBg,
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={splashBg}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Main ApniRakam Logo */}
          <ApniRakamLogo
            size="splash"
            layout="vertical"
            showTagline={false}
          />

          {/* Privacy Badge */}
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.pillBadge,
                {
                  backgroundColor: badgeBg,
                  borderColor: badgeBorder,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.badgeText,
                  {
                    color: '#34D399',
                  },
                ]}
              >
                OWN YOUR DATA • 100% OFFLINE
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Branding */}
        <View style={styles.bottomBrand}>
          <ThemedText
            style={[
              styles.poweredText,
              {
                color: 'rgba(255, 255, 255, 0.65)',
              },
            ]}
          >
            POWERED BY
          </ThemedText>

          <ThemedText
            style={[
              styles.flowPathText,
              {
                color: '#FFFFFF',
              },
            ]}
          >
            FlowPath
          </ThemedText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeContainer: {
    marginTop: 30,
    alignItems: 'center',
  },

  pillBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  bottomBrand: {
    position: 'absolute',
    bottom: 18,
    alignItems: 'center',
  },

  poweredText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 2,
  },

  flowPathText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});