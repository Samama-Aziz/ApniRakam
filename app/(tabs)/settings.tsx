import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { SUPPORTED_CURRENCIES } from '@/services/currency';
import { getCategoryMeta } from '@/utils/categoryMeta';
import { restoreDefaults } from '@/database';
import CustomAlert, { type AlertButton } from '@/components/common/CustomAlert';

const CURRENCY_LIST = Object.values(SUPPORTED_CURRENCIES);
const BUDGET_PERIODS: { key: 'monthly' | 'weekly' | 'custom'; label: string; icon: string }[] = [
  { key: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
  { key: 'weekly',  label: 'Weekly',  icon: 'today-outline' },
  { key: 'custom',  label: 'Custom',  icon: 'options-outline' },
];
const THEME_OPTIONS: { key: 'system' | 'light' | 'dark'; label: string; icon: string }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light',  label: 'Light',  icon: 'sunny-outline' },
  { key: 'dark',   label: 'Dark',   icon: 'moon-outline' },
];

// ─── "Others always last" sort helper ────────────────────────────────────────
function sortCategoriesOthersLast<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aOther = a.name.toLowerCase().includes('other');
    const bOther = b.name.toLowerCase().includes('other');
    if (aOther && !bOther) return 1;
    if (!aOther && bOther) return -1;
    return 0;
  });
}

// ── Components ────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors }: { title: string; subtitle?: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{title}</ThemedText>
      {subtitle && <ThemedText style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</ThemedText>}
    </View>
  );
}

function SettingRow({
  icon, iconColor, label, value, valueColor, onPress, last, colors, right,
}: {
  icon: string; iconColor?: string; label: string; value?: string; valueColor?: string;
  onPress?: () => void; last?: boolean; colors: any; right?: React.ReactNode;
}) {
  const effectiveIconColor = iconColor ?? colors.primary;
  return (
    <TouchableOpacity
      style={[styles.settingRow, last && styles.settingRowLast, { borderBottomColor: colors.borderSubtle }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconBox, { backgroundColor: effectiveIconColor + '22' }]}>
        <Ionicons name={icon as any} size={18} color={effectiveIconColor} />
      </View>
      <ThemedText style={[styles.settingLabel, { color: colors.text }]}>{label}</ThemedText>
      <View style={styles.settingRight}>
        {value ? <ThemedText style={[styles.settingValue, { color: valueColor ?? colors.textMuted }]}>{value}</ThemedText> : null}
        {right ?? null}
        {onPress && !right && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();

  const {
    userName, currency, currencySymbol,
    defaultCategoryId, defaultAccountId, defaultBudgetPeriod, themeMode,
    categories, accounts,
    setUserName, setCurrency, setDefaultCategory, setDefaultAccount,
    setDefaultBudgetPeriod, setThemeMode, loadAppData,
  } = useAppStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  // Custom alert dialog state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'default' | 'destructive' | 'warning' | 'info' | 'success';
    buttons?: AlertButton[];
  }>({ visible: false, title: '' });

  // Sort categories: "Other/Others" always last
  const sortedCategories = useMemo(() => sortCategoriesOthersLast(categories), [categories]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed) await setUserName(trimmed);
    setEditingName(false);
  };

  const handleRestoreDefaultCategories = () => {
    setAlertConfig({
      visible: true,
      title: 'Restore Default Categories',
      message: 'This will restore all built-in categories. Your custom categories, transactions, and accounts will not be affected.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            try {
              await restoreDefaults();
              await loadAppData();
              setAlertConfig({
                visible: true,
                title: 'Categories Restored',
                message: 'Default categories have been successfully restored.',
                type: 'success',
                buttons: [{ text: 'OK' }],
              });
            } catch (err) {
              console.error('Failed to restore categories:', err);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Could not restore default categories. Please try again.',
                type: 'destructive',
                buttons: [{ text: 'OK' }],
              });
            }
          },
        },
      ],
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const bg = colors.background;
  const surface = colors.surface;
  const border = colors.borderSubtle;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Settings</ThemedText>
          </View>

          {/* ── Profile Card ── */}
          <View style={[styles.profileCard, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.35 : 0.05 }]}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <View style={styles.nameInputRow}>
                  <TextInput
                    style={[styles.nameInput, { color: colors.text, borderBottomColor: colors.primary }]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    maxLength={40}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Your name"
                  />
                  <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setNameInput(userName); setEditingName(true); }} style={styles.nameRow}>
                  <ThemedText style={[styles.profileName, { color: colors.text }]}>{userName || 'Add your name'}</ThemedText>
                  <Ionicons name="pencil-outline" size={14} color={colors.textMuted} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
              <ThemedText style={[styles.profileSub, { color: colors.textMuted }]}>ApniRakam User · {currency} {currencySymbol}</ThemedText>
            </View>
          </View>

          {/* ── Theme ── */}
          <SectionHeader title="Appearance" subtitle="Light or dark — your choice" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            <View style={styles.segmentRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.segment, active && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => setThemeMode(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={opt.icon as any} size={18} color={active ? colors.primary : colors.textMuted} />
                    <ThemedText style={[styles.segmentLabel, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '500' }]}>
                      {opt.label}
                    </ThemedText>
                    {active && <View style={[styles.segmentDot, { backgroundColor: colors.primary }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Currency ── */}
          <SectionHeader title="Currency" subtitle="Used across the whole app" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            <View style={styles.currencyGrid}>
              {CURRENCY_LIST.map((cur) => {
                const isSelected = cur.code === currency;
                return (
                  <TouchableOpacity
                    key={cur.code}
                    style={[styles.currencyPill, { backgroundColor: colors.backgroundSecondary, borderColor: isSelected ? colors.primary : border },
                      isSelected && { backgroundColor: colors.primaryLight }]}
                    onPress={() => setCurrency(cur.code, cur.symbol)}
                    activeOpacity={0.75}
                  >
                    <ThemedText style={[styles.currencyPillSymbol, { color: isSelected ? colors.primary : colors.textMuted }]}>{cur.symbol}</ThemedText>
                    <ThemedText style={[styles.currencyPillCode, { color: isSelected ? colors.text : colors.textSecondary }]}>{cur.code}</ThemedText>
                    {isSelected && <View style={[styles.currencyCheck, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={10} color="#FFF" /></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Default Budget Period ── */}
          <SectionHeader title="Default Budget Period" subtitle="Used when creating a new budget" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            <View style={styles.segmentRow}>
              {BUDGET_PERIODS.map((p) => {
                const active = defaultBudgetPeriod === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.segment, active && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => setDefaultBudgetPeriod(p.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={p.icon as any} size={18} color={active ? colors.primary : colors.textMuted} />
                    <ThemedText style={[styles.segmentLabel, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? '700' : '500' }]}>
                      {p.label}
                    </ThemedText>
                    {active && <View style={[styles.segmentDot, { backgroundColor: colors.primary }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Pre-selected Category ── */}
          <SectionHeader title="Pre-selected Category" subtitle="Auto-selected when adding a transaction" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            {sortedCategories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag-outline" size={32} color={colors.textMuted} />
                <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No categories found</ThemedText>
              </View>
            ) : (
              <View style={styles.defaultsList}>
                <TouchableOpacity
                  style={[styles.defaultItem, !defaultCategoryId && { backgroundColor: colors.primary + '0A' }]}
                  onPress={() => setDefaultCategory('')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.defaultItemIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={colors.textMuted} />
                  </View>
                  <ThemedText style={[styles.defaultItemLabel, { color: colors.text }]}>None</ThemedText>
                  {!defaultCategoryId && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.defaultCheck} />}
                </TouchableOpacity>
                {sortedCategories.map((cat) => {
                  const meta = getCategoryMeta(cat.id, sortedCategories);
                  const isSelected = defaultCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.defaultItem, isSelected && { backgroundColor: colors.primary + '0A' }]}
                      onPress={() => setDefaultCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.defaultItemIcon, { backgroundColor: meta.color + '20' }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <ThemedText style={[styles.defaultItemLabel, { color: colors.text }]}>{cat.name}</ThemedText>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.defaultCheck} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Pre-selected Account ── */}
          <SectionHeader title="Pre-selected Account" subtitle="Auto-selected when adding a transaction" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            {accounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
                <ThemedText style={[styles.emptyText, { color: colors.textMuted }]}>No accounts found</ThemedText>
              </View>
            ) : (
              <View style={styles.defaultsList}>
                <TouchableOpacity
                  style={[styles.defaultItem, !defaultAccountId && { backgroundColor: colors.primaryLight }]}
                  onPress={() => setDefaultAccount('')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.defaultItemIcon, { backgroundColor: colors.backgroundSecondary }]}>
                    <Ionicons name="remove-circle-outline" size={18} color={colors.textMuted} />
                  </View>
                  <ThemedText style={[styles.defaultItemLabel, { color: colors.text }]}>None</ThemedText>
                  {!defaultAccountId && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.defaultCheck} />}
                </TouchableOpacity>
                {accounts.map((acc) => {
                  const isSelected = defaultAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.defaultItem, isSelected && { backgroundColor: colors.primaryLight }]}
                      onPress={() => setDefaultAccount(acc.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.defaultItemIcon, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.defaultItemDetails}>
                        <ThemedText style={[styles.defaultItemLabel, { color: colors.text }]}>{acc.name}</ThemedText>
                        <ThemedText style={[styles.defaultItemSub, { color: colors.textMuted }]}>{acc.type}</ThemedText>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.defaultCheck} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Categories ── */}
          <SectionHeader title="Categories" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            <SettingRow
              icon="refresh-outline"
              iconColor={colors.primary}
              label="Restore Default Categories"
              colors={colors}
              onPress={handleRestoreDefaultCategories}
              last
            />
          </View>

          {/* ── App Info ── */}
          <SectionHeader title="App Info" colors={colors} />
          <View style={[styles.card, { backgroundColor: surface, borderColor: border, shadowColor: colors.cardShadow, shadowOpacity: isDark ? 0.25 : 0.05 }]}>
            <SettingRow icon="shield-checkmark-outline" iconColor={colors.primary} label="Data Privacy" value="100% Offline" colors={colors} />
            <SettingRow icon="lock-closed-outline" iconColor="#6366F1" label="Storage" value="Local SQLite" colors={colors} />
            <SettingRow icon="information-circle-outline" iconColor="#3B82F6" label="Version" value="1.0.0" colors={colors} last />
          </View>

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>

      {/* Custom alert dialog */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((c) => ({ ...c, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1 },
  safeArea:              { flex: 1 },
  scroll:                { paddingBottom: 120 },

  header:                { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle:           { fontSize: 24, fontWeight: '800' },

  profileCard:           { flexDirection: 'row', alignItems: 'center', borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing.lg, marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.md, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  avatarCircle:          { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  profileInfo:           { flex: 1 },
  nameRow:               { flexDirection: 'row', alignItems: 'center' },
  profileName:           { fontSize: 18, fontWeight: '700' },
  profileSub:            { fontSize: 12, marginTop: 2 },
  nameInputRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nameInput:             { flex: 1, fontSize: 16, fontWeight: '600', borderBottomWidth: 1.5, paddingVertical: 2 },
  saveBtn:               { padding: 4 },

  sectionHeader:         { paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  sectionTitle:          { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  sectionSubtitle:       { fontSize: 11, marginTop: 2 },

  card:                  { borderRadius: Radius['2xl'], borderWidth: 1, marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, overflow: 'hidden', shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },

  // Segment (theme + budget period)
  segmentRow:            { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  segment:               { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: 'transparent', gap: 4, position: 'relative' },
  segmentLabel:          { fontSize: 12, textAlign: 'center' },
  segmentDot:            { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },

  // Currency
  currencyGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  currencyPill:          { width: '30%', flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.sm, alignItems: 'center', gap: 1, position: 'relative' },
  currencyPillSymbol:    { fontSize: 15, fontWeight: '800' },
  currencyPillCode:      { fontSize: 11, fontWeight: '700' },
  currencyCheck:         { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // Defaults list
  defaultsList:          { paddingVertical: Spacing.xs },
  defaultItem:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: Spacing.md },
  defaultItemIcon:       { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  defaultItemLabel:      { flex: 1, fontSize: 14, fontWeight: '500' },
  defaultItemDetails:    { flex: 1 },
  defaultItemSub:        { fontSize: 11, textTransform: 'capitalize', marginTop: 1 },
  defaultCheck:          { marginLeft: 'auto' },

  // Setting row
  settingRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md, borderBottomWidth: 1 },
  settingRowLast:        { borderBottomWidth: 0 },
  settingIconBox:        { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  settingLabel:          { flex: 1, fontSize: 14, fontWeight: '500' },
  settingRight:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  settingValue:          { fontSize: 13 },

  emptyState:            { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  emptyText:             { fontSize: 13 },

  bottomPad:             { height: 20 },
});
