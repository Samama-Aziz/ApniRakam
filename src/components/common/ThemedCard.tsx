import React from 'react';
import { View, ViewProps, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, Shadows } from '@/constants/theme';
import { CardVariant } from '@/types/theme';

export interface ThemedCardProps extends ViewProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children?: React.ReactNode;
}

export function ThemedCard({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  onPress,
  ...rest
}: ThemedCardProps) {
  const { colors, isDark } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return Spacing.sm;
      case 'lg':
        return Spacing.xl;
      case 'md':
      default:
        return Spacing.base;
    }
  };

  const getCardStyle = (): ViewStyle => {
    switch (variant) {
      case 'balanceHero':
        return {
          backgroundColor: isDark ? colors.surfaceElevated : colors.primary,
          borderRadius: Radius['2xl'],
          borderWidth: 1,
          borderColor: isDark ? colors.border : 'rgba(255, 255, 255, 0.15)',
          ...Shadows.lg,
        };
      case 'flat':
        return {
          backgroundColor: colors.surfaceMuted,
          borderRadius: Radius.lg,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: colors.surface,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'stat':
        return {
          backgroundColor: colors.surface,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          ...Shadows.sm,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.surface,
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          ...Shadows.md,
        };
    }
  };

  const combinedStyle: ViewStyle[] = [
    styles.card,
    getCardStyle(),
    { padding: getPadding() },
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          combinedStyle,
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={combinedStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default ThemedCard;
