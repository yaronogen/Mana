import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirmDuplicate } from '../src/components/confirmDuplicate';
import { RecipeForm } from '../src/components/RecipeForm';
import { hasDuplicateTitle } from '../src/data/duplicates';
import { saveRecipeWithImage } from '../src/services/images/recipeImages';
import { useImportDraft } from '../src/stores/importDraft';

export default function ImportReviewScreen() {
  const recipe = useImportDraft((state) => state.draft);
  const setDraft = useImportDraft((state) => state.setDraft);
  const { t } = useTranslation();
  const router = useRouter();
  if (!recipe) return <Redirect href="/add" />;
  return <RecipeForm initialRecipe={recipe} pageTitle={t('reviewRecipe')} saveLabel={t('saveRecipe')} onSave={async (updatedRecipe) => {
    if (await hasDuplicateTitle(updatedRecipe.title, updatedRecipe.id) && !await confirmDuplicate(t('duplicateTitle'), t('duplicateBody'), t('cancel'), t('saveAnyway'))) return;
    await saveRecipeWithImage(updatedRecipe, null);
    setDraft(null);
    router.dismissTo('/(tabs)');
  }} />;
}
