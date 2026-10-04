import React, { useState, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Radius } from '@/constants/theme';
import ThemedText from '@/components/common/ThemedText';
import ThemedButton from '@/components/common/ThemedButton';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/hooks/useTheme';
import { accountRepository, categoryRepository } from '@/database';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryMeta, ACCOUNT_TYPE_OPTIONS } from '@/utils/categoryMeta';
import { AddAccountModal } from './AddAccountModal';
import { AddCategoryModal } from './AddCategoryModal';
import { CustomAlert, AlertButton } from '@/components/common/CustomAlert';
import type { AccountRecord } from '@/database/repositories/types';

// ─── "Others always last" sort helper ─────────────────────────────────────────
function sortCategoriesOthersLast<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aOther = a.name.toLowerCase().includes('other');
    const bOther = b.name.toLowerCase().includes('other');
    if (aOther && !bOther) return 1;
    if (!aOther && bOther) return -1;
    return 0;
  });
}

interface ManageHubModalProps {
  visible: boolean;
  initialTab?: 'accounts' | 'categories';
  onClose: () => void;
}

// ─── Edit Account Sheet (inline bottom sheet) ─────────────────────────────────
interface EditAccountSheetProps {
  visible: boolean;
  account: AccountRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditAccountSheet({ visible, account, onClose, onSaved }: EditAccountSheetProps) {
  const { colors, isDark } = useTheme();
  const { updateAccountInStore, loadAppData } = useAppStore();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountRecord['type']>('bank');
  const [openingBalance, setOpeningBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'destructive' | 'warning' | 'info' | 'success' | 'default';
    buttons?: AlertButton[];
  } | null>(null);

  React.useEffect(() => {
    if (visible && account) {
      setName(account.name);
      setSelectedType(account.type as AccountRecord['type']);
      setOpeningBalance(account.opening_balance > 0 ? String(account.opening_balance) : '');
    }
  }, [visible, account]);

  const handleSave = async () => {
    if (!name.trim()) {
      setAlertConfig({
        visible: true,
        title: 'Name Required',
        message: 'Please enter a name for the account.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    if (!account) return;
    setSaving(true);
    try {
      const updated = await accountRepository.update(account.id, {
        name: name.trim(),
        type: selectedType,
        opening_balance: parseFloat(openingBalance.replace(/,/g, '')) || 0,
      });
      if (updated) {
        updateAccountInStore(updated);
        await loadAppData();
        onSaved();
      }
    } catch (e) {
      console.error('Failed to update account:', e);
      setAlertConfig({
        visible: true,
        title: 'Error',
        message: 'Could not update account.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={es.overlay}
      >
        <TouchableOpacity style={es.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            es.sheet,
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
          <View style={[es.handle, { backgroundColor: colors.border }]} />

          <View style={[es.header, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <ThemedText style={[es.title, { color: colors.text }]}>Edit Account</ThemedText>
              <ThemedText style={[es.subtitle, { color: colors.textSecondary }]}>
                Update account name, type or balance
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[es.closeBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary }]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={es.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Account Name */}
            <ThemedText style={[es.label, { color: colors.textSecondary }]}>ACCOUNT NAME</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Meezan Bank, Sadapay, Cash Wallet"
              placeholderTextColor={colors.textTertiary}
              style={[
                es.textInput,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                  borderColor: colors.borderSubtle,
                  color: colors.text,
                },
              ]}
              autoFocus
            />

            {/* Account Type */}
            <ThemedText style={[es.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              ACCOUNT TYPE
            </ThemedText>
            <View style={es.typeList}>
              {ACCOUNT_TYPE_OPTIONS.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    onPress={() => setSelectedType(item.type)}
                    style={[
                      es.typeCard,
                      {
                        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                      },
                      isSelected && {
                        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : colors.primaryLight,
                        borderWidth: 1.5,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        es.typeIconCircle,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5')
                            : (isDark ? colors.surface : colors.backgroundSecondary),
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[es.typeName, { color: colors.text }, isSelected && { fontWeight: '700' }]}
                      >
                        {item.label}
                      </ThemedText>
                      <ThemedText style={[es.typeDesc, { color: colors.textSecondary }]}>
                        {item.subtitle}
                      </ThemedText>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Opening Balance */}
            <ThemedText style={[es.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              OPENING / CURRENT BALANCE
            </ThemedText>
            <View
              style={[
                es.balanceRow,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceMuted,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <ThemedText style={[es.currencyBadge, { color: colors.primary }]}>PKR</ThemedText>
              <TextInput
                value={openingBalance}
                onChangeText={setOpeningBalance}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={[es.balanceInput, { color: colors.text }]}
              />
            </View>
            <ThemedText style={[es.helperText, { color: colors.textSecondary }]}>
              Note: changing opening balance affects total balance calculations.
            </ThemedText>
          </ScrollView>

          <View style={[es.footer, { borderTopColor: colors.borderSubtle }]}>
            <ThemedButton
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <ThemedButton
              title={saving ? 'Saving…' : 'Save Changes'}
              variant="cta"
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {alertConfig && (
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
          isInsideModal={true}
        />
      )}
    </Modal>
  );
}

// ─── Main ManageHub Modal ─────────────────────────────────────────────────────

export function ManageHubModal({ visible, initialTab = 'accounts', onClose }: ManageHubModalProps) {
  const { colors, isDark } = useTheme();
  const {
    accounts,
    categories,
    transactions,
    removeAccountFromStore,
    removeCategoryFromStore,
    loadAppData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'accounts' | 'categories'>(initialTab);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [showEditAccount, setShowEditAccount] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Compute balance per account
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach((acc) => {
      map[acc.id] = acc.opening_balance || 0;
    });

    transactions.forEach((tx) => {
      if (tx.deleted_at || !map[tx.account_id] !== undefined) return;
      if (tx.type === 'income') {
        map[tx.account_id] = (map[tx.account_id] || 0) + tx.amount;
      } else {
        map[tx.account_id] = (map[tx.account_id] || 0) - tx.amount;
      }
    });

    return map;
  }, [accounts, transactions]);

  // Filtered categories with "Others" always last
  const filteredCategories = useMemo(() => {
    const list =
      categoryTypeFilter === 'all'
        ? categories
        : categories.filter((c) => c.type === categoryTypeFilter);
    return sortCategoriesOthersLast(list);
  }, [categories, categoryTypeFilter]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'destructive' | 'warning' | 'info' | 'success' | 'default';
    buttons?: AlertButton[];
  } | null>(null);

  const handleDeleteAccount = (accId: string, accName: string) => {
    setAlertConfig({
      visible: true,
      title: 'Remove Account',
      message: `Are you sure you want to remove "${accName}"? Existing transactions will remain intact.`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountRepository.delete(accId);
              removeAccountFromStore(accId);
              await loadAppData();
            } catch (err) {
              console.error('Failed to remove account:', err);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Could not remove account.',
                type: 'warning',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            }
          },
        },
      ],
    });
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    setAlertConfig({
      visible: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete "${catName}"?`,
      type: 'destructive',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await categoryRepository.delete(catId);
              if (success) {
                removeCategoryFromStore(catId);
                await loadAppData();
              } else {
                setAlertConfig({
                  visible: true,
                  title: 'Cannot Delete',
                  message: 'Built-in categories cannot be deleted. You can restore them anytime from Settings.',
                  type: 'info',
                  buttons: [{ text: 'Got It', style: 'default' }],
                });
              }
            } catch (err) {
              console.error('Failed to delete category:', err);
              setAlertConfig({
                visible: true,
                title: 'Error',
                message: 'Could not delete category.',
                type: 'warning',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            }
          },
        },
      ],
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdropTap} activeOpacity={1} onPress={onClose} />
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
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <ThemedText variant="title3" style={[styles.title, { color: colors.text }]}>
                  Manage Accounts & Categories
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Customize payment accounts and tags
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={[styles.tabBar, { borderBottomColor: colors.borderSubtle }]}>
              <TouchableOpacity
                onPress={() => setActiveTab('accounts')}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                    borderColor: activeTab === 'accounts' ? colors.primary : colors.borderSubtle,
                  },
                  activeTab === 'accounts' && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primaryLight,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={activeTab === 'accounts' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <ThemedText
                  style={[
                    styles.tabText,
                    { color: colors.textSecondary },
                    activeTab === 'accounts' && { color: colors.text, fontWeight: '700' },
                  ]}
                >
                  Accounts ({accounts.length})
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('categories')}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                    borderColor: activeTab === 'categories' ? colors.primary : colors.borderSubtle,
                  },
                  activeTab === 'categories' && {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primaryLight,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={activeTab === 'categories' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <ThemedText
                  style={[
                    styles.tabText,
                    { color: colors.textSecondary },
                    activeTab === 'categories' && { color: colors.text, fontWeight: '700' },
                  ]}
                >
                  Categories ({categories.length})
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* ACCOUNTS TAB */}
              {activeTab === 'accounts' && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText variant="label" style={[styles.sectionHeaderLabel, { color: colors.textSecondary }]}>
                      YOUR PAYMENT & BANK ACCOUNTS
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => setShowAddAccount(true)}
                      style={styles.cleanInlineAction}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <ThemedText style={[styles.cleanInlineActionText, { color: colors.primary }]}>Add Account</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {accounts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="wallet-outline" size={36} color={colors.textTertiary} />
                      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts found</ThemedText>
                    </View>
                  ) : (
                    accounts.map((acc) => {
                      const typeMeta = ACCOUNT_TYPE_OPTIONS.find((t) => t.type === acc.type);
                      const currentBal = accountBalances[acc.id] ?? acc.opening_balance;
                      return (
                        <View
                          key={acc.id}
                          style={[
                            styles.cardItem,
                            {
                              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                              borderColor: colors.borderSubtle,
                              shadowColor: colors.cardShadow,
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: isDark ? 0.2 : 0.04,
                              shadowRadius: 4,
                              elevation: 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.cardIconBox,
                              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' },
                            ]}
                          >
                            <Ionicons
                              name={typeMeta?.icon || 'wallet-outline'}
                              size={20}
                              color={colors.primary}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.cardTitle, { color: colors.text }]}>{acc.name}</ThemedText>
                            <ThemedText style={[styles.cardSub, { color: colors.textSecondary }]}>
                              {typeMeta?.label || acc.type} • Opening: {formatCurrency(acc.opening_balance, { symbol: 'PKR' })}
                            </ThemedText>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginRight: Spacing.xs }}>
                            <ThemedText style={[styles.balanceText, { color: colors.text }]}>
                              {formatCurrency(currentBal, { symbol: 'PKR' })}
                            </ThemedText>
                            <ThemedText style={[styles.balanceSub, { color: colors.textSecondary }]}>Balance</ThemedText>
                          </View>
                          {/* Edit button */}
                          <TouchableOpacity
                            onPress={() => {
                              setEditingAccount(acc);
                              setShowEditAccount(true);
                            }}
                            style={styles.cleanIconActionBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="pencil-outline" size={17} color={colors.primary} />
                          </TouchableOpacity>
                          {/* Delete button */}
                          <TouchableOpacity
                            onPress={() => handleDeleteAccount(acc.id, acc.name)}
                            style={styles.cleanIconActionBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={17} color={colors.expense} />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* CATEGORIES TAB */}
              {activeTab === 'categories' && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <View
                      style={[
                        styles.catFilterRow,
                        {
                          backgroundColor: isDark ? colors.surfaceElevated : colors.backgroundSecondary,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      {(['all', 'expense', 'income'] as const).map((filter) => (
                        <TouchableOpacity
                          key={filter}
                          onPress={() => setCategoryTypeFilter(filter)}
                          style={[
                            styles.catFilterPill,
                            categoryTypeFilter === filter && [
                              styles.catFilterPillActive,
                              { backgroundColor: colors.surface },
                            ],
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.catFilterText,
                              { color: colors.textSecondary },
                              categoryTypeFilter === filter && { color: colors.text, fontWeight: '700' },
                            ]}
                          >
                            {filter.toUpperCase()}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowAddCategory(true)}
                      style={styles.cleanInlineAction}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <ThemedText style={[styles.cleanInlineActionText, { color: colors.primary }]}>Add Category</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.catGrid}>
                    {filteredCategories.map((cat) => {
                      const meta = getCategoryMeta(cat.name, categories);
                      const isBuiltin = cat.is_default === 1 || cat.id.startsWith('default-');
                      return (
                        <View
                          key={cat.id}
                          style={[
                            styles.catCard,
                            {
                              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                              borderColor: colors.borderSubtle,
                              shadowColor: colors.cardShadow,
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: isDark ? 0.2 : 0.04,
                              shadowRadius: 4,
                              elevation: 1,
                            },
                          ]}
                        >
                          <View style={[styles.catIconCircle, { backgroundColor: meta.color + '20' }]}>
                            <Ionicons name={meta.icon} size={20} color={meta.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                              {cat.name}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.catTypeTag,
                                { color: cat.type === 'income' ? colors.income : colors.expense },
                              ]}
                            >
                              {cat.type.toUpperCase()}{isBuiltin ? ' • BUILT-IN' : ' • CUSTOM'}
                            </ThemedText>
                          </View>
                          {!isBuiltin && (
                            <TouchableOpacity
                              onPress={() => handleDeleteCategory(cat.id, cat.name)}
                              style={styles.cleanIconActionBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={17} color={colors.expense} />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer Bottom Action */}
            <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
              <ThemedButton
                title={activeTab === 'accounts' ? '+ Add New Account' : '+ Add New Category'}
                variant="cta"
                fullWidth
                onPress={() => {
                  if (activeTab === 'accounts') setShowAddAccount(true);
                  else setShowAddCategory(true);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Sub Modals */}
      <AddAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
      />

      <AddCategoryModal
        visible={showAddCategory}
        initialType={categoryTypeFilter === 'income' ? 'income' : 'expense'}
        onClose={() => setShowAddCategory(false)}
      />

      <EditAccountSheet
        visible={showEditAccount}
        account={editingAccount}
        onClose={() => {
          setShowEditAccount(false);
          setEditingAccount(null);
        }}
        onSaved={() => {
          setShowEditAccount(false);
          setEditingAccount(null);
        }}
      />

      {alertConfig && (
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
          isInsideModal={true}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '92%',
    height: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  cleanInlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 4,
  },
  cleanInlineActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  addInlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catFilterRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 2,
    borderWidth: 1,
    gap: 2,
  },
  catFilterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  catFilterPillActive: {},
  catFilterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceSub: {
    fontSize: 10,
    marginTop: 1,
  },
  cleanIconActionBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catGrid: {
    gap: Spacing.sm,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  catIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catTypeTag: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});

// ─── Edit Account Sheet Styles ────────────────────────────────────────────────

const es = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs + 2,
  },
  textInput: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  typeList: {
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
  },
  currencyBadge: {
    fontWeight: '800',
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  balanceInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Spacing.md,
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});

export default ManageHubModal;
