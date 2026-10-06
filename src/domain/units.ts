import { normalizeAmounts, numericQuantity, parseIngredientLine } from './ingredientText';
import type { AppLanguage, Ingredient } from './recipe';
import { UNIT_ALIASES } from './unitAliases';

/**
 * Display-time measurement conversion. Saved recipes are never changed: callers show the converted
 * amount and keep the original next to it, so rounding is always visible. Only units with one clear
 * meaning are converted (a German "Tasse" varies, so it is left alone); spoons stay as written.
 */
export type UnitSystem = 'original' | 'metric' | 'us';

type Canonical = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp';
type Known = { kind: 'weight' | 'volume'; system: 'metric' | 'us'; factor: number };

// Grams per unit (weight) or millilitres per unit (volume), keyed by the canonical names in unitAliases.ts. A cup is 240 ml, as in US labelling and Israeli recipes.
const KNOWN: Record<string, Known> = {
  g: { kind: 'weight', system: 'metric', factor: 1 },
  kg: { kind: 'weight', system: 'metric', factor: 1000 },
  oz: { kind: 'weight', system: 'us', factor: 28.3495 },
  lb: { kind: 'weight', system: 'us', factor: 453.592 },
  ml: { kind: 'volume', system: 'metric', factor: 1 },
  cl: { kind: 'volume', system: 'metric', factor: 10 },
  dl: { kind: 'volume', system: 'metric', factor: 100 },
  l: { kind: 'volume', system: 'metric', factor: 1000 },
  cup: { kind: 'volume', system: 'us', factor: 240 },
  floz: { kind: 'volume', system: 'us', factor: 29.5735 },
  pint: { kind: 'volume', system: 'us', factor: 473.176 },
  quart: { kind: 'volume', system: 'us', factor: 946.353 },
};


const LABELS: Record<AppLanguage, Record<Canonical, [string, string]>> = {
  en: { g: ['g', 'g'], kg: ['kg', 'kg'], oz: ['oz', 'oz'], lb: ['lb', 'lb'], ml: ['ml', 'ml'], l: ['l', 'l'], cup: ['cup', 'cups'], tbsp: ['tbsp', 'tbsp'], tsp: ['tsp', 'tsp'] },
  de: { g: ['g', 'g'], kg: ['kg', 'kg'], oz: ['oz', 'oz'], lb: ['lb', 'lb'], ml: ['ml', 'ml'], l: ['l', 'l'], cup: ['Cup', 'Cups'], tbsp: ['EL', 'EL'], tsp: ['TL', 'TL'] },
  he: { g: ['גרם', 'גרם'], kg: ['ק״ג', 'ק״ג'], oz: ['oz', 'oz'], lb: ['lb', 'lb'], ml: ['מ״ל', 'מ״ל'], l: ['ליטר', 'ליטר'], cup: ['כוס', 'כוסות'], tbsp: ['כף', 'כפות'], tsp: ['כפית', 'כפיות'] },
};

const GLYPHS: [number, string][] = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
const AMOUNT = '(?:\\d+\\s+)?(?:\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|[½¼¾⅓⅔⅛⅜⅝⅞])';
const RANGE = new RegExp(`^(${AMOUNT})(?:\\s*(?:-|–|to|bis|עד)\\s*(${AMOUNT}))?$`, 'u');

export function lookupUnit(unit: string | null): Known | null {
  if (!unit) return null;
  const key = UNIT_ALIASES[unit.trim().toLocaleLowerCase().replace(/\.$/, '')];
  return key ? KNOWN[key] : null;
}

/** "1 1/2" → [1.5], "400–450" → [400, 450]; null when the amount is not plainly numeric. */
export function parseAmounts(text: string): number[] | null {
  const match = normalizeAmounts(text.trim()).match(RANGE);
  if (!match) return null;
  const values = [match[1], match[2]].filter((part): part is string => part !== undefined).map(numericQuantity);
  return values.every((value): value is number => value !== null && value > 0) ? values : null;
}

/** Whole number plus the nearest common kitchen fraction: 1.5 → "1½", 0.3 → "⅓". */
export function fraction(value: number): { text: string; value: number } {
  const whole = Math.floor(value);
  const [part, glyph] = GLYPHS.reduce((best, entry) => Math.abs(value - whole - entry[0]) < Math.abs(value - whole - best[0]) ? entry : best);
  if (whole === 0 && part === 0) return { text: '¼', value: 0.25 };
  return { text: `${whole + (part === 1 ? 1 : 0) || ''}${glyph}`, value: whole + part };
}

export function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export function decimal(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Picks the target unit for the largest amount, so a range keeps one unit. */
function targetUnit(base: number, kind: Known['kind'], system: 'metric' | 'us'): Canonical {
  if (kind === 'weight') return system === 'metric' ? (base >= 1000 ? 'kg' : 'g') : (base >= 453.592 ? 'lb' : 'oz');
  if (system === 'metric') return base >= 1000 ? 'l' : 'ml';
  return base >= 60 ? 'cup' : base >= 15 ? 'tbsp' : 'tsp';
}

const PER_UNIT: Record<Canonical, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5 };

function formatIn(base: number, unit: Canonical): { text: string; value: number } {
  const amount = base / PER_UNIT[unit];
  switch (unit) {
    case 'g': case 'ml': {
      const rounded = roundTo(amount, amount < 20 ? 1 : amount < 500 ? 5 : 10);
      return { text: String(rounded), value: rounded };
    }
    case 'kg': case 'l': {
      const rounded = roundTo(amount, 0.05);
      return { text: decimal(rounded), value: rounded };
    }
    case 'oz': {
      const rounded = amount < 2 ? roundTo(amount, 0.25) : roundTo(amount, 0.5);
      return fraction(rounded);
    }
    case 'lb': case 'cup': case 'tbsp': case 'tsp':
      return fraction(amount);
  }
}

/**
 * Recipes saved before a spelling was understood (e.g. "1 lb. beef", "1½ pounds", "500g") may hold the
 * unit inside the ingredient name. Re-reading the line lets them convert without editing the saved recipe.
 */
function withRecognisedUnit(item: Ingredient): Ingredient {
  if (lookupUnit(item.unit)) return item;
  const line = [item.quantityText, item.unit, item.ingredient].filter(Boolean).join(' ');
  const reparsed = parseIngredientLine(line);
  if (!lookupUnit(reparsed.unit)) return item;
  return { ...item, quantityText: reparsed.quantityText, quantityValue: reparsed.quantityValue, unit: reparsed.unit, ingredient: reparsed.ingredient };
}

export type ConvertedIngredient = { ingredient: Ingredient; original: string | null };

/** Converts one ingredient's amount into the chosen system; `original` is set only when something changed. */
export function convertIngredient(stored: Ingredient, system: UnitSystem, language: AppLanguage): ConvertedIngredient {
  const unchanged = { ingredient: stored, original: null };
  if (system === 'original') return unchanged;
  const item = withRecognisedUnit(stored);
  if (!item.quantityText) return unchanged;
  const known = lookupUnit(item.unit);
  if (!known || known.system === system) return unchanged;
  const amounts = parseAmounts(item.quantityText);
  if (!amounts) return unchanged;
  const bases = amounts.map((amount) => amount * known.factor);
  const unit = targetUnit(Math.max(...bases), known.kind, system);
  const formatted = bases.map((base) => formatIn(base, unit));
  const plural = formatted[formatted.length - 1].value > 1;
  return {
    ingredient: {
      ...item,
      quantityText: formatted.map((entry) => entry.text).join('–'),
      quantityValue: formatted.length === 1 ? formatted[0].value : null,
      unit: LABELS[language][unit][plural ? 1 : 0],
    },
    original: [item.quantityText, item.unit].join(' '),
  };
}

const TEMPERATURE = /(\d{2,3})\s*°\s*([CF])\b/g;

/**
 * Adds the converted oven temperature after each one in a step: "Bake at 180°C" → "Bake at 180°C (350°F)".
 * Steps that already give both scales are left alone.
 */
export function convertTemperatures(text: string, system: UnitSystem): string {
  if (system === 'original' || (/°\s*C\b/.test(text) && /°\s*F\b/.test(text))) return text;
  const from = system === 'metric' ? 'F' : 'C';
  return text.replace(TEMPERATURE, (match, degrees: string, scale: string) => {
    if (scale !== from) return match;
    const value = Number(degrees);
    if (from === 'C') {
      const fahrenheit = value * 9 / 5 + 32;
      return `${match} (${roundTo(fahrenheit, fahrenheit >= 250 ? 25 : 5)}°F)`;
    }
    return `${match} (${roundTo((value - 32) * 5 / 9, 5)}°C)`;
  });
}
