import { describe, expect, it } from 'vitest';
import { mealSuggestions, mealTimeFor } from './mealTime';
import type { Recipe, RecipeCategory } from './recipe';

const recipe = (id: string, category: RecipeCategory, extra: Partial<Recipe> = {}): Recipe => ({
  id, title: id, description: null, sourceLanguage: 'en', outputLanguage: 'en', sourceUrl: null, sourceName: null, imageUri: null,
  servings: null, preparationTime: null, cookingTime: null, totalTime: null, ingredients: [], steps: [], category,
  tags: [], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', ...extra,
});

describe('meal time', () => {
  it('maps local hours to meals at the boundaries', () => {
    expect([4, 5, 10, 11, 14, 15, 17, 18, 21, 22, 0].map(mealTimeFor)).toEqual([
      'lateNight', 'breakfast', 'breakfast', 'lunch', 'lunch', 'afternoon', 'afternoon', 'dinner', 'dinner', 'lateNight', 'lateNight',
    ]);
  });

  it('suggests fitting recipes first: favorites, then best category, then newest', () => {
    const cookbook = [
      recipe('soup', 'soups'),
      recipe('cake', 'baking'),
      recipe('goulash', 'main-courses', { createdAt: '2026-10-02T10:00:00.000Z' }),
      recipe('pasta', 'pasta-rice', { favorite: true }),
      recipe('stew', 'main-courses'),
    ];
    const dinner = mealSuggestions(cookbook, 'dinner');
    expect(dinner.fallback).toBe(false);
    expect(dinner.recipes.map((item) => item.id)).toEqual(['pasta', 'goulash', 'stew', 'soup']);
  });

  it('personalizes the order: ratings, recently cooked, conflicts and favorite cuisines', () => {
    const now = new Date('2026-10-20T19:00:00.000Z');
    const cookbook = [
      recipe('loved', 'main-courses', { rating: 5, cookCount: 4, lastCookedAt: '2026-09-01T19:00:00.000Z' }),
      recipe('cookedYesterday', 'main-courses', { favorite: true, rating: 5, cookCount: 9, lastCookedAt: '2026-10-19T19:00:00.000Z' }),
      recipe('meh', 'main-courses', { rating: 2, cookCount: 1, lastCookedAt: '2026-08-01T19:00:00.000Z' }),
      recipe('nutty', 'main-courses'),
      recipe('pasta', 'pasta-rice'),
    ];
    const ranked = mealSuggestions(cookbook, 'dinner', {
      now, conflicts: (item) => item.id === 'nutty', favoriteCuisine: (item) => item.id === 'pasta',
    }).recipes.map((item) => item.id);
    expect(ranked).toEqual(['loved', 'pasta', 'cookedYesterday', 'meh', 'nutty']);
  });

  it('falls back to the whole cookbook when nothing fits the meal', () => {
    const result = mealSuggestions([recipe('goulash', 'main-courses'), recipe('salad', 'salads', { favorite: true })], 'breakfast');
    expect(result.fallback).toBe(true);
    expect(result.recipes.map((item) => item.id)).toEqual(['salad', 'goulash']);
    expect(mealSuggestions([], 'dinner')).toEqual({ recipes: [], fallback: true });
  });
});
