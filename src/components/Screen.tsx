import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../stores/preferences';
import { useManaTheme } from '../theme/useManaTheme';

export function Screen({ children, contentStyle, scroll = true }: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle>; scroll?: boolean }>) {
  const { colors } = useManaTheme();
  const language = usePreferences((state) => state.language);
  const direction = language === 'he' ? 'rtl' : 'ltr';
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: colors.background, direction }]}>
      {scroll ? <ScrollView contentContainerStyle={[styles.content, contentStyle, { direction }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={[styles.content, contentStyle, { direction }]}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 34, gap: 18 } });
