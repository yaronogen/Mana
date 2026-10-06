import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './Typography';
import { formatIngredient, parseIngredientLine } from '../domain/ingredientText';
import { createId, NEW_RECIPE_STATS, RECIPE_CATEGORIES, type Recipe, type RecipeCategory, type RecipeStep } from '../domain/recipe';
import { categoryLabels, resources } from '../i18n/resources';
import { cameraAvailable, pickRecipeImage, type ImageSource } from '../services/images/recipeImages';
import { usePreferences } from '../stores/preferences';
import { useManaTheme } from '../theme/useManaTheme';
import { HeadsUp } from './HeadsUp';
import { Icon, type IconName } from './Icon';
import { ManaButton } from './ManaButton';
import { RecipeImage } from './RecipeImage';
import { Screen } from './Screen';

function blankRecipe(language: Recipe['outputLanguage'], sourceName: string): Recipe {
  const now = new Date().toISOString();
  return {
    id: createId(), title: '', description: null, sourceLanguage: language, outputLanguage: language,
    sourceUrl: null, sourceName, imageUri: null, servings: null, preparationTime: null, cookingTime: null, totalTime: null,
    ingredients: [{ id: createId(), originalText: null, quantityText: null, quantityValue: null, unit: null, ingredient: '', preparation: null, isOptional: false }],
    steps: [{ id: createId(), text: '' }], category: 'other', tags: [], notes: [], warnings: [], favorite: false, ...NEW_RECIPE_STATS, createdAt: now, updatedAt: now,
  };
}

export function RecipeForm({ initialRecipe, onSave, saveLabel, pageTitle }: { initialRecipe?: Recipe; onSave: (recipe: Recipe) => Promise<void>; saveLabel: string; pageTitle?: string }) {
  const { colors } = useManaTheme();
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const router = useRouter();
  const [base] = useState(() => initialRecipe ?? blankRecipe(language, t('myRecipe')));
  const [title, setTitle] = useState(base.title);
  const [description, setDescription] = useState(base.description ?? '');
  const [servings, setServings] = useState(base.servings?.toString() ?? '');
  const [preparationTime, setPreparationTime] = useState(base.preparationTime?.toString() ?? '');
  const [cookingTime, setCookingTime] = useState(base.cookingTime?.toString() ?? '');
  const [ingredients, setIngredients] = useState(() => base.ingredients.map((item) => ({
    id: item.id, text: formatIngredient(item, resources[base.outputLanguage].optional), initialText: formatIngredient(item, resources[base.outputLanguage].optional), initialOriginalText: item.originalText, originalText: item.originalText,
  })));
  // A recipe imported without steps (e.g. an Instagram caption that lists only ingredients) opens with one empty step to fill in.
  const [steps, setSteps] = useState<RecipeStep[]>(base.steps.length ? base.steps.map((step) => ({ ...step })) : [{ id: createId(), text: '' }]);
  const [category, setCategory] = useState<RecipeCategory>(base.category);
  const [tags, setTags] = useState(base.tags.join(', '));
  const [notes, setNotes] = useState(base.notes.join('\n'));
  const [imageUri, setImageUri] = useState(base.imageUri);
  const [busy, setBusy] = useState(false);
  const rtl = base.outputLanguage === 'he';

  const updateIngredient = (index: number, value: string) => setIngredients((current) => current.map((item, i) => i === index ? { ...item, text: value, originalText: value === item.initialText ? item.originalText : null } : item));
  const moveIngredient = (index: number, direction: -1 | 1) => setIngredients((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const moveStep = (index: number, direction: -1 | 1) => setSteps((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });

  const pickPhoto = async (source: ImageSource) => {
    const uri = await pickRecipeImage(source);
    if (uri) setImageUri(uri);
  };
  const photoButton = (icon: IconName, label: string, onPress: () => void, tint = colors.primaryText) => (
    <Pressable key={label} accessibilityRole="button" onPress={onPress} style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <Icon name={icon} color={tint} size={16} /><Text style={[styles.photoButtonText, { color: tint }]}>{label}</Text>
    </Pressable>
  );

  // Reorder: one 44pt handle that offers Move up / Move down (web has no action sheet, so it moves up).
  const reorderButton = (up: () => void, down: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${t('moveUp')} / ${t('moveDown')}`} hitSlop={4}
      onPress={() => Platform.OS === 'web' ? up() : Alert.alert('', undefined, [
        { text: t('moveUp'), onPress: up }, { text: t('moveDown'), onPress: down }, { text: t('cancel'), style: 'cancel' },
      ])}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.primarySoft, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="drag" color={colors.primaryText} size={20} />
    </Pressable>
  );
  const removeButton = (onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={t('remove')} hitSlop={4} onPress={onPress} style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name="close" color={colors.accentText} size={20} />
    </Pressable>
  );
  const addRow = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.addRow, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="plus" color={colors.primaryText} size={18} /><Text style={[styles.addLink, { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.line, writingDirection: rtl ? 'rtl' as const : 'ltr' as const }];
  const labelStyle = [styles.label, { color: colors.text }];
  const save = async () => {
    if (!title.trim() || !ingredients.some((item) => item.text.trim())) {
      Alert.alert(t('missingDetailsTitle'), t('missingDetailsBody'));
      return;
    }
    const prep = Number(preparationTime) || null;
    const cook = Number(cookingTime) || null;
    const now = new Date().toISOString();
    const recipe: Recipe = {
      ...base, title: title.trim(), description: description.trim() || null, imageUri,
      servings: Number(servings) || null, preparationTime: prep, cookingTime: cook,
      // Prep + cook when both are known; otherwise keep the source's stated total (e.g. 181 min).
      totalTime: prep !== null && cook !== null ? prep + cook : base.totalTime ?? prep ?? cook,
      ingredients: ingredients.filter((item) => item.text.trim()).map((item) => {
        const parsedIngredient = parseIngredientLine(item.text);
        return { ...parsedIngredient, id: item.id, originalText: item.initialOriginalText ? item.originalText : parsedIngredient.originalText };
      }),
      steps: steps.filter((step) => step.text.trim()).map((step) => ({ ...step, text: step.text.trim() })),
      category, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      notes: notes.split('\n').map((note) => note.trim()).filter(Boolean), updatedAt: now,
    };
    setBusy(true);
    try { await onSave(recipe); }
    catch { Alert.alert(t('saveFailedTitle'), t('saveFailedBody')); }
    finally { setBusy(false); }
  };

  return (
    <Screen contentStyle={styles.form}>
      <Text style={[styles.pageTitle, { color: colors.text }]}>{pageTitle ?? (initialRecipe ? t('edit') : t('writeRecipe'))}</Text>
      {!!base.warnings.length && <View style={[styles.warning, { backgroundColor: colors.warningBg }]}>
        <Text style={[styles.warningTitle, { color: colors.warningText }]}>{t('checkDetails')}</Text>
        {base.warnings.map((warning, index) => <Text key={`${index}-${warning}`} style={[styles.warningText, { color: colors.warningText }]}>• {warning}</Text>)}
      </View>}
      <HeadsUp recipe={{ ingredients: ingredients.filter((item) => item.text.trim()).map((item) => parseIngredientLine(item.text)) }} />

      <View style={styles.field}>
        <Text style={labelStyle}>{t('photo')}</Text>
        {imageUri ? <View style={styles.photoWrap}>
          <RecipeImage uri={imageUri} style={styles.photo} />
          <View style={styles.photoActions}>
            {cameraAvailable && photoButton('camera', t('takePhoto'), () => void pickPhoto('camera'))}
            {photoButton('photo', t('choosePhoto'), () => void pickPhoto('library'))}
            {photoButton('trash', t('removePhoto'), () => setImageUri(null), colors.accentText)}
          </View>
        </View> : <View style={[styles.photoEmpty, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          <View style={[styles.photoEmptyIcon, { backgroundColor: colors.primarySoft }]}><Icon name="camera" color={colors.primaryText} size={22} /></View>
          <Text style={[styles.photoEmptyTitle, { color: colors.text }]}>{t('addPhoto')}</Text>
          <Text style={[styles.photoEmptyHint, { color: colors.muted }]}>{t('addPhotoHint')}</Text>
          <View style={styles.photoActions}>
            {cameraAvailable && photoButton('camera', t('takePhoto'), () => void pickPhoto('camera'))}
            {photoButton('photo', t('choosePhoto'), () => void pickPhoto('library'))}
          </View>
        </View>}
      </View>

      <View style={styles.field}><Text style={labelStyle}>{t('title')} *</Text><TextInput value={title} onChangeText={setTitle} placeholder={t('recipeTitlePlaceholder')} placeholderTextColor={colors.muted} style={[...inputStyle, styles.titleInput]} /></View>
      <View style={styles.field}><Text style={labelStyle}>{t('description')}</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder={t('descriptionPlaceholder')} placeholderTextColor={colors.muted} style={[...inputStyle, styles.multiline]} /></View>
      <View style={styles.metadata}>
        <View style={[styles.field, styles.metaField]}><Text style={labelStyle}>{t('servings')}</Text><TextInput value={servings} onChangeText={setServings} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.muted} style={inputStyle} /></View>
        <View style={[styles.field, styles.metaField]}><Text style={labelStyle}>{t('prepTime')}</Text><TextInput value={preparationTime} onChangeText={setPreparationTime} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.muted} style={inputStyle} /></View>
        <View style={[styles.field, styles.metaField]}><Text style={labelStyle}>{t('cookTime')}</Text><TextInput value={cookingTime} onChangeText={setCookingTime} keyboardType="number-pad" placeholder="—" placeholderTextColor={colors.muted} style={inputStyle} /></View>
      </View>

      <View style={styles.field}>
        <Text style={labelStyle}>{t('ingredients')} ({ingredients.length}) *</Text>
        {ingredients.map((ingredient, index) => <View key={ingredient.id} style={styles.dynamicRow}>
          {reorderButton(() => moveIngredient(index, -1), () => moveIngredient(index, 1))}
          <TextInput value={ingredient.text} onChangeText={(value) => updateIngredient(index, value)} placeholder={t('ingredientPlaceholder')} placeholderTextColor={colors.muted} style={[...inputStyle, styles.dynamicInput]} />
          {removeButton(() => setIngredients((current) => current.filter((_, i) => i !== index)))}
        </View>)}
        {addRow(t('addIngredient'), () => setIngredients((current) => [...current, { id: createId(), text: '', initialText: '', initialOriginalText: null, originalText: null }]))}
      </View>

      <View style={styles.field}>
        <Text style={labelStyle}>{t('preparation')} *</Text>
        {steps.map((step, index) => <View key={step.id} style={styles.stepRow}>
          <View style={[styles.stepNumber, { backgroundColor: colors.primarySoft }]}><Text style={[styles.stepNumberText, { color: colors.primaryText }]}>{index + 1}</Text></View>
          <TextInput value={step.text} onChangeText={(text) => setSteps((current) => current.map((item, i) => i === index ? { ...item, text } : item))} placeholder={t('stepPlaceholder')} placeholderTextColor={colors.muted} multiline style={[...inputStyle, styles.stepInput]} />
          <View style={styles.stepActions}>
            {reorderButton(() => moveStep(index, -1), () => moveStep(index, 1))}
            {removeButton(() => setSteps((current) => current.filter((_, i) => i !== index)))}
          </View>
        </View>)}
        {addRow(t('addStep'), () => setSteps((current) => [...current, { id: createId(), text: '' }]))}
      </View>

      <View style={styles.field}>
        <Text style={labelStyle}>{t('category')}</Text>
        <View style={styles.categoryWrap}>{RECIPE_CATEGORIES.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryPill, { backgroundColor: category === item ? colors.primary : colors.surface, borderColor: category === item ? colors.primary : colors.line }]}><Text style={{ color: category === item ? colors.onPrimary : colors.text, fontSize: 12 }}>{categoryLabels[language][item]}</Text></Pressable>)}</View>
      </View>
      <View style={styles.field}><Text style={labelStyle}>{t('tags')}</Text><TextInput value={tags} onChangeText={setTags} placeholder={t('tagsHint')} placeholderTextColor={colors.muted} style={inputStyle} /></View>
      <View style={styles.field}><Text style={labelStyle}>{t('notes')}</Text><TextInput value={notes} onChangeText={setNotes} multiline placeholder={t('notesHint')} placeholderTextColor={colors.muted} style={[...inputStyle, styles.multiline]} /></View>
      <View style={{ height: 6 }} />
      <ManaButton title={saveLabel} onPress={() => void save()} loading={busy} />
      <Pressable onPress={() => router.back()} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>{t('cancel')}</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 }, pageTitle: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  photoWrap: { gap: 10 }, photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16 }, photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, minHeight: 44 }, photoButtonText: { fontSize: 13, fontWeight: '600' },
  photoEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 18, alignItems: 'center', gap: 6 }, photoEmptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  photoEmptyTitle: { fontSize: 15, fontWeight: '700' }, photoEmptyHint: { fontSize: 12, lineHeight: 17, textAlign: 'center', maxWidth: 260, marginBottom: 8 },
  field: { gap: 8 }, label: { fontSize: 13, fontWeight: '700' }, input: { minHeight: 49, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  titleInput: { minHeight: 58, fontSize: 19, fontWeight: '600' }, multiline: { minHeight: 88, textAlignVertical: 'top' }, metadata: { flexDirection: 'row', gap: 9 }, metaField: { flex: 1 },
  dynamicRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dynamicInput: { flex: 1 }, iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' }, addLink: { fontSize: 14, fontWeight: '700' }, stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 }, stepNumber: { width: 29, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 9 }, stepNumberText: { fontSize: 12, fontWeight: '700' }, stepInput: { flex: 1, minHeight: 76, textAlignVertical: 'top' }, stepActions: { gap: 4, alignItems: 'center' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, categoryPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, minHeight: 40, justifyContent: 'center' }, warning: { padding: 14, borderRadius: 16, gap: 5 }, warningTitle: { fontSize: 13, fontWeight: '700' }, warningText: { fontSize: 12, lineHeight: 17 }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 14, fontWeight: '600' },
});
