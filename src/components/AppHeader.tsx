import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useManaTheme } from '../theme/useManaTheme';
import { Text } from './Typography';

/** The "Mana" wordmark with the slogan, shown at the top of every tab. */
export function AppHeader() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Text style={[styles.brand, { color: colors.primaryText }]}>Mana</Text>
      <Text style={[styles.slogan, { color: colors.muted }]}>{t('slogan')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginTop: 3 },
  // The logo always reads left-to-right; alignSelf keeps it at the start edge in Hebrew too.
  brand: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1.8, writingDirection: 'ltr', alignSelf: 'flex-start' },
  slogan: { fontSize: 14, fontWeight: '500' },
});
