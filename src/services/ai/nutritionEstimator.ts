import { nutritionInput, type NutritionEstimate } from '../../domain/nutrition';
import type { AppLanguage, Recipe } from '../../domain/recipe';
import { parseNutritionEstimate } from './schemas';
import { ensureAnonymousSession, supabase } from './supabaseClient';

export class NutritionEstimateError extends Error {
  constructor(public readonly code: 'not_configured' | 'network' | 'invalid_response' | 'limit_reached') {
    super(code);
    this.name = 'NutritionEstimateError';
  }
}

/**
 * Asks the recipe service for a calorie estimate per serving. Only the ingredient lines and the servings
 * are sent; the note comes back in `language`. Never counts as an import.
 */
export async function estimateNutrition(recipe: Recipe, language: AppLanguage): Promise<NutritionEstimate> {
  if (!supabase) throw new NutritionEstimateError('not_configured');
  let payload: unknown;
  try {
    await ensureAnonymousSession();
    const result = await supabase.functions.invoke('recipe-process', { body: { action: 'nutrition', targetLanguage: language, content: nutritionInput(recipe) } });
    if (result.error) {
      const status = typeof result.error.context === 'object' && result.error.context !== null && 'status' in result.error.context
        ? Number(result.error.context.status) : undefined;
      throw new NutritionEstimateError(status === 429 ? 'limit_reached' : 'network');
    }
    payload = result.data;
  } catch (error) {
    if (error instanceof NutritionEstimateError) throw error;
    throw new NutritionEstimateError('network');
  }
  const estimate = parseNutritionEstimate(recipe, language, payload);
  if (!estimate) throw new NutritionEstimateError('invalid_response');
  return estimate;
}
