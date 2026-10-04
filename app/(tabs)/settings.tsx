import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Typography';
import { AppHeader } from '../../src/components/AppHeader';
import { Icon, type IconName } from '../../src/components/Icon';
import { Screen } from '../../src/components/Screen';
import type { AppLanguage } from '../../src/domain/recipe';
import { usePreferences, type Appearance } from '../../src/stores/preferences';
import { useProfile } from '../../src/stores/profile';
import { useManaTheme } from '../../src/theme/useManaTheme';

const languageOptions: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }, { value: 'he', label: 'עברית' },
];

export default function SettingsScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const appearance = usePreferences((state) => state.appearance);
  const setLanguage = usePreferences((state) => state.setLanguage);
  const setAppearance = usePreferences((state) => state.setAppearance);
  const name = useProfile((state) => state.profile.name);
  const router = useRouter();
  const appearances: { value: Appearance; label: string; icon: IconName }[] = [
    { value: 'system', label: t('system'), icon: 'system' }, { value: 'light', label: t('light'), icon: 'sun' }, { value: 'dark', label: t('dark'), icon: 'moon' },
  ];

  return (
    <Screen>
      <AppHeader />
      <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>

      <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={({ pressed }) => [styles.profileRow, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 }]}>
        <View style={[styles.profileIcon, { backgroundColor: colors.primarySoft }]}><Icon name="person" color={colors.primaryText} size={22} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.option, { color: colors.text, fontWeight: '700' }]}>{name || t('myProfile')}</Text>
          <Text style={[styles.profileHint, { color: colors.muted }]}>{name ? t('myProfile') : t('profileHint')}</Text>
        </View>
        <Icon name="chevron" color={colors.text} size={18} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/billing')} style={({ pressed }) => [styles.profileRow, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 }]}>
        <View style={[styles.profileIcon, { backgroundColor: colors.accentSoft }]}><Icon name="star" color={colors.accentText} size={20} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.option, { color: colors.text, fontWeight: '700' }]}>{t('planAndBilling')}</Text>
          <Text style={[styles.profileHint, { color: colors.muted }]}>{t('freeFeature1')}</Text>
        </View>
        <Icon name="chevron" color={colors.text} size={18} />
      </Pressable>

      <Text style={[styles.section, { color: colors.text }]}>{t('language')}</Text>
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {languageOptions.map((option, index) => {
          const selected = language === option.value;
          return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => void setLanguage(option.value)} style={[styles.row, index < languageOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
            <Text style={[styles.option, { color: colors.text }]}>{option.label}</Text>
            <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.line }]}>{selected && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}</View>
          </Pressable>;
        })}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>{t('appearance')}</Text>
      <View style={styles.tiles}>
        {appearances.map((option) => {
          const selected = appearance === option.value;
          return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => void setAppearance(option.value)} style={[styles.tile, { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? colors.primary : colors.line }]}>
            <Icon name={option.icon} color={selected ? colors.primaryText : colors.text} size={24} />
            <Text style={[styles.tileText, { color: selected ? colors.primaryText : colors.muted }]}>{option.label}</Text>
          </Pressable>;
        })}
      </View>

      <Text style={[styles.version, { color: colors.muted }]}>{t('version')} 1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  profileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  profileHint: { fontSize: 12 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 5 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 6, marginBottom: -6 },
  panel: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, option: { fontSize: 15 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, dot: { width: 10, height: 10, borderRadius: 5 },
  helper: { fontSize: 12, lineHeight: 18, marginTop: -8 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tileText: { fontSize: 12, fontWeight: '600' },
  version: { fontSize: 12, marginTop: 10, textAlign: 'center' },
});
