import { z } from 'zod';
import { parseIngredientLine } from '../../domain/ingredientText';
import { createId, NEW_RECIPE_STATS, RECIPE_CATEGORIES, type AppLanguage, type Recipe, type RecipeCategory } from '../../domain/recipe';
import { guessCategory, type WebRecipe } from './webRecipe';

const minutes = z.number().int().nonnegative().nullable();

/** Validates the structured page recipe the Edge Function returns when no translation is needed. */
export const webRecipeSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(800).nullable(),
  language: z.string().max(35).nullable(),
  servings: z.number().int().positive().nullable(),
  preparationTime: minutes, cookingTime: minutes, totalTime: minutes,
  ingredients: z.array(z.string().trim().min(1).max(300)).min(1).max(100),
  steps: z.array(z.string().trim().min(1).max(1500)).min(1).max(80),
  keywords: z.array(z.string().trim().min(1).max(40)).max(8),
  categoryHint: z.string().max(80).nullable(),
  sourceUrl: z.string().url(),
  sourceName: z.string().max(160).nullable(),
  imageUrl: z.string().url().max(2048).nullable().catch(null),
});

/** Turns a same-language page recipe into a reviewable draft without any model call. */
export function recipeFromWebRecipe(source: WebRecipe, outputLanguage: AppLanguage): Recipe {
  const category = guessCategory(source);
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: source.title,
    description: source.description,
    sourceLanguage: source.language,
    outputLanguage,
    sourceUrl: source.sourceUrl,
    sourceName: source.sourceName,
    imageUri: source.imageUrl,
    servings: source.servings,
    preparationTime: source.preparationTime,
    cookingTime: source.cookingTime,
    totalTime: source.totalTime,
    ingredients: source.ingredients.map(parseIngredientLine),
    steps: source.steps.map((text) => ({ id: createId(), text })),
    category: (RECIPE_CATEGORIES as readonly string[]).includes(category) ? category as RecipeCategory : 'other',
    tags: source.keywords.slice(0, 6),
    notes: [],
    warnings: [],
    favorite: false,
    ...NEW_RECIPE_STATS,
    createdAt: now,
    updatedAt: now,
  };
}
