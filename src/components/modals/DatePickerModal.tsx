import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import ThemedText from '@/components/common/ThemedText';
import { Radius, Spacing } from '@/constants/theme';

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const ITEM_HEIGHT = 44;
const CONTAINER_HEIGHT = 220;
const VERTICAL_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

export interface DatePickerModalProps {
  visible: boolean;
  selected: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  title?: string;
}

export function DatePickerModal({
  visible,
  selected,
  onConfirm,
  onClose,
  title = 'Select Date',
}: DatePickerModalProps) {
  const { colors, isDark } = useTheme();

  const [day, setDay] = useState(selected.getDate());
  const [month, setMonth] = useState(selected.getMonth());
  const [year, setYear] = useState(selected.getFullYear());

  const currentYear = new Date().getFullYear();
  // Allow picking from next 3 years down to 7 years ago
  const years = React.useMemo(
    () => Array.from({ length: 11 }, (_, i) => currentYear + 3 - i),
    [currentYear]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = React.useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  // Helper to scroll a column so the target index is centered
  const scrollToCenter = useCallback(
    (
      ref: React.RefObject<ScrollView | null>,
      index: number,
      animated = true
    ) => {
      if (ref.current && index >= 0) {
        ref.current.scrollTo({
          y: index * ITEM_HEIGHT,
          animated,
        });
      }
    },
    []
  );

  // Synchronize state and automatically center the selected date when opened
  useEffect(() => {
    if (visible) {
      const initialDate = selected instanceof Date && !isNaN(selected.getTime()) ? selected : new Date();
      const d = initialDate.getDate();
      const m = initialDate.getMonth();
      const y = initialDate.getFullYear();

      setDay(d);
      setMonth(m);
      setYear(y);

      const dIdx = Math.max(0, d - 1);
      const mIdx = Math.max(0, m);
      const yIdx = Math.max(0, years.indexOf(y));

      const t = setTimeout(() => {
        scrollToCenter(dayScrollRef, dIdx, false);
        scrollToCenter(monthScrollRef, mIdx, false);
        scrollToCenter(yearScrollRef, yIdx, false);
      }, 70);

      return () => clearTimeout(t);
    }
  }, [visible, selected, years, scrollToCenter]);

  // Adjust day if selected day exceeds the days in month
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
      scrollToCenter(dayScrollRef, daysInMonth - 1, true);
    }
  }, [daysInMonth, day, scrollToCenter]);

  const handleSelectDay = (d: number) => {
    setDay(d);
    scrollToCenter(dayScrollRef, d - 1, true);
  };

  const handleSelectMonth = (mIndex: number) => {
    setMonth(mIndex);
    scrollToCenter(monthScrollRef, mIndex, true);
  };

  const handleSelectYear = (y: number) => {
    setYear(y);
    const yIdx = years.indexOf(y);
    scrollToCenter(yearScrollRef, yIdx, true);
  };

  // Jump to today shortcut
  const handleJumpToToday = () => {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth();
    const y = today.getFullYear();
    setDay(d);
    setMonth(m);
    setYear(y);
    const dIdx = Math.max(0, d - 1);
    const mIdx = Math.max(0, m);
    const yIdx = Math.max(0, years.indexOf(y));
    scrollToCenter(dayScrollRef, dIdx, true);
    scrollToCenter(monthScrollRef, mIdx, true);
    scrollToCenter(yearScrollRef, yIdx, true);
  };

  // Momentum scroll snap handlers to auto-align on drag release
  const onDayScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(days.length - 1, idx));
    setDay(days[clampedIdx]);
  };

  const onMonthScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(MONTHS.length - 1, idx));
    setMonth(clampedIdx);
  };

  const onYearScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(years.length - 1, idx));
    setYear(years[clampedIdx]);
  };

  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    const result = new Date(year, month, safeDay, 12, 0, 0);
    onConfirm(result);
  };

  // Day of week calculation for subtitle
  const selectedDayName = React.useMemo(() => {
    try {
      const d = new Date(year, month, Math.min(day, daysInMonth));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return '';
    }
  }, [year, month, day, daysInMonth]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.borderSubtle,
              shadowColor: colors.cardShadow,
              shadowOpacity: isDark ? 0.4 : 0.08,
            },
          ]}
        >
          {/* Top handle bar */}
          <View style={[styles.handle, { backgroundColor: isDark ? colors.borderSubtle : colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
              <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '35' }]}>
                <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                <ThemedText style={[styles.dateBadgeText, { color: colors.primary }]}>
                  {selectedDayName}, {String(day).padStart(2, '0')} {MONTHS[month]} {year}
                </ThemedText>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleJumpToToday}
                style={[styles.todayBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderSubtle }]}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.todayBtnText, { color: colors.primary }]}>Today</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.backgroundSecondary }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Dedicated Column Headers Row - perfectly separated from scrolling area */}
          <View style={styles.colHeaderRow}>
            <ThemedText style={[styles.colHeaderLabel, { color: colors.textSecondary }]}>DAY</ThemedText>
            <ThemedText style={[styles.colHeaderLabel, { color: colors.textSecondary }]}>MONTH</ThemedText>
            <ThemedText style={[styles.colHeaderLabel, { color: colors.textSecondary }]}>YEAR</ThemedText>
          </View>

          {/* Centered Wheel Picker Container */}
          <View style={[styles.pickerContainer, { backgroundColor: isDark ? colors.backgroundSecondary + '40' : '#F8FAFC' }]}>
            {/* Unified Glass Selection Highlight Lens */}
            <View
              pointerEvents="none"
              style={[
                styles.centerSelectionBand,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
                },
              ]}
            />

            {/* Scrolling Columns Row */}
            <View style={styles.columnsRow}>
              {/* Day Column */}
              <View style={styles.column}>
                <ScrollView
                  ref={dayScrollRef}
                  style={styles.columnScroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onDayScrollEnd}
                >
                  {days.map((d) => {
                    const isSelected = day === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        onPress={() => handleSelectDay(d)}
                        style={styles.itemWrapper}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.item,
                            isSelected && [
                              styles.itemActive,
                              { backgroundColor: colors.primary },
                            ],
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.itemText,
                              { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                              isSelected ? styles.itemTextSelected : { opacity: 0.5 },
                            ]}
                          >
                            {String(d).padStart(2, '0')}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.column}>
                <ScrollView
                  ref={monthScrollRef}
                  style={styles.columnScroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onMonthScrollEnd}
                >
                  {MONTHS.map((m, i) => {
                    const isSelected = month === i;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => handleSelectMonth(i)}
                        style={styles.itemWrapper}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.item,
                            isSelected && [
                              styles.itemActive,
                              { backgroundColor: colors.primary },
                            ],
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.itemText,
                              { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                              isSelected ? styles.itemTextSelected : { opacity: 0.5 },
                            ]}
                          >
                            {m}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.column}>
                <ScrollView
                  ref={yearScrollRef}
                  style={styles.columnScroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  onMomentumScrollEnd={onYearScrollEnd}
                >
                  {years.map((y) => {
                    const isSelected = year === y;
                    return (
                      <TouchableOpacity
                        key={y}
                        onPress={() => handleSelectYear(y)}
                        style={styles.itemWrapper}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.item,
                            isSelected && [
                              styles.itemActive,
                              { backgroundColor: colors.primary },
                            ],
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.itemText,
                              { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                              isSelected ? styles.itemTextSelected : { opacity: 0.5 },
                            ]}
                          >
                            {y}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Top and Bottom soft fade edges */}
            <View
              pointerEvents="none"
              style={[
                styles.fadeTop,
                { backgroundColor: isDark ? 'rgba(24, 24, 27, 0.45)' : 'rgba(255, 255, 255, 0.65)' },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.fadeBottom,
                { backgroundColor: isDark ? 'rgba(24, 24, 27, 0.45)' : 'rgba(255, 255, 255, 0.65)' },
              ]}
            />
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <ThemedText style={styles.confirmText}>Confirm Date</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.xl,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    marginBottom: 8,
  },
  colHeaderLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  pickerContainer: {
    position: 'relative',
    height: CONTAINER_HEIGHT,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    paddingHorizontal: Spacing.xs,
  },
  centerSelectionBand: {
    position: 'absolute',
    top: VERTICAL_PADDING,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    zIndex: 0,
  },
  columnsRow: {
    flexDirection: 'row',
    height: CONTAINER_HEIGHT,
    zIndex: 1,
  },
  column: {
    flex: 1,
    paddingHorizontal: 4,
  },
  columnScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: VERTICAL_PADDING,
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    width: '92%',
    height: ITEM_HEIGHT - 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  itemActive: {
    borderRadius: Radius.md,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemTextSelected: {
    fontWeight: '800',
    fontSize: 16,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
  },
  confirmBtn: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default DatePickerModal;
