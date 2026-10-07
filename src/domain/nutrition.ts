import type { AppLanguage, Recipe } from './recipe';
import { formatIngredient } from './ingredientText';

/**
 * An AI estimate of a recipe's calories per serving, made once from its ingredients and kept on the phone.
 * It is an orientation, not nutrition advice: the app always labels it as an estimate.
 */
export type NutritionEstimate = {
  recipeId: string;
  /** Fingerprint of the ingredients and servings it was made from; an edit makes it stale. */
  sourceFingerprint: string;
  /** Null when the ingredients give too little to estimate (no amounts); kept so Mana doesn't ask again. */
  kcalPerServing: number | null;
  /** Servings the estimate assumes; when the recipe gave none, the AI estimated them (servingsEstimated). */
  servings: number | null;
  servingsEstimated: boolean;
  confidence: 'low' | 'medium' | 'high';
  /** One short sentence in `language`, e.g. what was left out ("salt to taste"). */
  note: string | null;
  language: AppLanguage;
};

/** What the estimate is made from: the ingredient lines as saved, and the recipe's servings. */
export function nutritionInput(recipe: Pick<Recipe, 'ingredients' | 'servings'>): { servings: number | null; ingredients: string[] } {
  return { servings: recipe.servings, ingredients: recipe.ingredients.map((item) => formatIngredient(item)) };
}

/** Stable short hash of the ingredients and servings, so a new photo, favorite or rating keeps an estimate valid. */
export function nutritionFingerprint(recipe: Pick<Recipe, 'ingredients' | 'servings'>): string {
  const source = JSON.stringify(nutritionInput(recipe));
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 33) ^ source.charCodeAt(index)) >>> 0;
  return `${source.length.toString(36)}-${hash.toString(36)}`;
}

export function isNutritionFresh(recipe: Pick<Recipe, 'id' | 'ingredients' | 'servings'>, estimate: NutritionEstimate | null | undefined): estimate is NutritionEstimate {
  return !!estimate && estimate.recipeId === recipe.id && estimate.sourceFingerprint === nutritionFingerprint(recipe);
}

/** Calories are shown rounded to 10 kcal: the estimate is never more precise than that. */
export const roundKcal = (kcal: number) => Math.max(10, Math.round(kcal / 10) * 10);
