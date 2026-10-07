import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { fetchImportUsage, PLANS, redeemTesterCode, type ImportUsage } from '../services/billing/plan';
import { useManaTheme } from '../theme/useManaTheme';
import { ManaButton } from './ManaButton';
import { Text, TextInput } from './Typography';

/** A quiet Settings row where testers enter their code to get the tester allowance (20 imports a month). */
export function TesterCode() {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void fetchImportUsage().then((result) => { if (active) setUsage(result); });
    return () => { active = false; };
  }, []));

  const redeem = async () => {
    setBusy(true);
    try {
      const result = await redeemTesterCode(code);
      if (result === 'ok') {
        setOpen(false);
        setCode('');
        setUsage(await fetchImportUsage());
        Alert.alert(t('testerCodeLink'), t('testerCodeOk', { n: PLANS.tester.importsPerMonth }));
        return;
      }
      Alert.alert(t('testerCodeLink'), result === 'invalid' ? t('testerCodeInvalid') : result === 'limit' ? t('testerCodeLimit') : t('testerCodeUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  if (usage?.plan === 'tester') {
    return <Text style={[styles.active, { color: colors.primaryText }]}>{t('testerActive', { n: usage.limit })}</Text>;
  }
  if (!open) {
    return <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8} style={styles.link}>
      <Text style={[styles.linkText, { color: colors.muted }]}>{t('testerCodeLink')}</Text>
    </Pressable>;
  }
  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} autoFocus maxLength={100}
        placeholder={t('testerCodePlaceholder')} placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.line, writingDirection: 'ltr' }]} />
      <ManaButton title={t('redeemCode')} onPress={() => void redeem()} loading={busy} disabled={!code.trim()} />
      <Pressable accessibilityRole="button" onPress={() => { setOpen(false); setCode(''); }} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.muted }]}>{t('cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  linkText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  active: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginTop: 6 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, letterSpacing: 1 },
});
