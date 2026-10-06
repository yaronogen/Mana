import type { AppLanguage, Ingredient } from './recipe';
import { convertIngredient, decimal, fraction, lookupUnit, parseAmounts, roundTo, type UnitSystem } from './units';

/**
 * Display-time serving scaling ("Cooking for"). Saved recipes are never changed: only plainly numeric
 * amounts are multiplied, everything else ("a pinch", "salt to taste") stays exactly as written.
 */

/** How much to multiply amounts by to cook `target` servings of a recipe that makes `base`; 1 when unknown. */
export function servingsFactor(base: number | null, target: number | null): number {
  return base && target && base > 0 && target > 0 ? target / base : 1;
}

/** Metric amounts round like a kitchen scale; everything else (cups, spoons, pieces) to common fractions. */
function formatScaled(value: number, unit: string | null): { text: string; value: number } {
  const known = lookupUnit(unit);
  if (known?.system === 'metric') {
    if (known.factor >= 1000) {
      const rounded = roundTo(value, 0.05);
      return { text: decimal(rounded), value: rounded };
    }
    const rounded = roundTo(value, value < 20 ? 1 : value < 500 ? 5 : 10);
    return { text: String(rounded), value: rounded };
  }
  return Number.isInteger(value) ? { text: String(value), value } : fraction(value);
}

/** Multiplies one ingredient's amount (a single amount or a range) by `factor`. */
export function scaleIngredient(item: Ingredient, factor: number): Ingredient {
  if (factor === 1 || !item.quantityText) return item;
  const amounts = parseAmounts(item.quantityText);
  if (!amounts) return item;
  const scaled = amounts.map((amount) => formatScaled(amount * factor, item.unit));
  return { ...item, quantityText: scaled.map((entry) => entry.text).join('–'), quantityValue: scaled.length === 1 ? scaled[0].value : null };
}

export type DisplayedIngredient = { ingredient: Ingredient; original: string | null };

/**
 * An ingredient as shown: scaled to the chosen servings, then converted to the chosen units.
 * `original` is the recipe's own amount, set only when the shown amount differs from it.
 */
export function displayIngredient(stored: Ingredient, options: { factor: number; unitSystem: UnitSystem; language: AppLanguage }): DisplayedIngredient {
  const scaled = scaleIngredient(stored, options.factor);
  const converted = convertIngredient(scaled, options.unitSystem, options.language);
  if (scaled === stored) return converted;
  return { ingredient: converted.ingredient, original: [stored.quantityText, stored.unit].filter(Boolean).join(' ') };
}
