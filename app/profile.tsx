import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { ManaButton } from '../src/components/ManaButton';
import { ProfileForm } from '../src/components/ProfileForm';
import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Typography';
import { useProfile } from '../src/stores/profile';
import { useManaTheme } from '../src/theme/useManaTheme';

export default function ProfileScreen() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const saved = useProfile((state) => state.profile);
  const saveProfile = useProfile((state) => state.saveProfile);
  const [profile, setProfile] = useState(saved);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try { await saveProfile(profile); router.back(); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>{t('myProfile')}</Text>
      <Text style={[styles.intro, { color: colors.muted }]}>{t('aboutYouIntro')}</Text>
      <ProfileForm value={profile} onChange={setProfile} />
      <ManaButton title={t('save')} onPress={() => void save()} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  intro: { fontSize: 14, lineHeight: 21, marginTop: -6 },
});
