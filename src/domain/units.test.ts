import { describe, expect, it } from 'vitest';
import { formatIngredient, parseIngredientLine } from './ingredientText';
import type { AppLanguage } from './recipe';
import { convertIngredient, convertTemperatures, type UnitSystem } from './units';

const convert = (line: string, system: UnitSystem, language: AppLanguage = 'en') => {
  const result = convertIngredient(parseIngredientLine(line), system, language);
  return { text: formatIngredient(result.ingredient), original: result.original };
};

describe('convertIngredient', () => {
  it('converts metric weights to ounces and pounds, keeping the original', () => {
    expect(convert('200 g flour', 'us')).toEqual({ text: '7 oz flour', original: '200 g' });
    expect(convert('1 kg potatoes', 'us').text).toBe('2¼ lb potatoes');
    expect(convert('500 grams sugar', 'us').text).toBe('1 lb sugar');
  });

  it('converts US weights and cups to metric', () => {
    expect(convert('1 lb ground beef', 'metric')).toEqual({ text: '455 g ground beef', original: '1 lb' });
    expect(convert('8 ounces cheese', 'metric').text).toBe('225 g cheese');
    expect(convert('1 1/2 cups milk', 'metric').text).toBe('360 ml milk');
    expect(convert('5 cups water', 'metric').text).toBe('1.2 l water');
  });

  it('converts both ends of a range with one unit', () => {
    expect(convert('400–450 g potatoes', 'us').text).toBe('14–16 oz potatoes');
  });

  it('turns metric volumes into cups or spoons', () => {
    expect(convert('250 ml milk', 'us').text).toBe('1 cup milk');
    expect(convert('500 ml stock', 'us').text).toBe('2 cups stock');
    expect(convert('30 ml oil', 'us').text).toBe('2 tbsp oil');
  });

  it('uses the recipe language for unit names', () => {
    expect(convert('2 כוסות קמח', 'metric', 'he').text).toBe('480 מ״ל קמח');
    expect(convert('1 lb Hackfleisch', 'metric', 'de').text).toBe('455 g Hackfleisch');
  });

  it('leaves amounts alone when nothing needs converting or it is unclear', () => {
    for (const [line, system] of [
      ['200 g flour', 'metric'], ['2 cups flour', 'us'], ['200 g flour', 'original'],
      ['1 EL Olivenöl', 'us'], ['2 Tassen Mehl', 'metric'], ['2 eggs', 'us'], ['salt to taste', 'metric'],
    ] as const) {
      expect(convert(line, system).original).toBeNull();
    }
  });
});

describe('convertTemperatures', () => {
  it('adds the other scale after oven temperatures', () => {
    expect(convertTemperatures('Bake at 180°C for 25 minutes.', 'us')).toBe('Bake at 180°C (350°F) for 25 minutes.');
    expect(convertTemperatures('Heat the oven to 425 °F.', 'metric')).toBe('Heat the oven to 425 °F (220°C).');
  });

  it('keeps steps that already give both scales or need nothing', () => {
    expect(convertTemperatures('Roast at 425°F (220°C).', 'metric')).toBe('Roast at 425°F (220°C).');
    expect(convertTemperatures('Bake at 180°C.', 'metric')).toBe('Bake at 180°C.');
    expect(convertTemperatures('Bake at 180°C.', 'original')).toBe('Bake at 180°C.');
  });
});
