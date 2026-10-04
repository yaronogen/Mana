import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Typography';
import { Icon, type IconName } from '../src/components/Icon';
import { Screen } from '../src/components/Screen';
import { useManaTheme } from '../src/theme/useManaTheme';

export default function AddRecipeScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const option = (icon: IconName, title: string, body: string, onPress: () => void, tile: string, tint: string) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: tile }]}><Icon name={icon} color={tint} size={22} /></View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.optionBody, { color: colors.muted }]}>{body}</Text>
      </View>
      <Icon name="chevron" color={colors.text} size={18} />
    </Pressable>
  );
  return (
    <Screen>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>{t('addTitle')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('addIntro')}</Text>
      </View>
      {option('link', t('pasteRecipe'), t('pasteCardBody'), () => router.push('/paste'), colors.primarySoft, colors.primaryText)}
      {option('edit', t('writeRecipe'), t('writeCardBody'), () => router.push('/editor'), colors.accentSoft, colors.accentText)}
      <View style={[styles.privacy, { backgroundColor: colors.primarySoft }]}>
        <Icon name="lock" color={colors.primaryText} size={18} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.privacyTitle, { color: colors.primaryText }]}>{t('privateByDesign')}</Text>
          <Text style={[styles.privacyBody, { color: colors.muted }]}>{t('localRecipesNote')}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 8, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }, body: { fontSize: 15, lineHeight: 22 },
  option: { borderWidth: 1, borderRadius: 18, padding: 16, minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, gap: 4 }, optionTitle: { fontSize: 16, fontWeight: '700' }, optionBody: { fontSize: 13, lineHeight: 18 },
  privacy: { borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, marginTop: 8 },
  privacyTitle: { fontSize: 14, fontWeight: '700' }, privacyBody: { fontSize: 12, lineHeight: 18 },
});
