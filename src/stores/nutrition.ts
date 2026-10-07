import { create } from 'zustand';
import { getNutrition, saveNutrition } from '../data/database';
import { isNutritionFresh, type NutritionEstimate } from '../domain/nutrition';
import type { AppLanguage, Recipe } from '../domain/recipe';
import { estimateNutrition, NutritionEstimateError } from '../services/ai/nutritionEstimator';

type NutritionState = {
  /** The latest known estimate per recipe id (from the phone, or just made). */
  estimates: Record<string, NutritionEstimate>;
  pending: Record<string, boolean>;
  /**
   * Shows the saved estimate, and makes one the first time a recipe is opened (or after its ingredients or
   * servings changed). Failures stay quiet: the recipe simply shows no calories, and the next open tries again.
   */
  ensure: (recipe: Recipe, language: AppLanguage) => Promise<void>;
};

let queue: Promise<void> = Promise.resolve();
// After the service said "no allowance left" or isn't set up, stop asking until the app restarts.
let paused = false;

export const useNutrition = create<NutritionState>((set, get) => ({
  estimates: {}, pending: {},
  ensure: async (recipe, language) => {
    const saved = await getNutrition(recipe.id).catch(() => null);
    if (saved) set((state) => ({ estimates: { ...state.estimates, [recipe.id]: saved } }));
    if (isNutritionFresh(recipe, saved) || paused || get().pending[recipe.id] || !recipe.ingredients.length) return;
    set((state) => ({ pending: { ...state.pending, [recipe.id]: true } }));
    const task = async () => {
      try {
        const estimate = await estimateNutrition(recipe, language);
        await saveNutrition(estimate);
        set((state) => ({ estimates: { ...state.estimates, [recipe.id]: estimate } }));
      } catch (error) {
        const code = error instanceof NutritionEstimateError ? error.code : 'network';
        if (code === 'limit_reached' || code === 'not_configured') paused = true;
      } finally {
        set((state) => {
          const { [recipe.id]: _done, ...rest } = state.pending;
          return { pending: rest };
        });
      }
    };
    // One estimate at a time keeps the device and the service calm.
    queue = queue.then(task, task);
    await queue;
  },
}));
