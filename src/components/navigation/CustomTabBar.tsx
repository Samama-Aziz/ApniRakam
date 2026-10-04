import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';

// Tab bar: Home + Budgets on left, Reports + Settings on right, FAB centre.
// Activity (transactions) is accessible via "See All" on the home screen.
const TAB_CONFIG: Record<
  string,
  {
    label: string;
    iconFocused: string;
    iconDefault: string;
  }
> = {
  index:    { label: 'Home',     iconFocused: 'grid',      iconDefault: 'grid-outline'      },
  budgets:  { label: 'Budgets',  iconFocused: 'wallet',    iconDefault: 'wallet-outline'    },
  reports:  { label: 'Reports',  iconFocused: 'bar-chart', iconDefault: 'bar-chart-outline' },
  settings: { label: 'Settings', iconFocused: 'settings',  iconDefault: 'settings-outline'  },
};

// The ordered visible tab names (must match TAB_CONFIG keys & route names)
const LEFT_TABS  = ['index', 'budgets'];
const RIGHT_TABS = ['reports', 'settings'];

export function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleOpenAddModal = () => {
    router.push('/add-transaction');
  };

  const bottomPadding = insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10;

  // Build a name→routeIndex map for the current state
  const routeIndexByName: Record<string, number> = {};
  state.routes.forEach((r: any, i: number) => {
    routeIndexByName[r.name] = i;
  });

  const renderTabItem = (routeName: string) => {
    const cfg = TAB_CONFIG[routeName];
    if (!cfg) return null;

    const routeIndex = routeIndexByName[routeName];
    if (routeIndex === undefined) return null;

    const route = state.routes[routeIndex];
    const isFocused = state.index === routeIndex;
    const color = isFocused ? colors.primary : colors.textMuted;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    };

    return (
      <TouchableOpacity
        key={routeName}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrapper}>
          <Ionicons
            name={(isFocused ? cfg.iconFocused : cfg.iconDefault) as any}
            size={22}
            color={color}
          />
        </View>
        <ThemedText
          style={[styles.tabLabel, { color, fontWeight: isFocused ? '700' : '500' }]}
        >
          {cfg.label}
        </ThemedText>
        {isFocused
          ? <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
          : <View style={styles.indicatorPlaceholder} />}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          shadowColor: colors.cardShadow,
          shadowOpacity: isDark ? 0.35 : 0.06,
          paddingBottom: bottomPadding,
          height: 60 + bottomPadding,
        },
      ]}
    >
      {/* Left Tabs: Home, Activity */}
      <View style={styles.tabGroup}>
        {LEFT_TABS.map(renderTabItem)}
      </View>

      {/* Center FAB */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          onPress={handleOpenAddModal}
          style={[
            styles.fabButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.surface,
              shadowColor: colors.primary,
            },
          ]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Right Tabs: Reports, Settings */}
      <View style={styles.tabGroup}>
        {RIGHT_TABS.map(renderTabItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    position: 'relative',
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
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
    minWidth: 52,
  },
  iconWrapper: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  indicatorPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 3,
  },
  fabWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    zIndex: 10,
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3.5,
  },
});

export default CustomTabBar;
