import React from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from './ThemedText';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'destructive' | 'warning' | 'info' | 'success' | 'default';
  buttons?: AlertButton[];
  buttonLayout?: 'row' | 'column';
  onClose: () => void;
  /**
   * Set to true when rendering inside an existing Modal to avoid
   * nested Modal presentation limitations on iOS.
   */
  isInsideModal?: boolean;
}

export function CustomAlert({
  visible,
  title,
  message,
  type = 'default',
  buttons = [{ text: 'OK', style: 'default' }],
  buttonLayout,
  onClose,
  isInsideModal = false,
}: CustomAlertProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const getIconConfig = () => {
    switch (type) {
      case 'destructive':
        return {
          name: 'trash-outline' as const,
          color: colors.expense,
          bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        };
      case 'warning':
        return {
          name: 'alert-circle-outline' as const,
          color: '#F59E0B',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        };
      case 'success':
        return {
          name: 'checkmark-circle-outline' as const,
          color: colors.primary,
          bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primaryLight,
        };
      case 'info':
        return {
          name: 'information-circle-outline' as const,
          color: colors.primary,
          bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primaryLight,
        };
      default:
        return null;
    }
  };

  const iconConfig = getIconConfig();

  const handleButtonPress = async (btn: AlertButton) => {
    onClose();
    if (btn.onPress) {
      await btn.onPress();
    }
  };

  const isColumn = buttonLayout ? buttonLayout === 'column' : (buttons.length === 1 || buttons.length > 2);

  const content = (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.dialogCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            shadowColor: colors.cardShadow,
            shadowOpacity: isDark ? 0.45 : 0.12,
          },
        ]}
      >
        {/* Optional Icon Header */}
        {iconConfig && (
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name} size={26} color={iconConfig.color} />
          </View>
        )}

        {/* Title */}
        <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>

        {/* Description / Message */}
        {!!message && (
          <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </ThemedText>
        )}

        {/* Action Buttons */}
        <View style={[styles.buttonRow, isColumn && styles.buttonColumn]}>
          {buttons.map((btn, index) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';

            let btnBg = colors.primary;
            let textColor = '#FFFFFF';
            let borderWidth = 0;
            let borderColor = 'transparent';

            if (isDestructive) {
              btnBg = colors.expense;
              textColor = '#FFFFFF';
            } else if (isCancel) {
              btnBg = isDark ? colors.backgroundSecondary : colors.surfaceMuted;
              textColor = colors.text;
              borderWidth = 1;
              borderColor = colors.borderSubtle;
            } else {
              btnBg = colors.primary;
              textColor = '#FFFFFF';
            }

            return (
              <TouchableOpacity
                key={`${btn.text}-${index}`}
                onPress={() => handleButtonPress(btn)}
                style={[
                  styles.btn,
                  !isColumn && styles.btnFlex,
                  {
                    backgroundColor: btnBg,
                    borderWidth,
                    borderColor,
                  },
                ]}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.btnText, { color: textColor }]}>
                  {btn.text}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (isInsideModal) {
    return <View style={styles.absoluteContainer}>{content}</View>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  absoluteContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    elevation: 99999,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnFlex: {
    flex: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CustomAlert;
