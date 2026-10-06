import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from '../../domain/ingredientText';
import type { Recipe } from '../../domain/recipe';
import { fromSharedRecipe, SHARE_CODE, shareLink, toSharedRecipe } from './sharedRecipe';

const recipe: Recipe = {
  id: 'local-id', title: 'שקשוקה', description: 'ארוחת בוקר קלאסית', sourceLanguage: 'he', outputLanguage: 'he',
  sourceUrl: 'https://example.com/shakshuka', sourceName: 'example.com', imageUri: 'file:///data/recipe-images/local-id.jpg',
  servings: 2, preparationTime: 10, cookingTime: 20, totalTime: null,
  ingredients: [parseIngredientLine('4 ביצים'), { ...parseIngredientLine('400–450 g tomatoes'), isOptional: true }],
  steps: [{ id: 's1', text: 'מחממים מחבת על 180°C.' }], category: 'breakfast', tags: ['מהיר'], notes: [], warnings: [],
  favorite: true, rating: 5, lastCookedAt: '2026-09-01T10:00:00.000Z', cookCount: 3,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('shared recipes', () => {
  it('sends the recipe but none of the sender\'s personal data or phone photos', () => {
    const shared = toSharedRecipe(recipe) as Record<string, unknown>;
    for (const key of ['id', 'favorite', 'rating', 'cookCount', 'lastCookedAt', 'createdAt', 'imageUri']) expect(shared).not.toHaveProperty(key);
    expect(shared.imageUrl).toBeNull();
    expect(toSharedRecipe({ ...recipe, imageUri: 'https://example.com/photo.jpg' }).imageUrl).toBe('https://example.com/photo.jpg');
  });

  it('arrives as a new recipe with quantities, ranges, temperatures and attribution untouched', () => {
    const received = fromSharedRecipe(JSON.parse(JSON.stringify(toSharedRecipe(recipe))), new Date('2026-10-07T08:00:00.000Z'));
    expect(received).not.toBeNull();
    expect(received!.id).not.toBe(recipe.id);
    expect(received!.outputLanguage).toBe('he');
    expect(received!.ingredients.map(({ id: _id, ...item }) => item)).toEqual(recipe.ingredients.map(({ id: _id, ...item }) => item));
    expect(received!.steps[0].text).toBe('מחממים מחבת על 180°C.');
    expect(received!.sourceUrl).toBe(recipe.sourceUrl);
    expect(received).toMatchObject({ favorite: false, rating: null, cookCount: 0, lastCookedAt: null, createdAt: '2026-10-07T08:00:00.000Z' });
  });

  it('rejects payloads that are not a valid recipe', () => {
    expect(fromSharedRecipe(null)).toBeNull();
    expect(fromSharedRecipe({ ...toSharedRecipe(recipe), outputLanguage: 'fr' })).toBeNull();
    expect(fromSharedRecipe({ ...toSharedRecipe(recipe), ingredients: [] })).toBeNull();
  });

  it('builds links with a ten-character code', () => {
    expect(shareLink('Ab12Cd34Ef')).toBe('https://yaronogen.github.io/Mana/r/?c=Ab12Cd34Ef');
    expect(SHARE_CODE.test('Ab12Cd34Ef')).toBe(true);
    expect(SHARE_CODE.test('../etc')).toBe(false);
  });
});
