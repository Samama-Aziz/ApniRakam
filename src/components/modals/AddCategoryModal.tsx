import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { categoryRepository } from '@/database';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { useKeyboard } from '@/hooks/useKeyboard';
import { SELECTABLE_CATEGORY_ICONS, SELECTABLE_CATEGORY_COLORS, getCategoryMeta } from '@/utils/categoryMeta';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';
import type { CategoryRecord } from '@/database/repositories/types';

interface AddCategoryModalProps {
  visible: boolean;
  initialType?: 'expense' | 'income';
  onClose: () => void;
  onCategoryCreated?: (category: CategoryRecord) => void;
}

export function AddCategoryModal({
  visible,
  initialType = 'expense',
  onClose,
  onCategoryCreated,
}: AddCategoryModalProps) {
  const { colors, isDark } = useTheme();
  const { keyboardHeight } = useKeyboard();
  const { addCategoryToStore, loadAppData } = useAppStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('pricetag-outline');
  const [selectedColor, setSelectedColor] = useState<string>(initialType === 'income' ? '#10B981' : '#EF4444');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial type when opening
  React.useEffect(() => {
    if (visible) {
      setType(initialType);
      setSelectedColor(initialType === 'income' ? '#10B981' : '#EF4444');
    }
  }, [visible, initialType]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  const resetForm = () => {
    setName('');
    setType(initialType);
    setSelectedIcon('pricetag-outline');
    setSelectedColor(initialType === 'income' ? '#10B981' : '#EF4444');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Category Name Required',
        message: 'Please enter a name for the category (e.g. Gym, Freelance, Subscriptions).',
        buttons: [{ text: 'OK' }],
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const newCategory = await categoryRepository.create({
        name: name.trim(),
        type,
        icon: selectedIcon,
        color: selectedColor,
        is_default: 0,
      });

      addCategoryToStore(newCategory);
      await loadAppData();

      if (onCategoryCreated) {
        onCategoryCreated(newCategory);
      }

      handleClose();
    } catch (error) {
      console.error('Failed to create category:', error);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'A category with this name might already exist for this type, or database error occurred.',
        type: 'destructive',
        buttons: [{ text: 'OK' }],
      });
      setIsSubmitting(false);
    }
  };

  const previewMeta = getCategoryMeta(name || 'Preview');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={[styles.overlay, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              shadowColor: colors.cardShadow,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.35 : 0.08,
              shadowRadius: 16,
              elevation: 16,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <ThemedText variant="title3" style={[styles.title, { color: colors.text }]}>
                Add Category
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Create a custom expense or income category
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* Type Selector (Expense vs Income) */}
            <View
              style={[
                styles.toggleContainer,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  setType('expense');
                  if (selectedColor === '#10B981') setSelectedColor('#EF4444');
                }}
                style={[
                  styles.togglePill,
                  type === 'expense' && { backgroundColor: colors.expense },
                ]}
              >
                <Ionicons
                  name="arrow-up"
                  size={14}
                  color={type === 'expense' ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <ThemedText
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    type === 'expense' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  Expense Category
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setType('income');
                  if (selectedColor === '#EF4444') setSelectedColor('#10B981');
                }}
                style={[
                  styles.togglePill,
                  type === 'income' && { backgroundColor: colors.income },
                ]}
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={type === 'income' ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <ThemedText
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    type === 'income' && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  Income Category
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Category Name */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                CATEGORY NAME
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.previewIconCircle, { backgroundColor: selectedColor + '25' }]}>
                  <Ionicons name={selectedIcon} size={20} color={selectedColor} />
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Subscriptions, Gifts, Investment"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.textInput, { color: colors.text }]}
                  autoFocus={true}
                />
              </View>
            </View>

            {/* Select Color */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                CATEGORY COLOR
              </ThemedText>
              <View style={styles.colorPalette}>
                {SELECTABLE_CATEGORY_COLORS.map((colorItem) => {
                  const isSelected = selectedColor.toLowerCase() === colorItem.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={colorItem}
                      onPress={() => setSelectedColor(colorItem)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: colorItem },
                        isSelected && [
                          styles.colorCircleSelected,
                          { borderColor: isDark ? '#FFFFFF' : '#0F172A', shadowColor: colorItem },
                        ],
                      ]}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Select Icon */}
            <View style={styles.fieldGroup}>
              <ThemedText variant="label" style={[styles.label, { color: colors.textSecondary }]}>
                SELECT ICON
              </ThemedText>
              <View style={styles.iconGrid}>
                {SELECTABLE_CATEGORY_ICONS.map((item) => {
                  const isSelected = selectedIcon === item.icon;
                  return (
                    <TouchableOpacity
                      key={item.icon}
                      onPress={() => setSelectedIcon(item.icon)}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        },
                        isSelected && {
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primaryLight,
                          borderWidth: 1.5,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.iconLabel,
                          { color: colors.textSecondary },
                          isSelected && { color: colors.text, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <ThemedButton
              title="Cancel"
              variant="ghost"
              onPress={handleClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <ThemedButton
              title={isSubmitting ? 'Creating…' : 'Create Category'}
              variant="cta"
              onPress={handleCreate}
              disabled={isSubmitting}
              style={{
                flex: 2,
                backgroundColor: type === 'income' ? colors.income : colors.expense,
              }}
            />
          </View>

          {/* Custom alert within modal presentation */}
          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            buttons={alertConfig.buttons}
            onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
            isInsideModal={true}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  togglePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  toggleExpenseActive: {},
  toggleIncomeActive: {},
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.xs + 2,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  previewIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: Spacing.md,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    transform: [{ scale: 1.1 }],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: '23%',
    aspectRatio: 1.1,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  iconOptionSelected: {},
  iconLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  iconLabelSelected: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});

export default AddCategoryModal;
