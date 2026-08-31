import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    let mounted = true;
    async function prepareApp() {
      try {
        if (Platform.OS !== 'web') {
          const { initDatabase } = await import('@/database');
          await initDatabase();
        }
      } catch (error) {
        console.error('[Database] Initialization failed:', error);
      } finally {
        if (mounted) SplashScreen.hideAsync().catch(() => {});
      }
    }
    void prepareApp();
    return () => { mounted = false; };
  }, []);

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary,
      background: '#0B0F17',
      card: '#151D2A',
      text: '#FFFFFF',
      border: '#222F45',
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F17' },
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
    </ThemeProvider>
  );
}
