import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { ManaButton } from '../src/components/ManaButton';
import { RecipeImage } from '../src/components/RecipeImage';
import { Screen } from '../src/components/Screen';
import { Text, TextInput } from '../src/components/Typography';
import { getRecipes } from '../src/data/database';
import type { Recipe } from '../src/domain/recipe';
import { createCookbookPdf, sharePdf } from '../src/services/cookbook/createCookbook';
import { usePreferences } from '../src/stores/preferences';
import { useProfile } from '../src/stores/profile';
import { useManaTheme } from '../src/theme/useManaTheme';

/**
 * "My cookbook": the chosen recipes become a printable PDF, sent with any app the user picks from the share sheet
 * (Gmail, Mail, Outlook, WhatsApp, Files, Print). Apple's built-in mail window is not used: it only works with an
 * account set up in Apple Mail, so with Gmail its Send button silently left the email in the Outbox.
 */
export default function CookbookScreen() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const unitSystem = usePreferences((state) => state.unitSystem);
  const author = useProfile((state) => state.profile.name);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [title, setTitle] = useState(() => t('myCookbook'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const wanted = (typeof ids === 'string' ? ids : '').split(',').filter(Boolean);
    // Shown (and printed) in the app language, in the order the recipes were picked.
    void getRecipes({ language }).then((all) => {
      const byId = new Map(all.map((recipe) => [recipe.id, recipe]));
      if (active) setRecipes(wanted.map((id) => byId.get(id)).filter((recipe): recipe is Recipe => !!recipe));
    }).catch(() => { if (active) setRecipes([]); });
    return () => { active = false; };
  }, [ids, language]);

  const move = (index: number, direction: -1 | 1) => setRecipes((current) => {
    if (!current) return current;
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const remove = (id: string) => setRecipes((current) => current?.filter((recipe) => recipe.id !== id) ?? current);

  const create = async () => {
    if (!recipes?.length) return;
    setBusy(true);
    try {
      const cookbookTitle = title.trim() || t('myCookbook');
      const pdf = await createCookbookPdf({ title: cookbookTitle, author, language, recipes, unitSystem });
      if (await sharePdf(pdf, cookbookTitle) === 'unavailable') Alert.alert(t('myCookbook'), t('cookbookUnavailable'));
    } catch {
      Alert.alert(t('myCookbook'), Platform.OS === 'web' ? t('cookbookUnavailable') : t('cookbookFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Screen contentStyle={styles.center}>
    <ActivityIndicator color={colors.primaryText} />
    <Text style={[styles.busyText, { color: colors.muted }]}>{t('creatingPdf')}</Text>
  </Screen>;

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line }];
  return (
    <Screen>
      <Text style={[styles.title, { color: colors.text }]}>{t('myCookbook')}</Text>
      <Text style={[styles.intro, { color: colors.muted }]}>{t('cookbookIntro')}</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('cookbookTitleLabel')}</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={60} placeholder={t('myCookbook')} placeholderTextColor={colors.muted} style={inputStyle} />
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('cookbookRecipesLabel', { n: recipes?.length ?? 0 })}</Text>
      {recipes === null ? <ActivityIndicator color={colors.primaryText} /> : <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {recipes.map((recipe, index) => <View key={recipe.id} style={[styles.row, index < recipes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
          <Text style={[styles.number, { color: colors.primaryText }]}>{index + 1}</Text>
          <RecipeImage uri={recipe.imageUri} style={styles.thumb} glyphSize={14} />
          <Text numberOfLines={2} style={[styles.rowTitle, { color: colors.text }]}>{recipe.title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('moveUp')} / ${t('moveDown')}`} hitSlop={4}
            onPress={() => Alert.alert('', undefined, [{ text: t('moveUp'), onPress: () => move(index, -1) }, { text: t('moveDown'), onPress: () => move(index, 1) }, { text: t('cancel'), style: 'cancel' }])}
            style={styles.iconButton}><Icon name="drag" color={colors.muted} size={20} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('remove')} hitSlop={4} onPress={() => remove(recipe.id)} style={styles.iconButton}>
            <Icon name="close" color={colors.accentText} size={18} />
          </Pressable>
        </View>)}
      </View>}

      <ManaButton title={t('createAndSend')} onPress={() => void create()} disabled={!recipes?.length} icon={<Icon name="share" color={colors.onPrimary} size={18} />} />
      <Text style={[styles.hint, { color: colors.muted }]}>{t('cookbookSendHint')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  busyText: { fontSize: 15, textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: -6 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  intro: { fontSize: 14, lineHeight: 21, marginTop: -6 },
  field: { gap: 9 },
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  list: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, marginTop: -8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  number: { width: 22, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  thumb: { width: 40, height: 40, borderRadius: 9 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  iconButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});
