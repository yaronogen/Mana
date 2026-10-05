import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Text } from '../../../src/components/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddToGroceriesSheet } from '../../../src/components/AddToGroceriesSheet';
import { CookedSheet, Stars, describeWhen } from '../../../src/components/CookedSheet';
import { HeadsUp } from '../../../src/components/HeadsUp';
import { Icon } from '../../../src/components/Icon';
import { ManaButton } from '../../../src/components/ManaButton';
import { choosePhotoAction } from '../../../src/components/photoActions';
import { RecipeImage } from '../../../src/components/RecipeImage';
import { Screen } from '../../../src/components/Screen';
import { addGroceries, getCookLog, getRecipe, logCook, toggleFavorite } from '../../../src/data/database';
import { groceryItemsFromRecipe } from '../../../src/domain/groceries';
import { convertIngredient, convertTemperatures } from '../../../src/domain/units';
import { formatIngredient } from '../../../src/domain/ingredientText';
import type { CookLogEntry, Recipe } from '../../../src/domain/recipe';
import { categoryLabels, resources } from '../../../src/i18n/resources';
import { deleteRecipeWithImage, pickRecipeImage, saveRecipeWithImage } from '../../../src/services/images/recipeImages';
import { formatRecipeShare } from '../../../src/services/sharing/formatRecipeShare';
import { usePreferences } from '../../../src/stores/preferences';
import { useTranslations } from '../../../src/stores/translations';
import { useManaTheme } from '../../../src/theme/useManaTheme';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // `saved` is the recipe as stored (all edits go there); `recipe` is how it is shown in the app language.
  const [saved, setSaved] = useState<Recipe | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [cookLog, setCookLog] = useState<CookLogEntry[]>([]);
  const [cookSheet, setCookSheet] = useState(false);
  const [grocerySheet, setGrocerySheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const unitSystem = usePreferences((state) => state.unitSystem);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translationVersion = useTranslations((state) => state.version);
  const translationStatus = useTranslations((state) => state.status);
  const translatingThis = useTranslations((state) => !!state.pending[id]);
  const translateOne = useTranslations((state) => state.translateOne);

  const reload = useCallback(async () => {
    const [stored, shown] = await Promise.all([getRecipe(id), getRecipe(id, language)]);
    setSaved(stored);
    setRecipe(shown);
    return { stored, shown };
  }, [id, language]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    void getCookLog(id).then((entries) => { if (active) setCookLog(entries); }).catch(() => undefined);
    void Promise.all([getRecipe(id), getRecipe(id, language)]).then(([stored, shown]) => {
      if (!active) return;
      setSaved(stored);
      setRecipe(shown);
      // Saved in another language and not translated yet (or edited since): translate it now.
      if (stored && shown && shown.outputLanguage !== language) void translateOne(stored, language);
    }).catch(() => { if (active) { setSaved(null); setRecipe(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, language, translationVersion, translateOne]);
  useFocusEffect(load);

  // The tab keeps this screen mounted; never show the previous recipe while another one opens.
  if (!recipe || !saved || recipe.id !== id) return <Screen contentStyle={styles.notFound}>
    <Text style={[styles.notFoundText, { color: colors.text }]}>{loading ? t('loadingRecipe') : t('recipeNotFound')}</Text>
    {!loading && <ManaButton title={t('recipes')} onPress={() => router.replace('/(tabs)/recipes')} secondary />}
  </Screen>;
  const untranslated = recipe.outputLanguage !== language;
  const translationNote = translatingThis ? t('translatingRecipe')
    : translationStatus === 'limit' ? t('translationLimit') : translationStatus === 'unavailable' ? t('translationUnavailable') : t('shownInOriginal');
  const share = async () => { await Share.share({ message: formatRecipeShare(recipe) }); };
  const favorite = async () => { await toggleFavorite(recipe.id); await reload(); };
  const saveCook = async (rating: number | null, note: string | null) => {
    await logCook(recipe.id, rating, note);
    await reload();
    setCookLog(await getCookLog(recipe.id));
  };
  const addToGroceries = async (ingredientIds: string[]) => {
    await addGroceries(groceryItemsFromRecipe(recipe, ingredientIds, { optionalLabel: resources[recipe.outputLanguage].optional, unitSystem }));
    setGrocerySheet(false);
    Alert.alert(t('addedToListTitle'), t('addedToListBody', { n: ingredientIds.length }), [
      { text: t('continue'), style: 'cancel' },
      { text: t('viewList'), onPress: () => router.push('/(tabs)/groceries') },
    ]);
  };
  const notes = cookLog.filter((entry) => entry.note);
  const changePhoto = async () => {
    const action = await choosePhotoAction(t, Boolean(recipe.imageUri));
    if (!action) return;
    const imageUri = action === 'remove' ? null : await pickRecipeImage(action);
    if (action !== 'remove' && !imageUri) return;
    // Save onto the stored recipe, never the translated view.
    await saveRecipeWithImage({ ...saved, imageUri, updatedAt: new Date().toISOString() }, saved.imageUri);
    await reload();
  };
  const remove = () => Alert.alert(t('deleteRecipe'), t('deleteConfirm'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('delete'), style: 'destructive', onPress: () => { void deleteRecipeWithImage(saved).then(() => router.replace('/(tabs)/recipes')); } },
  ]);
  const stats = [
    { label: t('prepTime'), value: recipe.preparationTime, unit: t('minutes') },
    recipe.totalTime !== null ? { label: t('totalTime'), value: recipe.totalTime, unit: t('minutes') } : { label: t('cookTime'), value: recipe.cookingTime, unit: t('minutes') },
    { label: t('servings'), value: recipe.servings, unit: '' },
  ].filter((item) => item.value !== null);
  const circle = (icon: Parameters<typeof Icon>[0]['name'], label: string, onPress: () => void, tint = colors.text) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={[styles.circle, { backgroundColor: colors.surface }]}>
      <Icon name={icon} color={tint} size={18} />
    </Pressable>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background, direction: language === 'he' ? 'rtl' : 'ltr' }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <RecipeImage uri={recipe.imageUri} style={styles.heroImage} glyphSize={80} />
          <View style={[styles.heroBar, { top: insets.top + 10 }]}>
            {circle('back', t('cancel'), () => router.canGoBack() ? router.back() : router.navigate('/(tabs)/recipes'))}
            <View style={{ flex: 1 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('favorite')} accessibilityState={{ selected: recipe.favorite }} onPress={() => void favorite()} hitSlop={6} style={[styles.circle, { backgroundColor: colors.surface }]}>
              <Icon name={recipe.favorite ? 'heartFill' : 'heart'} color={recipe.favorite ? colors.accentText : colors.text} size={19} />
            </Pressable>
            {circle('share', t('share'), () => void share())}
          </View>
          <Pressable accessibilityRole="button" onPress={() => void changePhoto()} style={[styles.photoButton, { backgroundColor: colors.surface }]}>
            <Icon name="camera" color={colors.primaryText} size={16} />
            <Text style={[styles.photoButtonText, { color: colors.primaryText }]}>{recipe.imageUri ? t('changePhoto') : t('addPhoto')}</Text>
          </Pressable>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.category, { color: colors.primaryText }]}>{categoryLabels[language][recipe.category]}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
          {!!recipe.description && <Text style={[styles.description, { color: colors.muted }]}>{recipe.description}</Text>}
          {untranslated && <View style={[styles.translationNote, { backgroundColor: colors.primarySoft }]}>
            {translatingThis ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Icon name="globe" color={colors.primaryText} size={16} />}
            <Text style={[styles.translationText, { color: colors.primaryText }]}>{translationNote}</Text>
            {!translatingThis && translationStatus === 'offline' && <Pressable accessibilityRole="button" onPress={() => void translateOne(saved, language)} hitSlop={8}>
              <Text style={[styles.translationRetry, { color: colors.primaryText }]}>{t('retry')}</Text>
            </Pressable>}
          </View>}
          <HeadsUp recipe={recipe} />

          {!!stats.length && <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {stats.map((item, index) => <Fragment key={item.label}>
              {index > 0 && <View style={[styles.statDivider, { backgroundColor: colors.line }]} />}
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{item.value}{item.unit ? ` ${item.unit}` : ''}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{item.label}</Text>
              </View>
            </Fragment>)}
          </View>}

          {!!recipe.tags.length && <View style={styles.tags}>{recipe.tags.map((tag) => <View key={tag} style={[styles.tag, { backgroundColor: colors.primarySoft }]}><Text style={[styles.tagText, { color: colors.primaryText }]}>{tag}</Text></View>)}</View>}

          <View style={[styles.cooked, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {recipe.cookCount > 0 ? <View style={{ flex: 1, gap: 3 }}>
              {recipe.rating !== null && <Stars value={recipe.rating} color={colors.accentText} />}
              <Text style={[styles.cookedText, { color: colors.text }]}>
                {recipe.cookCount === 1 ? t('cookedOnce') : t('cookedTimes', { n: recipe.cookCount })}{recipe.lastCookedAt ? ` · ${t('lastCooked', { when: describeWhen(t, recipe.lastCookedAt) })}` : ''}
              </Text>
            </View> : <View style={{ flex: 1 }} />}
            <View style={recipe.cookCount > 0 ? undefined : { flex: 1 }}>
              <ManaButton title={t('iCookedThis')} onPress={() => setCookSheet(true)} secondary icon={<Icon name="check" color={colors.primaryText} size={17} />} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ingredients')} <Text style={[styles.count, { color: colors.muted }]}>({recipe.ingredients.length})</Text></Text>
          <View style={[styles.ingredientList, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {recipe.ingredients.map((ingredient, index) => {
              const converted = convertIngredient(ingredient, unitSystem, recipe.outputLanguage);
              return <View key={ingredient.id} style={[styles.ingredientRow, index < recipe.ingredients.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>
                <View style={[styles.ingredientDot, { backgroundColor: colors.primarySoft }]}><Icon name="asterisk" color={colors.primaryText} size={12} /></View>
                <View style={styles.ingredientBody}>
                  <Text style={[styles.ingredientText, { color: colors.text }]}>{formatIngredient(converted.ingredient, resources[recipe.outputLanguage].optional)}</Text>
                  {converted.original && <Text style={[styles.originalAmount, { color: colors.muted }]}>{converted.original}</Text>}
                </View>
              </View>;
            })}
          </View>
          {recipe.ingredients.length > 0 && <ManaButton title={t('addToShoppingList')} onPress={() => setGrocerySheet(true)} secondary icon={<Icon name="cartAdd" color={colors.primaryText} size={18} />} />}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('preparation')} <Text style={[styles.count, { color: colors.muted }]}>({recipe.steps.length})</Text></Text>
          <View style={styles.steps}>{recipe.steps.map((step, index) => <View key={step.id} style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}><Text style={[styles.stepNumberText, { color: colors.onPrimary }]}>{index + 1}</Text></View>
            <Text style={[styles.stepText, { color: colors.text }]}>{convertTemperatures(step.text, unitSystem)}</Text>
          </View>)}</View>

          {notes.length > 0 && <View style={styles.extra}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('yourNotes')}</Text>
            {notes.slice(0, 5).map((entry) => <View key={entry.id} style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={styles.noteHead}>
                <Text style={[styles.noteWhen, { color: colors.muted }]}>{describeWhen(t, entry.cookedAt)}</Text>
                {entry.rating !== null && <Stars value={entry.rating} size={12} color={colors.accentText} />}
              </View>
              <Text style={[styles.description, { color: colors.text }]}>{entry.note}</Text>
            </View>)}
          </View>}
          {!!recipe.notes.length && <View style={styles.extra}><Text style={[styles.sectionTitle, { color: colors.text }]}>{t('notes')}</Text>{recipe.notes.map((note, index) => <Text key={`${index}-${note}`} style={[styles.description, { color: colors.muted }]}>{note}</Text>)}</View>}
          {!!(recipe.sourceName || recipe.sourceUrl) && <View style={[styles.source, { borderColor: colors.line }]}><Text style={[styles.sourceLabel, { color: colors.muted }]}>{t('source')}</Text><Text style={[styles.sourceText, { color: colors.primaryText }]}>{recipe.sourceName ?? recipe.sourceUrl}</Text></View>}
          {!!recipe.warnings.length && <View style={[styles.warning, { backgroundColor: colors.warningBg }]}><Text style={{ color: colors.warningText, fontWeight: '700', marginBottom: 5 }}>{t('checkDetails')}</Text>{recipe.warnings.map((warning, index) => <Text key={index} style={{ color: colors.warningText, fontSize: 12, lineHeight: 18 }}>{warning}</Text>)}</View>}

          <View style={styles.bottomActions}>
            <View style={{ flex: 1 }}><ManaButton title={t('edit')} onPress={() => router.push({ pathname: '/editor', params: { id: recipe.id } })} icon={<Icon name="edit" color={colors.onPrimary} size={17} />} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('deleteRecipe')} onPress={remove} style={[styles.deleteButton, { backgroundColor: colors.surface, borderColor: colors.line }]}><Icon name="trash" color={colors.accentText} size={20} /></Pressable>
          </View>
        </View>
      </ScrollView>
      <CookedSheet visible={cookSheet} onClose={() => setCookSheet(false)} onSave={saveCook} />
      <AddToGroceriesSheet recipe={recipe} visible={grocerySheet} onClose={() => setGrocerySheet(false)} onAdd={addToGroceries} />
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: { flexGrow: 1, justifyContent: 'center' }, notFoundText: { fontSize: 17, lineHeight: 25, textAlign: 'center' },
  page: { flex: 1 }, scroll: { paddingBottom: 40 },
  hero: { height: 330 }, heroImage: { width: '100%', height: '100%' },
  heroBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 10 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  photoButton: { position: 'absolute', right: 16, bottom: 38, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 22, paddingHorizontal: 14, minHeight: 44 },
  photoButtonText: { fontSize: 12, fontWeight: '700' },
  sheet: { marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 22, gap: 15 },
  category: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 32, marginTop: -6 },
  description: { fontSize: 15, lineHeight: 23 },
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 4 }, statDivider: { width: 1, marginVertical: 2 },
  statValue: { fontSize: 16, fontWeight: '700' }, statLabel: { fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tag: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6 }, tagText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginTop: 8 }, count: { fontSize: 14, fontWeight: '500' },
  ingredientList: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  ingredientRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  ingredientDot: { height: 22, width: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, ingredientBody: { flex: 1, gap: 1 }, ingredientText: { fontSize: 15, lineHeight: 22 }, originalAmount: { fontSize: 12 },
  steps: { gap: 16 }, stepRow: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  stepNumber: { height: 30, width: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 16, lineHeight: 25, paddingTop: 2 },
  extra: { gap: 8 }, source: { borderTopWidth: 1, paddingTop: 14, gap: 5 }, sourceLabel: { fontSize: 12 }, sourceText: { fontSize: 13, fontWeight: '600' },
  warning: { borderRadius: 16, padding: 14 },
  translationNote: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  translationText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' }, translationRetry: { fontSize: 13, fontWeight: '800' },
  bottomActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cooked: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  cookedText: { fontSize: 13, fontWeight: '600' },
  noteCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteWhen: { fontSize: 12, fontWeight: '600' },
  deleteButton: { width: 54, minHeight: 54, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
