import { formatIngredient } from './ingredientText';
import { createId, type Recipe } from './recipe';
import { convertIngredient, type UnitSystem } from './units';

/**
 * One line on the shopping list. `text` is the ingredient as the recipe wrote it (quantity, unit and all),
 * or converted to the user's units with the original amount kept alongside. Lines are never merged.
 * The recipe title is a snapshot so the line still reads well after the recipe is deleted.
 */
export type GroceryItem = {
  id: string;
  text: string;
  recipeId: string | null;
  recipeTitle: string | null;
  checked: boolean;
  createdAt: string;
};

export type GroceryGroup = { recipeId: string | null; recipeTitle: string | null; items: GroceryItem[] };

/** In a converted amount, the recipe's own amount follows in brackets: "7 oz flour (200 g)". */
export function groceryItemsFromRecipe(recipe: Recipe, ingredientIds: Iterable<string>, options: { optionalLabel?: string; unitSystem?: UnitSystem; now?: Date } = {}): GroceryItem[] {
  const { optionalLabel = 'optional', unitSystem = 'original', now = new Date() } = options;
  const wanted = new Set(ingredientIds);
  return recipe.ingredients
    .filter((ingredient) => wanted.has(ingredient.id))
    .map((ingredient, index) => {
      const converted = convertIngredient(ingredient, unitSystem, recipe.outputLanguage);
      const text = formatIngredient(converted.ingredient, optionalLabel);
      return {
        id: createId(),
        text: converted.original ? `${text} (${converted.original})` : text,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        checked: false,
        // Offset by index so the list keeps the recipe's ingredient order.
        createdAt: new Date(now.getTime() + index).toISOString(),
      };
    });
}

export function manualGroceryItem(text: string, now = new Date()): GroceryItem | null {
  const trimmed = text.trim();
  return trimmed ? { id: createId(), text: trimmed, recipeId: null, recipeTitle: null, checked: false, createdAt: now.toISOString() } : null;
}

/**
 * Groups items by the recipe they came from, in the order each recipe was first added; your own
 * items come first. Within a group, open items stay above checked ones.
 */
export function groupGroceries(items: GroceryItem[]): GroceryGroup[] {
  const groups = new Map<string, GroceryGroup>();
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const item of sorted) {
    const key = item.recipeId ?? '';
    const group = groups.get(key) ?? { recipeId: item.recipeId, recipeTitle: item.recipeTitle, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  const result = [...groups.values()].map((group) => ({ ...group, items: [...group.items].sort((a, b) => Number(a.checked) - Number(b.checked)) }));
  return result.sort((a, b) => Number(a.recipeId !== null) - Number(b.recipeId !== null));
}

/** Plain-text list of what is still to buy, for sharing to a messenger or notes app. */
export function formatGroceryShare(items: GroceryItem[], copy: { title: string; myItems: string }): string {
  const groups = groupGroceries(items.filter((item) => !item.checked));
  const sections = groups.map((group) => [group.recipeTitle ?? copy.myItems, ...group.items.map((item) => `☐ ${item.text}`)].join('\n'));
  return [`🛒 ${copy.title}`, ...sections].join('\n\n');
}
