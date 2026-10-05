import type { AppLanguage, Recipe } from '../../domain/recipe';
import { translatableContent, type RecipeTranslation } from '../../domain/recipeTranslation';
import { parseRecipeTranslation } from './schemas';
import { ensureAnonymousSession, supabase } from './supabaseClient';

export class RecipeTranslationError extends Error {
  constructor(public readonly code: 'not_configured' | 'network' | 'invalid_response' | 'limit_reached') {
    super(code);
    this.name = 'RecipeTranslationError';
  }
}

/** Asks the authenticated recipe service to translate a saved recipe's wording. Quantities stay with the app. */
export async function translateRecipe(recipe: Recipe, language: AppLanguage): Promise<RecipeTranslation> {
  if (!supabase) throw new RecipeTranslationError('not_configured');
  let payload: unknown;
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body: { action: 'translate', targetLanguage: language, content: translatableContent(recipe) } });
    if (result.error) {
      const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
        ? Number(result.error.context.status) : undefined;
      throw new RecipeTranslationError(status === 429 ? 'limit_reached' : 'network');
    }
    payload = result.data;
  } catch (error) {
    if (error instanceof RecipeTranslationError) throw error;
    throw new RecipeTranslationError('network');
  }
  const translation = parseRecipeTranslation(recipe, language, payload);
  if (!translation) throw new RecipeTranslationError('invalid_response');
  return translation;
}
