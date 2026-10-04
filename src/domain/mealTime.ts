import type { Recipe, RecipeCategory } from './recipe';

export type MealTime = 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'lateNight';

/** Meal for a local hour (0–23). */
export function mealTimeFor(hour: number): MealTime {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'lateNight';
}

/** Categories that suit each meal, most fitting first. */
export const MEAL_CATEGORIES: Record<MealTime, RecipeCategory[]> = {
  breakfast: ['breakfast', 'baking'],
  lunch: ['salads', 'soups', 'pasta-rice', 'main-courses'],
  afternoon: ['baking', 'desserts', 'snacks', 'drinks'],
  dinner: ['main-courses', 'soups', 'pasta-rice', 'starters', 'side-dishes'],
  lateNight: ['snacks', 'desserts', 'drinks'],
};

export type SuggestionOptions = {
  now?: Date;
  /** True when the recipe conflicts with the user's allergies or diet. */
  conflicts?: (recipe: Recipe) => boolean;
  /** True when the recipe matches one of the user's favorite cuisines. */
  favoriteCuisine?: (recipe: Recipe) => boolean;
};

const RECENT_DAYS = 5;

/** How much the user is likely to want this recipe right now (higher is better). */
export function preferenceScore(recipe: Recipe, { now = new Date(), conflicts, favoriteCuisine }: SuggestionOptions = {}): number {
  const cookedRecently = recipe.lastCookedAt !== null && now.getTime() - new Date(recipe.lastCookedAt).getTime() < RECENT_DAYS * 86_400_000;
  return (recipe.favorite ? 3 : 0)
    + (recipe.rating !== null ? recipe.rating - 3 : 0)
    + (cookedRecently ? -4 : 0)
    + (recipe.cookCount === 0 ? 0.5 : 0)
    + (conflicts?.(recipe) ? -5 : 0)
    + (favoriteCuisine?.(recipe) ? 1 : 0);
}

/**
 * Recipes to suggest for a meal, best first: personal preference (favorites, ratings, not cooked lately,
 * no allergy/diet conflicts, favorite cuisines), then the most fitting category, then newest.
 * When nothing fits, falls back to the whole cookbook (same ordering minus category) and says so.
 */
export function mealSuggestions(recipes: Recipe[], meal: MealTime, options: SuggestionOptions = {}): { recipes: Recipe[]; fallback: boolean } {
  const fit = MEAL_CATEGORIES[meal];
  const score = new Map(recipes.map((recipe) => [recipe.id, preferenceScore(recipe, options)]));
  const byPreference = (rank: (recipe: Recipe) => number) => (a: Recipe, b: Recipe) =>
    (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt);
  const matches = recipes.filter((recipe) => fit.includes(recipe.category));
  if (matches.length) return { recipes: [...matches].sort(byPreference((recipe) => fit.indexOf(recipe.category))), fallback: false };
  return { recipes: [...recipes].sort(byPreference(() => 0)), fallback: true };
}
