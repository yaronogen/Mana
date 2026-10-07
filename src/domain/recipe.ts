/** The app's interface and recipe languages. Hebrew is the only right-to-left one. */
export const APP_LANGUAGES = ['en', 'de', 'he', 'nl', 'es', 'it', 'fr', 'pl'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export const isAppLanguage = (value: unknown): value is AppLanguage => typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);

/** Each language in its own name, for the language pickers. */
export const LANGUAGE_NATIVE_NAMES: Record<AppLanguage, string> = {
  en: 'English', de: 'Deutsch', he: 'עברית', nl: 'Nederlands', es: 'Español', it: 'Italiano', fr: 'Français', pl: 'Polski',
};

export type RecipeCategory =
  | 'starters'
  | 'soups'
  | 'salads'
  | 'main-courses'
  | 'side-dishes'
  | 'pasta-rice'
  | 'breakfast'
  | 'baking'
  | 'desserts'
  | 'snacks'
  | 'sauces-dips'
  | 'drinks'
  | 'other';

export type Ingredient = {
  id: string;
  originalText: string | null;
  quantityText: string | null;
  quantityValue: number | null;
  unit: string | null;
  ingredient: string;
  preparation: string | null;
  isOptional: boolean;
};

export type RecipeStep = {
  id: string;
  text: string;
};

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  sourceLanguage: string | null;
  outputLanguage: AppLanguage;
  sourceUrl: string | null;
  sourceName: string | null;
  /** Local file URI (or remote URL until saved) of the dish photo. */
  imageUri: string | null;
  servings: number | null;
  preparationTime: number | null;
  cookingTime: number | null;
  totalTime: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  category: RecipeCategory;
  tags: string[];
  notes: string[];
  warnings: string[];
  favorite: boolean;
  /** Latest personal rating (1–5) from the cooked log; owned by the database, not by edits. */
  rating: number | null;
  lastCookedAt: string | null;
  cookCount: number;
  createdAt: string;
  updatedAt: string;
};

export const RECIPE_CATEGORIES = [
  'starters', 'soups', 'salads', 'main-courses', 'side-dishes', 'pasta-rice',
  'breakfast', 'baking', 'desserts', 'snacks', 'sauces-dips', 'drinks', 'other',
] as const satisfies readonly RecipeCategory[];

export type CookLogEntry = { id: string; recipeId: string; cookedAt: string; rating: number | null; note: string | null };

export const NEW_RECIPE_STATS = { rating: null, lastCookedAt: null, cookCount: 0 } as const;

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
