import { z } from 'zod';
import { createId, NEW_RECIPE_STATS, type Recipe, type RecipeCategory } from '../../domain/recipe';
import { recipeDraftSchema } from '../ai/schemas';

/**
 * A recipe sent from one Mana user to another through a share link. Only the recipe itself travels:
 * the sender's favorite, rating, cook log and photos stored on the phone stay on the sender's device.
 */
export const sharedRecipeSchema = recipeDraftSchema.extend({ outputLanguage: z.enum(['en', 'de', 'he']) });
export type SharedRecipe = z.infer<typeof sharedRecipeSchema>;

/** Public page that opens a share link in the app (or points to the store when Mana is not installed). */
export const SHARE_PAGE_URL = 'https://yaronogen.github.io/Mana/r/';
export const SHARE_CODE = /^[A-Za-z0-9]{10}$/;

export const shareLink = (code: string) => `${SHARE_PAGE_URL}?c=${code}`;

/** The recipe as uploaded for sharing. A web photo goes along as its link; a photo stored on the phone does not. */
export function toSharedRecipe(recipe: Recipe): SharedRecipe {
  return {
    title: recipe.title, description: recipe.description, sourceLanguage: recipe.sourceLanguage ?? recipe.outputLanguage, outputLanguage: recipe.outputLanguage,
    sourceUrl: recipe.sourceUrl, sourceName: recipe.sourceName, imageUrl: recipe.imageUri && /^https:\/\//i.test(recipe.imageUri) ? recipe.imageUri : null,
    servings: recipe.servings, preparationTime: recipe.preparationTime, cookingTime: recipe.cookingTime, totalTime: recipe.totalTime,
    ingredients: recipe.ingredients.map(({ id: _id, ...ingredient }) => ingredient),
    steps: recipe.steps.map((step) => ({ text: step.text })),
    category: recipe.category, tags: recipe.tags, notes: recipe.notes, warnings: recipe.warnings,
  };
}

/** A received shared recipe as a new, unsaved recipe of the recipient's; null when the payload is not a valid recipe. */
export function fromSharedRecipe(payload: unknown, now = new Date()): Recipe | null {
  const parsed = sharedRecipeSchema.safeParse(payload);
  if (!parsed.success) return null;
  const { imageUrl, ...fields } = parsed.data;
  const timestamp = now.toISOString();
  return {
    ...fields,
    id: createId(),
    imageUri: imageUrl ?? null,
    category: fields.category as RecipeCategory,
    ingredients: fields.ingredients.map((item) => ({ ...item, id: createId() })),
    steps: fields.steps.map((step) => ({ ...step, id: createId() })),
    favorite: false,
    ...NEW_RECIPE_STATS,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
