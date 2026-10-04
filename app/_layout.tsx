import React, { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';

// Immediately hide native splash screen so custom animated screen displays right away
SplashScreen.hideAsync().catch(() => {});

export default function RootLayout() {
  const { hydrateFromStorage, loadAppData } = useAppStore();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    let mounted = true;
    async function prepareApp() {
      try {
        // Load persisted prefs (onboarding state, name, currency, theme) first
        await hydrateFromStorage();

        // Then initialise the DB + load live data (native only)
        if (Platform.OS !== 'web') {
          const { initDatabase } = await import('@/database');
          await initDatabase();
          await loadAppData();
        }
      } catch (error) {
        console.error('[App] Startup failed:', error);
      } finally {
        if (mounted) SplashScreen.hideAsync().catch(() => {});
      }
    }
    void prepareApp();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-transaction"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </View>
  );
}
