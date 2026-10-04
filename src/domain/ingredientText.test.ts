import { describe, expect, it } from 'vitest';
import { formatIngredient, parseIngredientLine } from './ingredientText';

describe('parseIngredientLine', () => {
  it('keeps mixed-fraction quantities and known units structured', () => {
    const item = parseIngredientLine('1 1/2 cups rolled oats');
    expect(item.quantityText).toBe('1 1/2');
    expect(item.quantityValue).toBe(1.5);
    expect(item.unit).toBe('cups');
    expect(item.ingredient).toBe('rolled oats');
  });

  it('keeps ranges as display text without inventing a single numeric value', () => {
    const item = parseIngredientLine('400–450 g potatoes');
    expect(item.quantityText).toBe('400–450');
    expect(item.quantityValue).toBeNull();
    expect(item.unit).toBe('g');
    expect(item.ingredient).toBe('potatoes');
  });

  it('understands Unicode fractions and German culinary units', () => {
    const item = parseIngredientLine('½ EL Olivenöl');
    expect(item.quantityText).toBe('½');
    expect(item.quantityValue).toBe(0.5);
    expect(item.unit).toBe('EL');
    expect(item.ingredient).toBe('Olivenöl');
  });

  it('extracts the amount when an ingredient has no explicit unit', () => {
    const item = parseIngredientLine('2 eggs');
    expect(item.quantityText).toBe('2');
    expect(item.unit).toBeNull();
    expect(item.ingredient).toBe('eggs');
  });

  it('does not drop text it cannot confidently parse', () => {
    const item = parseIngredientLine('salt to taste');
    expect(formatIngredient(item)).toBe('salt to taste');
  });

  it('keeps ingredient preparation text after the comma', () => {
    const item = parseIngredientLine('2 large onions, finely chopped');
    expect(item.ingredient).toBe('large onions, finely chopped');
  });
});
