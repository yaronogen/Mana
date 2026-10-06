import { createId, NEW_RECIPE_STATS, type AppLanguage, type Recipe, type RecipeCategory } from '../../domain/recipe';
import { extractRecipeUrl, instagramPostCode } from '../import/webRecipe';
import { recipeFromWebRecipe, webRecipeSchema } from '../import/webRecipeDraft';
import { recipeDraftSchema } from './schemas';
import { ensureAnonymousSession, supabase } from './supabaseClient';

export class RecipeImportError extends Error {
  constructor(public readonly code: 'not_configured' | 'no_recipe' | 'instagram_caption' | 'network' | 'invalid_response' | 'too_long' | 'rate_limited' | 'page_unavailable') {
    super(code);
    this.name = 'RecipeImportError';
  }
}

const MAX_IMPORT_CHARACTERS = 30_000;

/** Imports pasted recipe text, or a single pasted web link that the recipe service reads server-side. */
export async function parseRecipeText(text: string, targetLanguage: AppLanguage): Promise<Recipe> {
  const sourceText = text.trim();
  if (!sourceText) throw new RecipeImportError('no_recipe');
  if (sourceText.length > MAX_IMPORT_CHARACTERS) throw new RecipeImportError('too_long');
  const url = extractRecipeUrl(sourceText);

  if (!supabase) throw new RecipeImportError('not_configured');

  let payload: unknown;
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body: url ? { url, targetLanguage } : { text: sourceText, targetLanguage } });
    if (result.error) {
      const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
        ? Number(result.error.context.status) : undefined;
      // For an Instagram link this means the caption could not be read (private post, blocked page) or has no recipe.
      if (status === 422) throw new RecipeImportError(url && instagramPostCode(url) ? 'instagram_caption' : 'no_recipe');
      if (status === 413) throw new RecipeImportError('too_long');
      if (status === 429) throw new RecipeImportError('rate_limited');
      if (status === 424 || (url && status === 400)) throw new RecipeImportError('page_unavailable');
      throw new RecipeImportError('network');
    }
    payload = result.data;
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError('network');
  }

  if (payload && typeof payload === 'object' && 'source' in payload) {
    const source = webRecipeSchema.safeParse((payload as { source: unknown }).source);
    if (!source.success) throw new RecipeImportError('invalid_response');
    return recipeFromWebRecipe(source.data, targetLanguage);
  }

  let parsed: ReturnType<typeof recipeDraftSchema.parse>;
  try {
    parsed = recipeDraftSchema.parse(payload);
  } catch {
    throw new RecipeImportError('invalid_response');
  }

  const now = new Date().toISOString();
  const { imageUrl, ...fields } = parsed;
  return {
    ...fields,
    imageUri: imageUrl ?? null,
    id: createId(),
    outputLanguage: targetLanguage,
    category: parsed.category as RecipeCategory,
    ingredients: parsed.ingredients.map((item) => ({ ...item, id: createId() })),
    steps: parsed.steps.map((step) => ({ ...step, id: createId() })),
    favorite: false,
    ...NEW_RECIPE_STATS,
    createdAt: now,
    updatedAt: now,
  };
}
