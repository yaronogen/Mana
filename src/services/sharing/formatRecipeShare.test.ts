import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from '../../domain/ingredientText';
import { createId, type Recipe } from '../../domain/recipe';
import { formatRecipeShare } from './formatRecipeShare';

const recipe: Recipe = {
  id: 'test', title: 'Roasted carrots', description: null, sourceLanguage: 'en', outputLanguage: 'he',
  sourceUrl: 'https://example.test/recipe', sourceName: 'Example', imageUri: null, servings: 4,
  preparationTime: 10, cookingTime: 25, totalTime: 35,
  ingredients: [parseIngredientLine('500 g carrots'), parseIngredientLine('1/2 tsp cumin')],
  steps: [{ id: createId(), text: 'Roast at 425°F (220°C) for 25 minutes.' }],
  category: 'side-dishes', tags: ['vegetarian'], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('formatRecipeShare', () => {
  it('shares the complete recipe with localized headings and original temperatures', () => {
    const text = formatRecipeShare(recipe);
    expect(text).toContain('מרכיבים');
    expect(text).toContain('אופן ההכנה');
    expect(text).toContain('500 g carrots');
    expect(text).toContain('425°F (220°C)');
    expect(text).toContain('שותף דרך Mana');
    expect(text).toContain('https://example.test/recipe');
  });
});
