import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { usableClarifications, type Clarification } from '../../domain/clarifications';
import type { AppLanguage, Recipe } from '../../domain/recipe';
import { RecipeImportError, recipeFromDraft } from './recipeParser';
import { photoRecipeSchema } from './schemas';
import { ensureAnonymousSession, supabase } from './supabaseClient';

export const MAX_RECIPE_PHOTOS = 3;
/** Longest side sent to the recipe service: sharp enough for handwriting, small enough to upload quickly. */
const MAX_SIDE = 1600;

export type RecipePhoto = { uri: string; width: number; height: number };

/** Shrinks a photo to MAX_SIDE and returns it as base64 JPEG. Photos are only read, never stored on the server. */
async function preparePhoto(photo: RecipePhoto): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_SIDE) context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new RecipeImportError('invalid_response');
  return result.base64;
}

/**
 * Reads a recipe from 1–3 photos of a written or printed recipe (any of the app languages, old ones included)
 * and returns it in `targetLanguage`, with questions about anything the reader couldn't make out. One import.
 */
export async function parseRecipePhotos(photos: RecipePhoto[], targetLanguage: AppLanguage): Promise<{ recipe: Recipe; clarifications: Clarification[] }> {
  if (!photos.length) throw new RecipeImportError('no_recipe');
  if (!supabase) throw new RecipeImportError('not_configured');
  let images: string[];
  try {
    images = await Promise.all(photos.slice(0, MAX_RECIPE_PHOTOS).map(preparePhoto));
  } catch {
    throw new RecipeImportError('invalid_response');
  }

  let payload: unknown;
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', {
      body: { action: 'photo', targetLanguage, images: images.map((data) => ({ mediaType: 'image/jpeg', data })) },
    });
    if (result.error) {
      const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
        ? Number(result.error.context.status) : undefined;
      if (status === 422) throw new RecipeImportError('no_recipe');
      if (status === 413) throw new RecipeImportError('too_long');
      if (status === 429) throw new RecipeImportError('rate_limited');
      throw new RecipeImportError('network');
    }
    payload = result.data;
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError('network');
  }

  const parsed = photoRecipeSchema.safeParse(payload);
  if (!parsed.success) throw new RecipeImportError('invalid_response');
  const { clarifications, ...draft } = parsed.data;
  const recipe = recipeFromDraft(draft, targetLanguage);
  return { recipe, clarifications: usableClarifications(clarifications, { ingredients: recipe.ingredients.length, steps: recipe.steps.length }) };
}
