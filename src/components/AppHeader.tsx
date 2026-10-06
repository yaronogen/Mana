import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useManaTheme } from '../theme/useManaTheme';
import { Text } from './Typography';
import { Wordmark } from './Wordmark';

/** The "Mana" wordmark with the slogan, shown at the top of every tab. */
export function AppHeader() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Wordmark size={40} />
      <Text style={[styles.slogan, { color: colors.muted }]}>{t('slogan')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginTop: 3 },
  slogan: { fontSize: 14, fontWeight: '500' },
});
