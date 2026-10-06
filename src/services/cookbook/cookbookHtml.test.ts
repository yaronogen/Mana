import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from '../../domain/ingredientText';
import type { Recipe } from '../../domain/recipe';
import { buildCookbookHtml, escapeHtml, paperFor } from './cookbookHtml';

const base: Omit<Recipe, 'id' | 'title' | 'outputLanguage' | 'category' | 'ingredients' | 'steps'> = {
  description: null, sourceLanguage: 'en', sourceUrl: null, sourceName: null, imageUri: null, servings: null, preparationTime: null, cookingTime: null, totalTime: null,
  tags: [], notes: [], warnings: [], favorite: false, rating: null, lastCookedAt: null, cookCount: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

const pasta: Recipe = {
  ...base, id: 'pasta', title: 'Pasta <al> "Pesto"', outputLanguage: 'en', category: 'pasta-rice', servings: 2, preparationTime: 10,
  ingredients: [parseIngredientLine('200 g spaghetti'), parseIngredientLine('2–3 tbsp pesto')],
  steps: [{ id: 's1', text: 'Bake at 180°C for 5 minutes.' }], sourceName: 'example.com',
};
const shakshuka: Recipe = {
  ...base, id: 'shakshuka', title: 'שקשוקה', outputLanguage: 'he', sourceLanguage: 'he', category: 'breakfast',
  ingredients: [parseIngredientLine('4 ביצים')], steps: [],
};

const pages = (html: string) => html.match(/<section class="page[ "]/g)?.length ?? 0;

describe('cookbook PDF', () => {
  it('has a cover, a contents page, and one page per recipe in the chosen order', () => {
    const html = buildCookbookHtml({ title: 'Family favorites', author: 'Dana', language: 'en', recipes: [shakshuka, pasta], date: new Date('2026-10-06T12:00:00Z') });
    expect(pages(html)).toBe(4);
    expect(html).toContain('<h1 dir="ltr">Family favorites</h1>');
    expect(html).toContain('By Dana');
    expect(html).toContain('2 recipes · October 6, 2026');
    expect(html).toContain('<h2>Contents</h2>');
    expect(html.indexOf('id="recipe-1"')).toBeLessThan(html.indexOf('id="recipe-2"'));
    expect(html).toMatch(/id="recipe-1"[\s\S]*שקשוקה[\s\S]*id="recipe-2"[\s\S]*Pasta/);
    expect(html).toContain('page-break-after: always');
  });

  it('lays out a Hebrew recipe right-to-left and leaves out an empty preparation section', () => {
    const html = buildCookbookHtml({ title: 'ספר המתכונים שלי', author: '', language: 'he', recipes: [shakshuka] });
    expect(html).toContain('<html lang="he" dir="rtl">');
    expect(html).toContain('<section class="page recipe" dir="rtl" lang="he" id="recipe-1">');
    expect(html).toContain('מתכון אחד');
    expect(html).toContain('<h2>תוכן העניינים</h2>');
    expect(html).not.toContain('class="steps"');
    expect(html).not.toContain('class="author"');
  });

  it('keeps amounts and temperatures as written, converting only with the original alongside', () => {
    const original = buildCookbookHtml({ title: 'x', author: '', language: 'en', recipes: [pasta] });
    expect(original).toContain('<li>200 g spaghetti</li>');
    expect(original).toContain('<li>2–3 tbsp pesto</li>');
    expect(original).toContain('Bake at 180°C for 5 minutes.');
    const us = buildCookbookHtml({ title: 'x', author: '', language: 'en', recipes: [pasta], unitSystem: 'us' });
    expect(us).toContain('7 oz spaghetti <span class="original">(200 g)</span>');
    expect(us).toContain('Bake at 180°C (350°F) for 5 minutes.');
    expect(us).toContain('size: letter');
    expect(paperFor('metric')).toMatchObject({ width: 595, height: 842 });
  });

  it('escapes recipe text and embeds photos only when given', () => {
    const html = buildCookbookHtml({ title: '<b>Mine</b>', author: '', language: 'en', recipes: [pasta], images: { pasta: 'data:image/jpeg;base64,AAAA' } });
    expect(html).toContain('Pasta &lt;al&gt; &quot;Pesto&quot;');
    expect(html).toContain('&lt;b&gt;Mine&lt;/b&gt;');
    expect(html).not.toContain('<b>Mine</b>');
    expect(html).toContain('<img class="photo" src="data:image/jpeg;base64,AAAA" alt="">');
    expect(buildCookbookHtml({ title: 'x', author: '', language: 'en', recipes: [pasta] })).not.toContain('<img');
    expect(escapeHtml(`a&b'c`)).toBe('a&amp;b&#39;c');
  });
});
