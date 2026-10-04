import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, View } from 'react-native';
import { confirmDuplicate } from '../src/components/confirmDuplicate';
import { RecipeForm } from '../src/components/RecipeForm';
import { getRecipe } from '../src/data/database';
import { hasDuplicateTitle } from '../src/data/duplicates';
import type { Recipe } from '../src/domain/recipe';
import { saveRecipeWithImage } from '../src/services/images/recipeImages';
import { useManaTheme } from '../src/theme/useManaTheme';

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useManaTheme();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getRecipe(id).then((result) => { if (active) setRecipe(result); }).catch(() => Alert.alert(t('loadFailedTitle'), t('loadFailedBody'))).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, t]);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primaryText} /></View>;
  if (id && !recipe) return null;
  return <RecipeForm initialRecipe={recipe ?? undefined} saveLabel={t('saveRecipe')} onSave={async (nextRecipe) => {
    if (await hasDuplicateTitle(nextRecipe.title, nextRecipe.id) && !await confirmDuplicate(t('duplicateTitle'), t('duplicateBody'), t('cancel'), t('saveAnyway'))) return;
    await saveRecipeWithImage(nextRecipe, recipe?.imageUri ?? null);
    if (id) router.replace(`/recipe/${nextRecipe.id}`);
    else router.dismissTo('/(tabs)');
  }} />;
}
