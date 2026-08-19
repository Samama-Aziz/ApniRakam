import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';

export interface ApniRakamLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'splash';
  layout?: 'horizontal' | 'vertical' | 'iconOnly';
  showTagline?: boolean;
  showUrdu?: boolean;
  style?: ViewStyle;
}

export function ApniRakamLogo({
  size = 'md',
  layout = 'horizontal',
  showTagline = false,
  showUrdu = true,
  style,
}: ApniRakamLogoProps) {
  const { colors, isDark } = useTheme();

  let iconSize: number = 44;
  let textSize: 'title3' | 'title2' | 'title1' | 'display' = 'title2';
  let taglineSize: 'caption' | 'subtitle' = 'caption';
  let urduSize: number = 13;
  let badgeRadius: number = Radius.lg;

  if (size === 'sm') {
    iconSize = 34;
    textSize = 'title3';
    urduSize = 11;
    badgeRadius = Radius.md;
  } else if (size === 'lg') {
    iconSize = 58;
    textSize = 'title1';
    urduSize = 16;
    badgeRadius = Radius.xl;
  } else if (size === 'splash') {
    iconSize = 88;
    textSize = 'display';
    taglineSize = 'subtitle';
    urduSize = 22;
    badgeRadius = Radius['2xl'];
  }

  const renderIcon = () => (
    <View
      style={[
        styles.iconWrapper,
        {
          width: iconSize,
          height: iconSize,
          borderRadius: badgeRadius,
          backgroundColor: '#FFFFFF',
        },
      ]}
    >
      <View
        style={[
          styles.emblemBadge,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: badgeRadius,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.emblemText,
            {
              fontSize: iconSize * 0.42,
              color: '#064E3B',
            },
          ]}
        >
          AR
        </ThemedText>
      </View>
    </View>
  );

  if (layout === 'iconOnly') {
    return <View style={style}>{renderIcon()}</View>;
  }

  return (
    <View
      style={[
        layout === 'vertical' ? styles.containerVertical : styles.containerHorizontal,
        style,
      ]}
    >
      {renderIcon()}

      <View
        style={[
          layout === 'vertical' ? styles.textContainerVertical : styles.textContainerHorizontal,
        ]}
      >
        <View style={styles.brandRow}>
          <ThemedText variant={textSize} style={[styles.brandText, { color: '#FFFFFF' }]}>
            Apni
          </ThemedText>
          <ThemedText
            variant={textSize}
            style={[styles.brandText, { color: colors.primary, marginLeft: 4 }]}
          >
            Rakam
          </ThemedText>
        </View>

        {showUrdu && (
          <ThemedText
            style={[
              styles.urduText,
              {
                fontSize: urduSize,
                color: '#34D399',
              },
            ]}
          >
            اپنی رقم
          </ThemedText>
        )}

        {showTagline && (
          <ThemedText
            variant={taglineSize}
            style={[styles.tagline, { color: colors.textSecondary }]}
          >
            Smart Financial Management
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  containerVertical: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemBadge: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemText: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  textContainerHorizontal: {
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  textContainerVertical: {
    marginTop: Spacing.base,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  urduText: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  tagline: {
    marginTop: Spacing.xs,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default ApniRakamLogo;
