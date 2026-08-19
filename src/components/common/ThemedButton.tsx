import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, Typography, Shadows } from '@/constants/theme';
import { ButtonVariant, ButtonSize } from '@/types/theme';
import ThemedText from './ThemedText';

export interface ThemedButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
}: ThemedButtonProps) {
  const { colors, isDark } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let bg = colors.primary;
    let border = 'transparent';
    let borderWidth = 0;

    switch (variant) {
      case 'secondary':
        bg = colors.primaryLight;
        break;
      case 'outline':
        bg = 'transparent';
        border = colors.primary;
        borderWidth = 1.5;
        break;
      case 'ghost':
        bg = 'transparent';
        break;
      case 'income':
        bg = colors.income;
        break;
      case 'expense':
        bg = colors.expense;
        break;
      case 'cta':
        bg = colors.primary;
        break;
      case 'primary':
      default:
        bg = colors.primary;
        break;
    }

    let height: number = 48;
    let paddingH: number = Spacing.lg;
    let borderRadius: number = Radius.lg;

    if (size === 'sm') {
      height = 38;
      paddingH = Spacing.md;
      borderRadius = Radius.md;
    } else if (size === 'lg') {
      height = 56;
      paddingH = Spacing['2xl'];
      borderRadius = Radius.xl;
    }

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth,
      height,
      paddingHorizontal: paddingH,
      borderRadius,
      alignSelf: fullWidth ? 'stretch' : 'auto',
      ...(variant === 'cta' ? Shadows.md : {}),
    };
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.primary;
      case 'outline':
      case 'ghost':
        return colors.primary;
      case 'income':
        return colors.incomeForeground;
      case 'expense':
        return colors.expenseForeground;
      case 'primary':
      case 'cta':
      default:
        return colors.primaryForeground;
    }
  };

  const getTypographyVariant = () => {
    if (size === 'sm') return 'captionBold' as const;
    if (size === 'lg') return 'title3' as const;
    return 'bodyBold' as const;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        getContainerStyle(),
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <ThemedText
            variant={getTypographyVariant()}
            style={[{ color: getTextColor() }, textStyle]}
          >
            {title}
          </ThemedText>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ThemedButton;
