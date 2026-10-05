import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from './ingredientText';
import type { Recipe } from './recipe';
import { applyTranslation, isTranslationFresh, needsTranslation, recipeFingerprint, translatableContent, type RecipeTranslation } from './recipeTranslation';

const recipe: Recipe = {
  id: 'r1', title: 'שקשוקה', description: 'ארוחת בוקר חמה', sourceLanguage: 'he', outputLanguage: 'he',
  sourceUrl: null, sourceName: null, imageUri: null, servings: 2, preparationTime: 10, cookingTime: 20, totalTime: 30,
  ingredients: [parseIngredientLine('4 ביצים'), parseIngredientLine('2 כוסות רסק עגבניות')],
  steps: [{ id: 's1', text: 'מחממים מחבת.' }, { id: 's2', text: 'אופים ב-180°C.' }],
  category: 'breakfast', tags: ['צמחוני'], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const translation: RecipeTranslation = {
  recipeId: 'r1', language: 'en', sourceFingerprint: recipeFingerprint(recipe),
  title: 'Shakshuka', description: 'A warm breakfast',
  ingredients: [{ ingredient: 'eggs', preparation: null, unit: null }, { ingredient: 'tomato purée', preparation: null, unit: 'cups' }],
  steps: ['Heat a pan.', 'Bake at 180°C.'], tags: ['vegetarian'], notes: [], warnings: [],
};

describe('recipe translations', () => {
  it('shows translated wording while keeping ids, quantities and stats', () => {
    const shown = applyTranslation(recipe, translation);
    expect(shown.title).toBe('Shakshuka');
    expect(shown.outputLanguage).toBe('en');
    expect(shown.ingredients[1]).toMatchObject({ id: recipe.ingredients[1].id, quantityText: '2', unit: 'cups', ingredient: 'tomato purée' });
    expect(shown.steps.map((step) => step.id)).toEqual(['s1', 's2']);
    expect(shown.servings).toBe(2);
  });

  it('ignores a translation once the recipe wording changed', () => {
    const edited = { ...recipe, steps: [...recipe.steps, { id: 's3', text: 'מגישים.' }] };
    expect(isTranslationFresh(edited, translation)).toBe(false);
    expect(applyTranslation(edited, translation)).toBe(edited);
  });

  it('keeps a translation valid when only favorites, photos or dates change', () => {
    const touched = { ...recipe, favorite: true, imageUri: 'file://photo.jpg', updatedAt: '2026-03-01T00:00:00.000Z' };
    expect(isTranslationFresh(touched, translation)).toBe(true);
  });

  it('only translates recipes saved in another language', () => {
    expect(needsTranslation(recipe, 'en')).toBe(true);
    expect(needsTranslation(recipe, 'he')).toBe(false);
    expect(translatableContent(recipe).ingredients).toHaveLength(2);
  });
});
