import ThemedText from '@/components/common/ThemedText';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

export interface ApniRakamLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'splash';
  layout?: 'horizontal' | 'vertical' | 'iconOnly';
  showTagline?: boolean;
  style?: ViewStyle;
}

export function ApniRakamLogo({
  size = 'md',
  layout = 'horizontal',
  showTagline = false,
  style,
}: ApniRakamLogoProps) {
  const { colors } = useTheme();

  let iconSize: number = 44;
  let textSize: 'title3' | 'title2' | 'title1' | 'display' = 'title2';
  let taglineSize: 'caption' | 'subtitle' = 'caption';
  let badgeRadius: number = Radius.lg;

  if (size === 'sm') {
    iconSize = 36;
    textSize = 'title3';
    badgeRadius = Radius.md;
  } else if (size === 'lg') {
    iconSize = 64;
    textSize = 'title1';
    badgeRadius = Radius.xl;
  } else if (size === 'splash') {
    iconSize = 100;
    textSize = 'display';
    taglineSize = 'subtitle';
    badgeRadius = 24;
  }

  const renderIcon = () => (
    <View style={[styles.iconWrapper, size === 'splash' && styles.splashIconWrapper]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: badgeRadius,
        }}
        resizeMode="contain"
      />
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  splashIconWrapper: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
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
  tagline: {
    marginTop: Spacing.xs,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});

export default ApniRakamLogo;
