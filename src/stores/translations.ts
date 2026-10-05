import { create } from 'zustand';
import { getRecipes, getTranslations, saveTranslation } from '../data/database';
import type { AppLanguage, Recipe } from '../domain/recipe';
import { isTranslationFresh, needsTranslation } from '../domain/recipeTranslation';
import { RecipeTranslationError, translateRecipe } from '../services/ai/recipeTranslator';

export type TranslationStatus = 'idle' | 'working' | 'unavailable' | 'offline' | 'limit';

type TranslationsState = {
  /** Bumped whenever a translation is saved, so screens reload what they show. */
  version: number;
  status: TranslationStatus;
  pending: Record<string, boolean>;
  /** Translates every saved recipe that is in another language and has no fresh translation yet. */
  translateCookbook: (language: AppLanguage) => Promise<void>;
  /** Translates one recipe now (e.g. when it is opened, or after it was edited). */
  translateOne: (recipe: Recipe, language: AppLanguage) => Promise<void>;
};

// Only the most recent language request runs; switching language again stops the earlier pass.
let activeLanguage: AppLanguage | null = null;
let queue: Promise<void> = Promise.resolve();

export const useTranslations = create<TranslationsState>((set, get) => {
  const run = async (recipe: Recipe, language: AppLanguage) => {
    if (activeLanguage !== language || get().pending[recipe.id]) return;
    set((state) => ({ status: 'working', pending: { ...state.pending, [recipe.id]: true } }));
    try {
      await saveTranslation(await translateRecipe(recipe, language));
      set((state) => ({ version: state.version + 1, status: 'idle' }));
    } catch (error) {
      const code = error instanceof RecipeTranslationError ? error.code : 'network';
      set({ status: code === 'not_configured' ? 'unavailable' : code === 'limit_reached' ? 'limit' : code === 'network' ? 'offline' : 'idle' });
      // Without a service, connection or allowance, the rest of the pass would fail the same way.
      if (code !== 'invalid_response') activeLanguage = null;
    } finally {
      set((state) => {
        const { [recipe.id]: _done, ...rest } = state.pending;
        return { pending: rest };
      });
    }
  };
  // Translations run one after another to keep the device and the service calm.
  const enqueue = (task: () => Promise<void>) => { queue = queue.then(task, task); return queue; };

  return {
    version: 0, status: 'idle', pending: {},
    translateCookbook: async (language) => {
      activeLanguage = language;
      set({ status: 'idle' });
      const [recipes, translations] = await Promise.all([getRecipes(), getTranslations(language)]);
      const cached = new Map(translations.map((item) => [item.recipeId, item]));
      const todo = recipes.filter((recipe) => needsTranslation(recipe, language) && !isTranslationFresh(recipe, cached.get(recipe.id)));
      await Promise.all(todo.map((recipe) => enqueue(() => run(recipe, language))));
    },
    translateOne: async (recipe, language) => {
      if (!needsTranslation(recipe, language)) return;
      activeLanguage = language;
      await enqueue(() => run(recipe, language));
    },
  };
});
