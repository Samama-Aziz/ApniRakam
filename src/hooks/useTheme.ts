import { useColorScheme } from 'react-native';
import { Colors, LightColors, DarkColors } from '@/constants/theme';
import { ThemeColors } from '@/types/theme';

export function useTheme(): {
  colors: ThemeColors;
  isDark: boolean;
  colorScheme: 'light' | 'dark';
} {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return {
    colors,
    isDark,
    colorScheme: isDark ? 'dark' : 'light',
  };
}

export default useTheme;
