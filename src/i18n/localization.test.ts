import { describe, expect, it } from 'vitest';
import { translationFixtures } from '../services/ai/testRecipes';
import { APP_LANGUAGES } from '../domain/recipe';
import { categoryLabels, resources } from './resources';

describe('Mana localization', () => {
  it('provides every UI key in every app language, with the same placeholders', () => {
    const expected = Object.keys(resources.en).sort();
    const placeholders = (text: string) => (text.match(/{{w+}}/g) ?? []).sort();
    for (const language of APP_LANGUAGES) {
      expect(Object.keys(resources[language]).sort()).toEqual(expected);
      for (const key of expected) {
        const value = resources[language][key as keyof typeof resources.en];
        expect(value.trim(), `${language}.${key}`).not.toBe('');
        expect(placeholders(value), `${language}.${key}`).toEqual(placeholders(resources.en[key as keyof typeof resources.en]));
      }
    }
  });

  it('localizes every recipe category for all supported app languages', () => {
    const categories = Object.keys(categoryLabels.en).sort();
    for (const language of APP_LANGUAGES) expect(Object.keys(categoryLabels[language]).sort()).toEqual(categories);
    expect(categoryLabels.he['main-courses']).toBeTruthy();
  });

  it('includes the requested core translation directions and additional source languages', () => {
    const cases = new Set(translationFixtures.map((fixture) => `${fixture.sourceLanguage}->${fixture.targetLanguage}`));
    for (const direction of ['de->en', 'de->he', 'en->de', 'en->he', 'he->en', 'he->de']) expect(cases.has(direction)).toBe(true);
    for (const source of ['it', 'fr', 'es']) expect(translationFixtures.some((fixture) => fixture.sourceLanguage === source)).toBe(true);
  });
});
