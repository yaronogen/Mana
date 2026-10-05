import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../src/components/Typography';
import { Icon, type IconName } from '../src/components/Icon';
import { ManaButton } from '../src/components/ManaButton';
import { ProfileForm } from '../src/components/ProfileForm';
import { Screen } from '../src/components/Screen';
import type { AppLanguage } from '../src/domain/recipe';
import { usePreferences } from '../src/stores/preferences';
import { useProfile } from '../src/stores/profile';
import { useManaTheme } from '../src/theme/useManaTheme';

const languages: { id: AppLanguage; native: string }[] = [
  { id: 'en', native: 'English' },
  { id: 'de', native: 'Deutsch' },
  { id: 'he', native: 'עברית' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const setLanguage = usePreferences((state) => state.setLanguage);
  const finish = usePreferences((state) => state.finishOnboarding);
  const savedProfile = useProfile((state) => state.profile);
  const saveProfile = useProfile((state) => state.saveProfile);
  const [profile, setProfile] = useState(savedProfile);
  const router = useRouter();
  // The logo keeps a fixed square size and its own space in the layout, so text never sits on top of it.
  const logoSize = Math.min(220, useWindowDimensions().width * 0.55);

  // Steps: 0 welcome, 1 language, 2 about you (optional), 3 intro.
  const next = async (skipProfile = false) => {
    if (step === 2 && !skipProfile) await saveProfile(profile);
    if (step < 3) setStep((value) => value + 1);
    else {
      await finish();
      router.replace('/(tabs)');
    }
  };

  if (step === 0) return (
    <Screen contentStyle={styles.container}>
      <View style={styles.welcomeHead}>
        <Text style={[styles.welcomeBrand, { color: colors.primaryText }]}>Mana</Text>
        <Text style={[styles.welcomeTagline, { color: colors.muted }]}>{t('tagline')}</Text>
      </View>
      <View style={[styles.logoWrap, { minHeight: logoSize + 24 }]}>
        <Image source={require('../assets/images/icon.png')} style={{ width: logoSize, height: logoSize, borderRadius: logoSize * 0.22 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {([['restaurant', t('welcomeFeature1')], ['sparkles', t('welcomeFeature2')], ['book', t('welcomeFeature3')]] as [IconName, string][]).map(([icon, label]) => (
          <View key={label} style={styles.featureRow}>
            <View style={[styles.featureIcon, { borderColor: colors.line }]}><Icon name={icon} color={colors.primaryText} size={15} /></View>
            <Text style={[styles.featureText, { color: colors.text }]}>{label}</Text>
          </View>
        ))}
      </View>
      <ManaButton title={t('getStarted')} onPress={() => void next()} />
    </Screen>
  );

  return (
    <Screen contentStyle={styles.container}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => setStep((value) => value - 1)} hitSlop={12} style={styles.back}>
        <Icon name="back" color={colors.text} size={22} />
      </Pressable>
      {step === 1 ? <View style={styles.main}>
        <Text style={[styles.title, { color: colors.text }]}>{t('chooseLanguage')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('languageIntro')}</Text>
        <View style={styles.languageList}>
          {languages.map((item) => {
            const selected = language === item.id;
            return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => void setLanguage(item.id)} style={[styles.languageCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.line }]}>
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.line }]}>{selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.languageName, { color: colors.text }]}>{item.native}</Text>
                {item.id === 'he' && language !== 'he' && <Text style={[styles.languageHint, { color: colors.muted }]}>({t('hebrewName')})</Text>}
              </View>
            </Pressable>;
          })}
        </View>
      </View> : step === 2 ? <View style={styles.main}>
        <Text style={[styles.title, { color: colors.text }]}>{t('aboutYouTitle')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('aboutYouIntro')}</Text>
        <View style={{ marginTop: 24 }}><ProfileForm value={profile} onChange={setProfile} /></View>
      </View> : <View style={styles.main}>
        <Image source={require('../assets/images/intro-garnish.png')} style={styles.garnish} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[styles.introTitle, { color: colors.text }]}>{t('demoTitle').split(/(?<=\.)\s+/).join('\n')}</Text>
        <Text style={[styles.body, styles.introBody, { color: colors.muted }]}>{t('demoBody')}</Text>
        <View style={styles.flow}>
          {([['search', t('findIt'), t('findItBody'), colors.primarySoft, colors.primaryText], ['grid', t('saveIt'), t('saveItBody'), colors.primarySoft, colors.primaryText], ['heart', t('cookIt'), t('cookItBody'), colors.accentSoft, colors.accentText]] as [IconName, string, string, string, string][]).map(([icon, label, hint, tile, tint]) => (
            <View key={label} style={styles.flowItem}>
              <View style={[styles.flowIcon, { backgroundColor: tile }]}><Icon name={icon} color={tint} size={22} /></View>
              <Text style={[styles.flowLabel, { color: colors.text }]}>{label}</Text>
              <Text style={[styles.flowHint, { color: colors.muted }]}>{hint}</Text>
            </View>
          ))}
        </View>
      </View>}
      <View style={styles.bottom}>
        <View style={styles.dots}>{[1, 2, 3].map((item) => <View key={item} style={[styles.dot, { backgroundColor: step === item ? colors.primary : colors.line }]} />)}</View>
        <ManaButton title={t('continue')} onPress={() => void next()} />
        {step === 2 && <Pressable accessibilityRole="button" onPress={() => void next(true)} style={styles.skip}><Text style={[styles.skipText, { color: colors.muted }]}>{t('skip')}</Text></Pressable>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingTop: 18, paddingBottom: 30 },
  welcomeHead: { gap: 6, marginTop: 18 },
  welcomeBrand: { fontSize: 60, lineHeight: 68, fontWeight: '800', letterSpacing: -2.6, writingDirection: 'ltr', alignSelf: 'flex-start' },
  welcomeTagline: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', lineHeight: 17, maxWidth: 220 },
  logoWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  featureCard: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  featureIcon: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, flex: 1 },
  back: { alignSelf: 'flex-start', paddingVertical: 6 },
  main: { flex: 1, paddingTop: 12 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.7, lineHeight: 37 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 10, maxWidth: 380 },
  languageList: { gap: 11, marginTop: 28 },
  languageCard: { minHeight: 62, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio: { height: 21, width: 21, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { height: 11, width: 11, borderRadius: 6 },
  languageName: { fontSize: 16, fontWeight: '600' }, languageHint: { fontSize: 12, marginTop: 2 },
  garnish: { position: 'absolute', top: -60, end: -22, width: 120, height: 226 },
  introTitle: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2, lineHeight: 46, marginTop: 18, maxWidth: 240 },
  introBody: { maxWidth: 290 },
  flow: { flexDirection: 'row', gap: 10, marginTop: 30 },
  flowItem: { flex: 1, gap: 6 },
  flowIcon: { height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  flowLabel: { fontSize: 14, fontWeight: '700' }, flowHint: { fontSize: 12, lineHeight: 16 },
  bottom: { gap: 20, marginTop: 24 }, skip: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: -8 }, skipText: { fontSize: 14, fontWeight: '600' }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4 },
});
