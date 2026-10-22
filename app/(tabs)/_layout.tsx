import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/navigation/CustomTabBar';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: 'Activity',
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: 'Budgets',
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>
    </View>
  );
}
