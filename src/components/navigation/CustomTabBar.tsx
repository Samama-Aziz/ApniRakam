import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleOpenAddModal = () => {
    router.push('/add-transaction');
  };

  const getTabIcon = (routeName: string, focused: boolean, color: string) => {
    switch (routeName) {
      case 'index':
        return (
          <Ionicons
            name={focused ? 'grid' : 'grid-outline'}
            size={22}
            color={color}
          />
        );
      case 'transactions':
        return (
          <Ionicons
            name={focused ? 'receipt' : 'receipt-outline'}
            size={22}
            color={color}
          />
        );
      case 'budgets':
        return (
          <Ionicons
            name={focused ? 'wallet' : 'wallet-outline'}
            size={22}
            color={color}
          />
        );
      case 'reports':
        return (
          <Ionicons
            name={focused ? 'bar-chart' : 'bar-chart-outline'}
            size={22}
            color={color}
          />
        );
      default:
        return <Ionicons name="ellipse-outline" size={22} color={color} />;
    }
  };

  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Home';
      case 'transactions':
        return 'Activity';
      case 'budgets':
        return 'Budgets';
      case 'reports':
        return 'Reports';
      default:
        return routeName;
    }
  };

  // Split routes: first 2 on left, last 2 on right of FAB
  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2, 4);

  const renderTabItem = (route: typeof state.routes[0], index: number) => {
    const isFocused = state.index === index;
    const { options } = descriptors[route.key];
    const color = isFocused ? colors.primary : colors.textMuted;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={onPress}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        {getTabIcon(route.name, isFocused, color)}
        <ThemedText
          style={[
            styles.tabLabel,
            { color, fontWeight: isFocused ? '700' : '500' },
          ]}
        >
          {getTabLabel(route.name)}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: '#111827', // Figma dark tab bar
          borderTopColor: '#1E293B',
        },
      ]}
    >
      {/* Left Tabs */}
      <View style={styles.tabGroup}>
        {leftRoutes.map((route, i) => renderTabItem(route, i))}
      </View>

      {/* Center Floating Action Button (+) */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          onPress={handleOpenAddModal}
          style={[styles.fabButton, { backgroundColor: '#10B981' }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Right Tabs */}
      <View style={styles.tabGroup}>
        {rightRoutes.map((route, i) => renderTabItem(route, i + 2))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 6,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    position: 'relative',
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    minWidth: 56,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.1,
  },
  fabWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // Raised effect
    zIndex: 10,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3.5,
    borderColor: '#0B0F17', // Cutout effect matching background
  },
});

export default CustomTabBar;
