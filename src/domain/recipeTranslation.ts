import type { AppLanguage, Recipe } from './recipe';

/**
 * A saved recipe's wording in another app language. The saved recipe itself is never overwritten:
 * translations are cached beside it and shown in its place while the app uses that language.
 * Arrays follow the recipe's own order; quantities, times and temperatures are never part of it.
 */
export type RecipeTranslationContent = {
  title: string;
  description: string | null;
  ingredients: { ingredient: string; preparation: string | null; unit: string | null }[];
  steps: string[];
  tags: string[];
  notes: string[];
  warnings: string[];
};

export type RecipeTranslation = RecipeTranslationContent & {
  recipeId: string;
  language: AppLanguage;
  /** Fingerprint of the recipe wording it was made from; an edit makes the translation stale. */
  sourceFingerprint: string;
};

/** The translatable wording of a recipe, as sent to the translation service. */
export function translatableContent(recipe: Recipe): RecipeTranslationContent {
  return {
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients.map((item) => ({ ingredient: item.ingredient, preparation: item.preparation, unit: item.unit })),
    steps: recipe.steps.map((step) => step.text),
    tags: recipe.tags,
    notes: recipe.notes,
    warnings: recipe.warnings,
  };
}

/** Stable short hash of the wording (and quantities), so favoriting or a new photo keeps a translation valid. */
export function recipeFingerprint(recipe: Recipe): string {
  const source = JSON.stringify([recipe.outputLanguage, translatableContent(recipe), recipe.ingredients.map((item) => item.quantityText)]);
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) hash = ((hash * 33) ^ source.charCodeAt(index)) >>> 0;
  return `${source.length.toString(36)}-${hash.toString(36)}`;
}

export function needsTranslation(recipe: Recipe, language: AppLanguage): boolean {
  return recipe.outputLanguage !== language;
}

export function isTranslationFresh(recipe: Recipe, translation: RecipeTranslation | null | undefined): translation is RecipeTranslation {
  return !!translation && translation.recipeId === recipe.id && translation.sourceFingerprint === recipeFingerprint(recipe)
    && translation.ingredients.length === recipe.ingredients.length && translation.steps.length === recipe.steps.length;
}

/** The recipe as shown in `translation.language`: same ids, quantities and stats, translated wording. */
export function applyTranslation(recipe: Recipe, translation: RecipeTranslation | null | undefined): Recipe {
  if (!isTranslationFresh(recipe, translation)) return recipe;
  return {
    ...recipe,
    outputLanguage: translation.language,
    title: translation.title,
    description: translation.description,
    ingredients: recipe.ingredients.map((item, index) => ({ ...item, ...translation.ingredients[index] })),
    steps: recipe.steps.map((step, index) => ({ ...step, text: translation.steps[index] })),
    tags: translation.tags,
    notes: translation.notes,
    warnings: translation.warnings,
  };
}
