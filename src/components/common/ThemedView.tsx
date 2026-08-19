import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemeColors } from '@/types/theme';

export interface ThemedViewProps extends ViewProps {
  background?: keyof ThemeColors | string;
}

export function ThemedView({
  children,
  style,
  background = 'background',
  ...rest
}: ThemedViewProps) {
  const { colors } = useTheme();

  let resolvedBg = colors.background;
  if (background) {
    if (background in colors) {
      resolvedBg = colors[background as keyof ThemeColors];
    } else {
      resolvedBg = background;
    }
  }

  return (
    <View style={[{ backgroundColor: resolvedBg }, style]} {...rest}>
      {children}
    </View>
  );
}

export default ThemedView;
