import { useColorScheme } from 'react-native';
import { usePreferences } from '../stores/preferences';
import { darkTheme, lightTheme } from './colors';

export function useManaTheme() {
  const systemScheme = useColorScheme();
  const appearance = usePreferences((state) => state.appearance);
  const isDark = appearance === 'dark' || (appearance === 'system' && systemScheme === 'dark');
  return { colors: isDark ? darkTheme : lightTheme, isDark };
}
