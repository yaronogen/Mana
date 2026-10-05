import { createId, type Ingredient } from './recipe';
import { UNIT_ALIASES } from './unitAliases';

const UNITS = new Set(['g', 'kg', 'mg', 'ml', 'l', 'cl', 'dl', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'el', 'tl', 'prise', 'prisen', 'stück', 'stk', 'gramm', 'kilogramm', 'milliliter', 'teelöffel', 'esslöffel', 'כף', 'כפית', 'גרם', 'מ״ל', 'gr', 'gram', 'grams', 'kilo', 'kilogram', 'kilograms', 'ounce', 'ounces', 'pound', 'pounds', 'liter', 'liters', 'litre', 'litres', 'pint', 'pints', 'quart', 'quarts', 'pfund', 'liter', 'כוס', 'כוסות', 'כפות', 'כפיות', 'ק״ג', 'ליטר', ...Object.keys(UNIT_ALIASES)]);

function isUnit(word: string): boolean {
  return UNITS.has(word.toLocaleLowerCase().replace(/\.$/, ''));
}

/** "1½" → "1 ½", so mixed numbers written without a space parse like "1 ½". */
export function normalizeAmounts(text: string): string {
  return text.replace(/(\d)([½¼¾⅓⅔⅛⅜⅝⅞])/gu, '$1 $2');
}

/** Separates a unit typed straight after the number: "500g flour" → "500 g flour". */
function separateAttachedUnit(line: string): string {
  const attached = line.match(/^(\d+(?:[.,]\d+)?)(\p{L}+\.?)(\s.*)?$/u);
  return attached && isUnit(attached[2]) ? `${attached[1]} ${attached[2]}${attached[3] ?? ''}` : line;
}

const amountPattern = '(?:\\d+\\s+)?(?:\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|[½¼¾⅓⅔⅛⅜⅝⅞])';
const QUANTITY = new RegExp(`^(${amountPattern}(?:\\s*(?:-|–|to)\\s*${amountPattern})?)(?:\\s+([^\\s]+))?(?:\\s+(.+))?$`, 'u');

export function numericQuantity(value: string): number | null {
  const simple = value.trim().replace(',', '.');
  if (/^\d+(?:\.\d+)?$/.test(simple)) return Number(simple);
  const mixedFraction = simple.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFraction) {
    const denominator = Number(mixedFraction[3]);
    return denominator ? Number(mixedFraction[1]) + Number(mixedFraction[2]) / denominator : null;
  }
  const fraction = simple.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[3]);
    return denominator ? Number(fraction[1] ?? 0) + Number(fraction[2]) / denominator : null;
  }
  const glyphs: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  const wholeAndGlyph = simple.match(/^(\d+)\s*([½¼¾⅓⅔⅛⅜⅝⅞])$/u);
  if (wholeAndGlyph) return Number(wholeAndGlyph[1]) + glyphs[wholeAndGlyph[2]];
  if (glyphs[simple] !== undefined) return glyphs[simple];
  return null;
}

export function parseIngredientLine(raw: string): Ingredient {
  const line = raw.trim();
  const match = separateAttachedUnit(normalizeAmounts(line)).match(QUANTITY);
  if (!match) return { id: createId(), originalText: line, quantityText: null, quantityValue: null, unit: null, ingredient: line, preparation: null, isOptional: false };
  const unitCandidate = match[2];
  const hasUnit = unitCandidate !== undefined && isUnit(unitCandidate);
  const ingredient = hasUnit ? match[3] : [match[2], match[3]].filter(Boolean).join(' ');
  if (!ingredient) return { id: createId(), originalText: line, quantityText: null, quantityValue: null, unit: null, ingredient: line, preparation: null, isOptional: false };
  return {
    id: createId(), originalText: line, quantityText: match[1], quantityValue: /-|–|\bto\b/.test(match[1]) ? null : numericQuantity(match[1]),
    unit: hasUnit ? match[2] : null, ingredient: ingredient.trim(), preparation: null, isOptional: false,
  };
}

export function formatIngredient(item: Ingredient, optionalLabel = 'optional'): string {
  const quantityAndUnit = [item.quantityText, item.unit].filter(Boolean).join(' ');
  const body = [quantityAndUnit, item.ingredient, item.preparation].filter(Boolean).join(' ');
  return item.isOptional ? `${body} (${optionalLabel})` : body;
}
