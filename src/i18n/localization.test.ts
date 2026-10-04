import { describe, expect, it } from 'vitest';
import { translationFixtures } from '../services/ai/testRecipes';
import { categoryLabels, resources } from './resources';

describe('Mana localization', () => {
  it('provides matching UI keys for English, German, and Hebrew', () => {
    const expected = Object.keys(resources.en).sort();
    expect(Object.keys(resources.de).sort()).toEqual(expected);
    expect(Object.keys(resources.he).sort()).toEqual(expected);
  });

  it('localizes every recipe category for all supported app languages', () => {
    const categories = Object.keys(categoryLabels.en).sort();
    expect(Object.keys(categoryLabels.de).sort()).toEqual(categories);
    expect(Object.keys(categoryLabels.he).sort()).toEqual(categories);
    expect(categoryLabels.he['main-courses']).toBeTruthy();
  });

  it('includes the requested core translation directions and additional source languages', () => {
    const cases = new Set(translationFixtures.map((fixture) => `${fixture.sourceLanguage}->${fixture.targetLanguage}`));
    for (const direction of ['de->en', 'de->he', 'en->de', 'en->he', 'he->en', 'he->de']) expect(cases.has(direction)).toBe(true);
    for (const source of ['it', 'fr', 'es']) expect(translationFixtures.some((fixture) => fixture.sourceLanguage === source)).toBe(true);
  });
});
