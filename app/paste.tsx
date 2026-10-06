import { useMutation } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../src/components/Typography';
import { Icon } from '../src/components/Icon';
import { ManaButton } from '../src/components/ManaButton';
import { PreparingRecipe } from '../src/components/PreparingRecipe';
import { avoidedLabels } from '../src/components/HeadsUp';
import { confirmAction } from '../src/components/confirmDuplicate';
import { Screen } from '../src/components/Screen';
import { RecipeImportError, parseRecipeText } from '../src/services/ai/recipeParser';
import { fetchImportUsage, PREMIUM_VISIBLE, type ImportUsage } from '../src/services/billing/plan';
import { extractRecipeUrl } from '../src/services/import/webRecipe';
import { useImportDraft } from '../src/stores/importDraft';
import { usePreferences } from '../src/stores/preferences';
import { useProfile } from '../src/stores/profile';
import { useManaTheme } from '../src/theme/useManaTheme';

export default function PasteRecipeScreen() {
  // Text or a link shared into Mana from another app (e.g. an Instagram reel) arrives here and imports right away.
  const { shared } = useLocalSearchParams<{ shared?: string }>();
  const [text, setText] = useState(() => (typeof shared === 'string' ? shared : '').slice(0, 30_000));
  const [error, setError] = useState<string | null>(null);
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const setDraft = useImportDraft((state) => state.setDraft);
  const router = useRouter();
  const importMutation = useMutation({ mutationFn: ({ sourceText, targetLanguage }: { sourceText: string; targetLanguage: typeof language }) => parseRecipeText(sourceText, targetLanguage) });
  const busy = importMutation.isPending;
  const isLink = extractRecipeUrl(text) !== null;
  const [usage, setUsage] = useState<ImportUsage | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    void fetchImportUsage().then((result) => { if (active) setUsage(result); });
    return () => { active = false; };
  }, []));

  const create = async () => {
    if (!text.trim()) { setError(t('pasteFirst')); return; }
    setError(null);
    try {
      const draft = await importMutation.mutateAsync({ sourceText: text, targetLanguage: language });
      // The draft is already in the user's language, so their own dislikes match it directly.
      // Allergies come first; the softer heads-up is only asked about when no allergen matched.
      const { allergens, avoided } = avoidedLabels(draft, useProfile.getState().profile, t);
      if (allergens.length && !await confirmAction(t('importAllergenTitle'), t('importAllergenBody', { items: allergens.join(', ') }), t('cancel'), t('reviewAnyway'))) return;
      if (!allergens.length && avoided.length && !await confirmAction(t('importHeadsUpTitle'), t('importHeadsUpBody', { items: avoided.join(', ') }), t('cancel'), t('reviewAnyway'))) return;
      setDraft(draft);
      router.push('/import-review');
    } catch (caught) {
      const code = caught instanceof RecipeImportError ? caught.code : 'invalid_response';
      const message = code === 'not_configured' ? t('importUnavailable')
        : code === 'no_recipe' ? `${t('importFailed')} ${t('importHelp')}`
          : code === 'instagram_caption' ? t('instagramCaptionHelp')
          : code === 'too_long' ? t('textTooLong')
            : code === 'rate_limited' ? t('importLimit')
            : code === 'page_unavailable' ? t('pageUnavailable')
            : code === 'network' ? t('networkImportFailed') : t('importFailed');
      setError(message);
    }
  };

  // Runs once, for the shared text the screen opened with.
  const startedShared = useRef(false);
  useEffect(() => {
    if (startedShared.current || !text.trim() || typeof shared !== 'string') return;
    startedShared.current = true;
    void create();
  }, []);

  if (busy) return <PreparingRecipe fromLink={isLink} />;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('pasteScreenTitle')}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{t('pasteHint')}</Text>
      </View>
      <View style={[styles.textAreaWrap, { backgroundColor: colors.surface, borderColor: error ? colors.accentText : colors.line }]}>
        <TextInput value={text} onChangeText={setText} multiline maxLength={30_000} textAlignVertical="top" placeholder={t('pastePlaceholder')} placeholderTextColor={colors.muted} style={[styles.textArea, { color: colors.text, writingDirection: language === 'he' && !isLink ? 'rtl' : 'ltr' }]} />
      </View>
      <View style={styles.meta}>
        {usage ? <Text style={[styles.counter, { color: usage.used >= usage.limit ? colors.accentText : colors.muted }]}>{t('importsLeft', { left: Math.max(0, usage.limit - usage.used), limit: usage.limit })}</Text> : <View />}
        <Text style={[styles.counter, { color: colors.muted }]}>{text.length.toLocaleString()} / 30,000</Text>
      </View>
      {error ? <View style={[styles.note, { backgroundColor: colors.warningBg }]}>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={[styles.noteText, { color: colors.warningText }]}>{error}</Text>
          {PREMIUM_VISIBLE && error === t('importLimit') && <Pressable accessibilityRole="button" onPress={() => router.push('/billing')} style={styles.linkButton}><Text style={[styles.manualLink, { color: colors.primaryText }]}>{t('seePlans')} →</Text></Pressable>}
          {error === t('importUnavailable') && <Pressable onPress={() => router.push('/editor')}><Text style={[styles.manualLink, { color: colors.primaryText }]}>{t('writeRecipe')} →</Text></Pressable>}
        </View>
      </View> : isLink ? <View style={[styles.note, { backgroundColor: colors.primarySoft }]}>
        <Icon name="checkCircle" color={colors.primaryText} size={22} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{t('linkDetectedTitle')}</Text>
          <Text style={[styles.noteText, { color: colors.muted }]}>{t('linkDetected')}</Text>
        </View>
      </View> : <View style={[styles.note, { backgroundColor: colors.primarySoft }]}>
        <Icon name="link" color={colors.primaryText} size={20} />
        <Text style={[styles.noteText, { flex: 1, color: colors.muted }]}>{t('pasteInfo')}</Text>
      </View>}
      <View style={{ flex: 1 }} />
      <ManaButton title={t('createRecipe')} onPress={() => void create()} disabled={!text.trim()} />
      <Pressable onPress={() => router.back()} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>{t('cancel')}</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14 }, header: { gap: 8, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }, body: { fontSize: 15, lineHeight: 22 },
  textAreaWrap: { minHeight: 230, borderWidth: 1, borderRadius: 16, padding: 14 },
  textArea: { flex: 1, minHeight: 200, fontSize: 15, lineHeight: 23 }, counter: { fontSize: 12 }, meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: -6 },
  note: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noteTitle: { fontSize: 14, fontWeight: '700' }, noteText: { fontSize: 13, lineHeight: 19 }, manualLink: { fontSize: 13, fontWeight: '700' }, linkButton: { minHeight: 44, justifyContent: 'center' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 14, fontWeight: '600' },
});
