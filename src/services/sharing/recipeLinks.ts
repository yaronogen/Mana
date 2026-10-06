import { applyTranslation } from '../../domain/recipeTranslation';
import type { AppLanguage, Recipe } from '../../domain/recipe';
import { translateRecipe } from '../ai/recipeTranslator';
import { ensureAnonymousSession, supabase } from '../ai/supabaseClient';
import { fromSharedRecipe, SHARE_CODE, shareLink, sharedRecipeSchema, toSharedRecipe } from './sharedRecipe';

export class RecipeLinkError extends Error {
  constructor(public readonly code: 'not_configured' | 'network' | 'invalid_recipe' | 'not_found' | 'rate_limited') {
    super(code);
    this.name = 'RecipeLinkError';
  }
}

async function invoke(body: Record<string, unknown>): Promise<unknown> {
  if (!supabase) throw new RecipeLinkError('not_configured');
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body });
    if (result.error) {
      const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
        ? Number(result.error.context.status) : undefined;
      throw new RecipeLinkError(status === 404 ? 'not_found' : status === 429 ? 'rate_limited' : status === 400 || status === 413 ? 'invalid_recipe' : 'network');
    }
    return result.data;
  } catch (error) {
    if (error instanceof RecipeLinkError) throw error;
    throw new RecipeLinkError('network');
  }
}

/** Uploads a copy of the recipe and returns a link another Mana user can open. */
export async function createRecipeLink(recipe: Recipe): Promise<string> {
  const shared = sharedRecipeSchema.safeParse(toSharedRecipe(recipe));
  if (!shared.success) throw new RecipeLinkError('invalid_recipe');
  const payload = await invoke({ action: 'share', recipe: shared.data });
  const code = payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : '';
  if (!SHARE_CODE.test(code)) throw new RecipeLinkError('network');
  return shareLink(code);
}

/**
 * Downloads a shared recipe as a new draft in the recipient's app language. When the translation is not
 * available right now, the draft keeps the sender's language and is translated for display after saving.
 */
export async function receiveSharedRecipe(code: string, language: AppLanguage): Promise<Recipe> {
  if (!SHARE_CODE.test(code)) throw new RecipeLinkError('not_found');
  const payload = await invoke({ action: 'receive', code });
  const recipe = fromSharedRecipe(payload && typeof payload === 'object' && 'recipe' in payload ? payload.recipe : null);
  if (!recipe) throw new RecipeLinkError('invalid_recipe');
  if (recipe.outputLanguage === language) return recipe;
  try {
    return applyTranslation(recipe, await translateRecipe(recipe, language));
  } catch {
    return recipe;
  }
}
