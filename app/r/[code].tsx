import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { avoidedLabels } from '../../src/components/HeadsUp';
import { confirmAction } from '../../src/components/confirmDuplicate';
import { ManaButton } from '../../src/components/ManaButton';
import { Screen } from '../../src/components/Screen';
import { Text } from '../../src/components/Typography';
import { RecipeLinkError, receiveSharedRecipe } from '../../src/services/sharing/recipeLinks';
import { useImportDraft } from '../../src/stores/importDraft';
import { usePreferences } from '../../src/stores/preferences';
import { useProfile } from '../../src/stores/profile';
import { useManaTheme } from '../../src/theme/useManaTheme';

/** Opens a recipe another Mana user shared (mana://r/<code>), in this user's language, for review before saving. */
export default function SharedRecipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const setDraft = useImportDraft((state) => state.setDraft);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    void receiveSharedRecipe(String(code ?? ''), language).then(async (draft) => {
      if (!active) return;
      const { allergens, avoided } = avoidedLabels(draft, useProfile.getState().profile, t);
      const proceed = allergens.length ? await confirmAction(t('importAllergenTitle'), t('importAllergenBody', { items: allergens.join(', ') }), t('cancel'), t('reviewAnyway'))
        : avoided.length ? await confirmAction(t('importHeadsUpTitle'), t('importHeadsUpBody', { items: avoided.join(', ') }), t('cancel'), t('reviewAnyway')) : true;
      if (!active) return;
      if (!proceed) { router.replace('/(tabs)'); return; }
      setDraft(draft);
      router.replace('/import-review');
    }).catch((caught: unknown) => {
      if (!active) return;
      const reason = caught instanceof RecipeLinkError ? caught.code : 'network';
      setError(reason === 'not_found' || reason === 'invalid_recipe' ? t('sharedNotFound') : reason === 'not_configured' ? t('importUnavailable') : t('sharedFailed'));
    });
    return () => { active = false; };
  }, [code, language, attempt, router, setDraft, t]);

  return (
    <Screen contentStyle={styles.container}>
      {error ? <View style={styles.body}>
        <Text style={[styles.message, { color: colors.text }]}>{error}</Text>
        <ManaButton title={t('retry')} onPress={() => setAttempt((value) => value + 1)} />
        <ManaButton title={t('home')} onPress={() => router.replace('/(tabs)')} secondary />
      </View> : <View style={styles.body}>
        <ActivityIndicator color={colors.primaryText} />
        <Text style={[styles.message, { color: colors.muted }]}>{t('receivingRecipe')}</Text>
      </View>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center' },
  body: { gap: 16, alignItems: 'stretch' },
  message: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
