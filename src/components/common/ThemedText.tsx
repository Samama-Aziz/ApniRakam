import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography } from '@/constants/theme';
import { TypographyVariant, ThemeColors } from '@/types/theme';

export interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: keyof ThemeColors | string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function ThemedText({
  children,
  style,
  variant = 'body',
  color,
  align,
  ...rest
}: ThemedTextProps) {
  const { colors } = useTheme();

  // Resolve color
  let resolvedColor = colors.text;
  if (color) {
    if (color in colors) {
      resolvedColor = colors[color as keyof ThemeColors];
    } else {
      resolvedColor = color;
    }
  }

  const typographyStyle = Typography[variant] || Typography.body;

  return (
    <Text
      style={[
        typographyStyle,
        { color: resolvedColor },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default ThemedText;
