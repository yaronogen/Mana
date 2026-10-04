import { describe, expect, it } from 'vitest';
import { recipeDraftSchema } from './schemas';

const validDraft = {
  title: 'Lemon lentils', description: null, sourceLanguage: 'en', sourceUrl: null, sourceName: null,
  servings: 2, preparationTime: null, cookingTime: 12, totalTime: null,
  ingredients: [{ originalText: '200 g red lentils', quantityText: '200', quantityValue: 200, unit: 'g', ingredient: 'red lentils', preparation: null, isOptional: false }],
  steps: [{ text: 'Simmer for 12 minutes.' }], category: 'main-courses', tags: ['quick', 'vegetarian'], notes: [], warnings: [],
};

describe('AI recipe output schema', () => {
  it('accepts a fully structured recipe and keeps absent facts null', () => {
    const recipe = recipeDraftSchema.parse(validDraft);
    expect(recipe.preparationTime).toBeNull();
    expect(recipe.ingredients[0].quantityText).toBe('200');
    expect(recipe.ingredients[0].originalText).toBe('200 g red lentils');
  });

  it('rejects missing core recipe content and unsupported categories', () => {
    expect(recipeDraftSchema.safeParse({ ...validDraft, ingredients: [] }).success).toBe(false);
    expect(recipeDraftSchema.safeParse({ ...validDraft, category: 'miscellaneous' }).success).toBe(false);
  });
});
