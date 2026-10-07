import { describe, expect, it } from 'vitest';
import { parseNutritionEstimate } from '../services/ai/schemas';
import { parseIngredientLine } from './ingredientText';
import { isNutritionFresh, nutritionFingerprint, nutritionInput, roundKcal } from './nutrition';
import type { Recipe } from './recipe';

const recipe: Recipe = {
  id: 'pasta', title: 'Pasta al pomodoro', description: null, sourceLanguage: 'it', outputLanguage: 'it', sourceUrl: null, sourceName: null,
  imageUri: null, servings: 4, preparationTime: null, cookingTime: null, totalTime: null,
  ingredients: [parseIngredientLine('400 g di spaghetti'), parseIngredientLine('2 cucchiai di olio'), parseIngredientLine('sale q.b.')],
  steps: [], category: 'pasta-rice', tags: [], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('calorie estimates', () => {
  it('sends only the ingredient lines and servings', () => {
    expect(nutritionInput(recipe)).toEqual({ servings: 4, ingredients: ['400 g di spaghetti', '2 cucchiai di olio', 'sale q.b.'] });
  });

  it('stays valid after a photo, favorite or rating, and goes stale when ingredients or servings change', () => {
    const fingerprint = nutritionFingerprint(recipe);
    expect(nutritionFingerprint({ ...recipe, favorite: true, rating: 5, imageUri: 'file:///x.jpg', title: 'Altro' })).toBe(fingerprint);
    expect(nutritionFingerprint({ ...recipe, servings: 2 })).not.toBe(fingerprint);
    expect(nutritionFingerprint({ ...recipe, ingredients: [...recipe.ingredients, parseIngredientLine('50 g di parmigiano')] })).not.toBe(fingerprint);
  });

  it('accepts a plausible estimate and rejects implausible ones', () => {
    const estimate = parseNutritionEstimate(recipe, 'it', { kcalPerServing: 452.6, servings: 4, servingsEstimated: false, confidence: 'high', note: '' });
    expect(estimate).toMatchObject({ recipeId: 'pasta', kcalPerServing: 452.6, note: null, language: 'it' });
    expect(isNutritionFresh(recipe, estimate)).toBe(true);
    expect(isNutritionFresh({ ...recipe, servings: 6 }, estimate)).toBe(false);
    expect(parseNutritionEstimate(recipe, 'it', { kcalPerServing: -5, servings: 4, servingsEstimated: false, confidence: 'high', note: null })).toBeNull();
    expect(parseNutritionEstimate(recipe, 'it', { kcalPerServing: 50_000, servings: 4, servingsEstimated: false, confidence: 'high', note: null })).toBeNull();
    expect(parseNutritionEstimate(recipe, 'it', { kcalPerServing: 400, servings: 4, servingsEstimated: false, confidence: 'certain', note: null })).toBeNull();
  });

  it('keeps "no estimate possible" so the recipe is not sent again', () => {
    const none = parseNutritionEstimate(recipe, 'en', { kcalPerServing: null, servings: null, servingsEstimated: false, confidence: 'low', note: 'No amounts given.' });
    expect(none).toMatchObject({ kcalPerServing: null, confidence: 'low' });
    expect(isNutritionFresh(recipe, none)).toBe(true);
  });

  it('rounds to 10 kcal', () => {
    expect(roundKcal(452.6)).toBe(450);
    expect(roundKcal(455)).toBe(460);
    expect(roundKcal(2)).toBe(10);
  });
});
