import { useColorScheme, Appearance } from 'react-native';
import { Colors, LightColors, DarkColors } from '@/constants/theme';
import { ThemeColors } from '@/types/theme';
import { useAppStore } from '@/store/useAppStore';

export function useTheme(): {
  colors: ThemeColors;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
} {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.themeMode);

  let isDark: boolean;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    // 'system'
    isDark = (systemScheme ?? Appearance.getColorScheme()) === 'dark';
  }

  const colors = isDark ? DarkColors : LightColors;

  return {
    colors,
    isDark,
    colorScheme: isDark ? 'dark' : 'light',
  };
}

export default useTheme;
