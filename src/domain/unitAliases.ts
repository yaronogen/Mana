/**
 * Spellings of convertible units (lowercase, without a trailing period) mapped to a canonical name.
 * Shared by the ingredient-line parser and the unit converter so both recognise the same words.
 */
export const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gr: 'g', gram: 'g', grams: 'g', gramm: 'g', gramme: 'g', grammes: 'g', 'גרם': 'g', 'גרמים': 'g', 'ג׳': 'g', "ג'": 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg', kilogramm: 'kg', 'ק״ג': 'kg', 'ק"ג': 'kg', 'קילו': 'kg', 'קילוגרם': 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz', unze: 'oz', unzen: 'oz', 'אונקיה': 'oz', 'אונקיות': 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', pfund: 'lb', 'ליברה': 'lb', 'ליברות': 'lb', 'פאונד': 'lb', 'פאונדים': 'lb', pfd: 'lb',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', 'מ״ל': 'ml', 'מ"ל': 'ml', 'מל': 'ml', 'מיליליטר': 'ml',
  cl: 'cl', dl: 'dl', l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l', 'ליטר': 'l', 'ליטרים': 'l',
  // Dutch, Spanish, Italian, French and Polish spellings of the metric units. Cups (taza, tazza, tasse, szklanka, kopje)
  // vary by country and era, so like the German "Tasse" they are not converted.
  grammo: 'g', grammi: 'g', gramo: 'g', gramos: 'g', gramy: 'g', 'gramów': 'g', chilo: 'kg', chilogrammo: 'kg', chilogrammi: 'kg',
  kilogramo: 'kg', kilogramos: 'kg', kilogramy: 'kg', 'kilogramów': 'kg', millilitro: 'ml', millilitri: 'ml', mililitro: 'ml', mililitros: 'ml', mililitry: 'ml', 'mililitrów': 'ml',
  litro: 'l', litri: 'l', litros: 'l', litr: 'l', litry: 'l', 'litrów': 'l',
  cup: 'cup', cups: 'cup', 'כוס': 'cup', 'כוסות': 'cup',
  'fl oz': 'floz', 'fl. oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  pint: 'pint', pints: 'pint', quart: 'quart', quarts: 'quart',
};
