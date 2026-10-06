import { describe, expect, it } from 'vitest';
import { formatIngredient, parseIngredientLine } from './ingredientText';
import { displayIngredient, scaleIngredient, servingsFactor } from './scaling';

const scaled = (line: string, factor: number) => formatIngredient(scaleIngredient(parseIngredientLine(line), factor));

describe('serving scaling', () => {
  it('computes the factor only when both servings are known', () => {
    expect(servingsFactor(4, 2)).toBe(0.5);
    expect(servingsFactor(4, 6)).toBe(1.5);
    expect(servingsFactor(null, 2)).toBe(1);
    expect(servingsFactor(4, null)).toBe(1);
  });

  it('rounds metric amounts like a kitchen scale', () => {
    expect(scaled('200 g flour', 1.5)).toBe('300 g flour');
    expect(scaled('250 g Mehl', 1 / 3)).toBe('85 g Mehl');
    expect(scaled('1 kg potatoes', 0.75)).toBe('0.75 kg potatoes');
    expect(scaled('500 גרם קמח', 0.5)).toBe('250 גרם קמח');
  });

  it('uses kitchen fractions for spoons, cups and pieces', () => {
    expect(scaled('1 cup milk', 1.5)).toBe('1½ cup milk');
    expect(scaled('3 eggs', 0.5)).toBe('1½ eggs');
    expect(scaled('2 EL Öl', 2)).toBe('4 EL Öl');
    expect(scaled('½ כוס סוכר', 2)).toBe('1 כוס סוכר');
    expect(scaled('1 1/2 tsp salt', 2)).toBe('3 tsp salt');
  });

  it('scales both ends of a range', () => {
    expect(scaled('400-450 g Rinderhack', 0.5)).toBe('200–225 g Rinderhack');
  });

  it('leaves amounts that are not plainly numeric unchanged', () => {
    const pinch = parseIngredientLine('salt to taste');
    expect(scaleIngredient(pinch, 2)).toBe(pinch);
    const item = parseIngredientLine('2 eggs');
    expect(scaleIngredient(item, 1)).toBe(item);
  });

  it('shows the recipe amount alongside a scaled or converted one', () => {
    const flour = parseIngredientLine('200 g flour');
    expect(displayIngredient(flour, { factor: 1, unitSystem: 'original', language: 'en' }).original).toBeNull();
    const doubled = displayIngredient(flour, { factor: 2, unitSystem: 'original', language: 'en' });
    expect(formatIngredient(doubled.ingredient)).toBe('400 g flour');
    expect(doubled.original).toBe('200 g');
    const doubledUs = displayIngredient(flour, { factor: 2, unitSystem: 'us', language: 'en' });
    expect(doubledUs.ingredient.unit).toBe('oz');
    expect(doubledUs.original).toBe('200 g');
  });
});
