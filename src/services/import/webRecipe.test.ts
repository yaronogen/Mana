import { describe, expect, it } from 'vitest';
import { recipeDraftSchema } from '../ai/schemas';
import {
  durationToMinutes, extractPageText, extractRecipeUrl, extractWebPage, formatWebRecipeForModel,
  guessCategory, isFetchableUrl, isRecipeInLanguage, type WebRecipe,
} from './webRecipe';
import { recipeFromWebRecipe, webRecipeSchema } from './webRecipeDraft';

const page = (head: string, body = '<p>Lots of article text, ads and comments.</p>', lang = 'he') =>
  `<!doctype html><html lang="${lang}" dir="rtl"><head><meta property="og:site_name" content="mako">${head}</head><body><nav>Menu</nav>${body}<script>window.ads = 1;</script></body></html>`;

const hebrewRecipe = {
  '@context': 'https://schema.org', '@type': 'Recipe',
  name: 'גולאש בקר', description: 'קדירת בשר &quot;קלאסית&quot; בבישול ארוך',
  recipeIngredient: ['1 ק"ג שריר בקר, חתוך לקוביות בגודל 2 ס"מ', 'חצי כוס קמח (לא חובה)', '3-4 כוסות מרק או מים', 'מלח'],
  prepTime: 'PT1H', totalTime: 'PT3H1M', recipeYield: 5, keywords: 'בצל,בשר,גולאש', recipeCategory: 'בשר',
  recipeInstructions: [
    { '@type': 'HowToStep', name: 'null 1', text: 'מטגנים את הבצל בסיר גדול.' },
    { '@type': 'HowToStep', name: 'null 2', text: 'מבשלים עם מכסה כשעה וחצי.' },
  ],
};
const ldJson = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const url = 'https://www.mako.co.il/food-recipes/recipes_column-meat/Recipe-de07dd0c9431a51006.htm';

describe('link detection', () => {
  it('treats a single pasted link as a URL import and leaves recipe text alone', () => {
    expect(extractRecipeUrl(`  ${url}\n`)).toBe(url);
    expect(extractRecipeUrl('www.example.com/soup')).toBe('https://www.example.com/soup');
    expect(extractRecipeUrl(`Great soup ${url}`)).toBeNull();
    expect(extractRecipeUrl('200 g flour')).toBeNull();
  });

  it('only allows public http(s) hosts to be fetched', () => {
    expect(isFetchableUrl(url)).toBe(true);
    for (const blocked of ['ftp://example.com/a', 'http://localhost/x', 'http://127.0.0.1/', 'http://10.0.0.5/', 'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'http://printer.local/', 'https://user:pw@example.com/', 'http://example.com:8080/', 'http://2130706433/']) {
      expect(isFetchableUrl(blocked), blocked).toBe(false);
    }
  });
});

describe('structured recipe extraction', () => {
  it('reads only recipe facts from schema.org JSON-LD', () => {
    const result = extractWebPage(page(ldJson({ '@type': 'BreadcrumbList' }) + ldJson(hebrewRecipe)), url);
    expect(result.kind).toBe('structured');
    if (result.kind !== 'structured') return;
    const recipe = result.recipe;
    expect(recipe.title).toBe('גולאש בקר');
    expect(recipe.description).toBe('קדירת בשר "קלאסית" בבישול ארוך');
    expect(recipe.ingredients).toEqual(hebrewRecipe.recipeIngredient);
    expect(recipe.steps).toEqual(['מטגנים את הבצל בסיר גדול.', 'מבשלים עם מכסה כשעה וחצי.']);
    expect(recipe).toMatchObject({ servings: 5, preparationTime: 60, cookingTime: null, totalTime: 181, language: 'he', sourceName: 'mako', sourceUrl: url, categoryHint: 'בשר' });
    expect(recipe.keywords).toEqual(['בצל', 'בשר', 'גולאש']);
  });

  it('handles @graph wrappers, typed arrays, sections and single-string instructions', () => {
    const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, {
      '@type': ['Recipe', 'NewsArticle'], name: 'Lemon lentils', inLanguage: 'en-US', recipeYield: ['4 servings'],
      recipeIngredient: ['200 g red lentils', '1 lemon'], cookTime: 'PT12M',
      recipeInstructions: [{ '@type': 'HowToSection', name: 'Cook', itemListElement: [{ '@type': 'HowToStep', text: 'Rinse the lentils.' }, { '@type': 'HowToStep', text: 'Simmer for 12 minutes at <b>low</b> heat.' }] }],
    }] };
    const result = extractWebPage(page(ldJson(graph), '', 'en'), 'https://example.com/lentils');
    expect(result.kind === 'structured' && result.recipe).toMatchObject({
      title: 'Lemon lentils', servings: 4, cookingTime: 12, language: 'en-US',
      steps: ['Cook:', 'Rinse the lentils.', 'Simmer for 12 minutes at low heat.'],
    });
    const single = { ...hebrewRecipe, recipeInstructions: '1. Preheat to 180°C. 2. Bake for 20 minutes.' };
    const parsed = extractWebPage(page(ldJson(single)), url);
    expect(parsed.kind === 'structured' && parsed.recipe.steps).toEqual(['Preheat to 180°C.', 'Bake for 20 minutes.']);
  });

  it('falls back to capped readable page text when there is no structured recipe', () => {
    const html = page('<style>.x{}</style>', '<h1>Soup</h1><ul><li>2 carrots</li><li>1 l water</li></ul><footer>Copyright</footer>', 'en');
    const result = extractWebPage(html, 'https://example.com/soup');
    expect(result).toEqual({ kind: 'text', text: 'Soup\n2 carrots\n1 l water', language: 'en', imageUrl: null });
    expect(extractPageText(`<body>${'word '.repeat(5000)}</body>`, 100)).toHaveLength(100);
  });

  it('keeps the recipe photo from structured data, falling back to the page preview image', () => {
    const withImage = (image: unknown) => extractWebPage(page(ldJson({ ...hebrewRecipe, image })), url);
    const imageOf = (result: ReturnType<typeof extractWebPage>) => result.kind === 'structured' ? result.recipe.imageUrl : result.imageUrl;
    expect(imageOf(withImage({ '@type': 'ImageObject', url: 'https://img.mako.co.il/gulash.jpg', width: 1044 }))).toBe('https://img.mako.co.il/gulash.jpg');
    expect(imageOf(withImage(['/images/a.jpg', 'https://cdn.example.com/b.jpg']))).toBe('https://www.mako.co.il/images/a.jpg');
    expect(imageOf(withImage('javascript:alert(1)'))).toBeNull();
    const og = '<meta property="og:image" content="https://cdn.example.com/og.jpg">';
    expect(imageOf(extractWebPage(page(og + ldJson(hebrewRecipe)), url))).toBe('https://cdn.example.com/og.jpg');
    expect(imageOf(extractWebPage(page(og, '<p>Soup</p>', 'en'), 'https://example.com/soup'))).toBe('https://cdn.example.com/og.jpg');
  });

  it('parses ISO durations', () => {
    expect(durationToMinutes('PT1H30M')).toBe(90);
    expect(durationToMinutes('P0DT2H')).toBe(120);
    expect(durationToMinutes('PT0M')).toBeNull();
    expect(durationToMinutes('45 minutes')).toBeNull();
  });
});

describe('token-saving import paths', () => {
  const structured = extractWebPage(page(ldJson(hebrewRecipe)), url);
  const recipe = (structured as { recipe: WebRecipe }).recipe;

  it('sends a compact recipe instead of the page when translation is needed', () => {
    const modelText = formatWebRecipeForModel(recipe);
    expect(modelText).toContain('Ingredients:\n- 1 ק"ג שריר בקר');
    expect(modelText).toContain('Steps:\n1. מטגנים');
    expect(modelText).toContain('Times: prep 60 min, total 181 min');
    expect(modelText).not.toMatch(/<|mako|Menu|ads/);
    expect(modelText.length).toBeLessThan(600);
  });

  it('skips the model only when the recipe is already in the requested language', () => {
    expect(isRecipeInLanguage(recipe, 'he')).toBe(true);
    expect(isRecipeInLanguage(recipe, 'en')).toBe(false);
    expect(isRecipeInLanguage({ ...recipe, language: 'he', title: 'Goulash', ingredients: ['1 kg beef'], steps: ['Cook.'] }, 'he')).toBe(false);
    expect(isRecipeInLanguage({ ...recipe, language: 'en-GB', title: 'Goulash', ingredients: ['1 kg beef'], steps: ['Cook.'] }, 'en')).toBe(true);
    expect(isRecipeInLanguage({ ...recipe, language: 'en', title: 'Goulash', ingredients: ['1 kg beef'], steps: ['Cook.'] }, 'de')).toBe(false);
  });

  it('builds a valid reviewable draft locally for same-language pages', () => {
    const transported = webRecipeSchema.parse(JSON.parse(JSON.stringify(recipe)));
    const draft = recipeFromWebRecipe(transported, 'he');
    expect(recipeDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft).toMatchObject({ category: 'main-courses', sourceUrl: url, sourceName: 'mako', outputLanguage: 'he', servings: 5, tags: ['בצל', 'בשר', 'גולאש'], imageUri: null });
    expect(draft.ingredients.map((item) => item.originalText)).toEqual(hebrewRecipe.recipeIngredient);
    expect(guessCategory({ ...recipe, categoryHint: 'Suppen', title: 'Kürbissuppe', keywords: [] })).toBe('soups');
  });
});
