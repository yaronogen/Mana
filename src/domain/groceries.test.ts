import { describe, expect, it } from 'vitest';
import { defaultGrocerySelection, formatGroceryShare, groceryItemsFromRecipe, groupGroceries, manualGroceryItem, type GroceryItem } from './groceries';
import { parseIngredientLine } from './ingredientText';
import type { Recipe } from './recipe';

const optionalParsley = { ...parseIngredientLine('1 Bund Petersilie'), isOptional: true };
const recipe: Recipe = {
  id: 'shakshuka', title: 'שקשוקה', description: null, sourceLanguage: 'he', outputLanguage: 'he',
  sourceUrl: null, sourceName: null, imageUri: null, servings: 2, preparationTime: null, cookingTime: null, totalTime: null,
  ingredients: [parseIngredientLine('4 ביצים'), parseIngredientLine('400–450 g tomatoes'), parseIngredientLine('½ EL Olivenöl'), optionalParsley],
  steps: [], category: 'breakfast', tags: [], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const item = (overrides: Partial<GroceryItem>): GroceryItem => ({
  id: Math.random().toString(36), text: 'x', recipeId: null, recipeTitle: null, checked: false, createdAt: '2026-01-01T00:00:00.000Z', ...overrides,
});

describe('groceries', () => {
  it('preselects every ingredient except optional ones', () => {
    const selection = defaultGrocerySelection(recipe.ingredients);
    expect(selection.size).toBe(3);
    expect(selection.has(optionalParsley.id)).toBe(false);
  });

  it('copies the chosen ingredients with their quantities, ranges and units untouched', () => {
    const chosen = [recipe.ingredients[1].id, recipe.ingredients[2].id, optionalParsley.id];
    const items = groceryItemsFromRecipe(recipe, chosen, { optionalLabel: 'אופציונלי', now: new Date('2026-02-01T10:00:00.000Z') });
    expect(items.map((entry) => entry.text)).toEqual(['400–450 g tomatoes', '½ EL Olivenöl', '1 Bund Petersilie (אופציונלי)']);
    expect(items.every((entry) => entry.recipeId === 'shakshuka' && entry.recipeTitle === 'שקשוקה' && !entry.checked)).toBe(true);
    expect(items[0].createdAt < items[1].createdAt).toBe(true);
  });

  it('adds converted amounts with the recipe amount alongside', () => {
    const items = groceryItemsFromRecipe(recipe, [recipe.ingredients[1].id, recipe.ingredients[0].id], { unitSystem: 'us' });
    expect(items.map((entry) => entry.text)).toEqual(['4 ביצים', '14–16 oz tomatoes (400–450 g)']);
  });

  it('ignores blank manual items', () => {
    expect(manualGroceryItem('   ')).toBeNull();
    expect(manualGroceryItem('  Milch ')?.text).toBe('Milch');
  });

  it('groups by recipe with own items first and checked items last', () => {
    const groups = groupGroceries([
      item({ text: 'eggs', recipeId: 'a', recipeTitle: 'A', checked: true, createdAt: '2026-01-01T00:00:01.000Z' }),
      item({ text: 'flour', recipeId: 'a', recipeTitle: 'A', createdAt: '2026-01-01T00:00:02.000Z' }),
      item({ text: 'milk', createdAt: '2026-01-02T00:00:00.000Z' }),
      item({ text: 'rice', recipeId: 'b', recipeTitle: 'B', createdAt: '2026-01-01T00:00:03.000Z' }),
    ]);
    expect(groups.map((group) => group.recipeTitle)).toEqual([null, 'A', 'B']);
    expect(groups[1].items.map((entry) => entry.text)).toEqual(['flour', 'eggs']);
  });

  it('shares only what is still to buy', () => {
    const text = formatGroceryShare([
      item({ text: '200 g Mehl', recipeId: 'a', recipeTitle: 'Kuchen' }),
      item({ text: '2 eggs', recipeId: 'a', recipeTitle: 'Kuchen', checked: true }),
      item({ text: 'חלב' }),
    ], { title: 'Einkaufsliste', myItems: 'Meine Artikel' });
    expect(text).toBe('🛒 Einkaufsliste\n\nMeine Artikel\n☐ חלב\n\nKuchen\n☐ 200 g Mehl');
  });
});
