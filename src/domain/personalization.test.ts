import { describe, expect, it } from 'vitest';
import { parseIngredientLine } from './ingredientText';
import { dislikedIngredients, matchesFavoriteCuisine, profileConflicts, relativeDay } from './personalization';
import { parseDislikes, parseProfile } from './profile';

const recipeWith = (...lines: string[]) => ({ ingredients: lines.map(parseIngredientLine) });

describe('profile conflicts', () => {
  it('finds allergens in English, German and Hebrew ingredient lines', () => {
    const profile = { allergies: ['nuts', 'dairy', 'eggs', 'gluten'] as const, diets: [] };
    expect(profileConflicts(recipeWith('100 g walnuts, chopped', '2 eggs', '200 ml cream'), { ...profile, allergies: [...profile.allergies] })).toEqual(['nuts', 'dairy', 'eggs']);
    expect(profileConflicts(recipeWith('200 g Mehl', '2 Eier', '50 g Butter'), { ...profile, allergies: [...profile.allergies] })).toEqual(['gluten', 'dairy', 'eggs']);
    expect(profileConflicts(recipeWith('חצי כוס קמח לציפוי הבשר', '3 ביצים', '100 גרם שקדים'), { ...profile, allergies: [...profile.allergies] })).toEqual(['nuts', 'gluten', 'eggs']);
  });

  it('avoids common false positives', () => {
    const profile = { allergies: ['eggs', 'dairy', 'fish', 'gluten'] as ('eggs' | 'dairy' | 'fish' | 'gluten')[], diets: [] };
    expect(profileConflicts(recipeWith('1 eggplant, diced', '2 tbsp peanut butter', '400 ml coconut milk', '1 cup rice flour'), profile)).toEqual([]);
    expect(profileConflicts(recipeWith('כוס דגנים', 'חמאת בוטנים', 'חלב קוקוס'), profile)).toEqual([]);
  });

  it('handles Hebrew prefixes as whole words', () => {
    expect(profileConflicts(recipeWith('מפזרים שומשום ומגישים עם הטחינה'), { allergies: ['sesame'], diets: [] })).toEqual(['sesame']);
    expect(profileConflicts(recipeWith('ובשר בקר טחון'), { allergies: [], diets: ['vegetarian'] })).toEqual(['meat']);
  });

  it('turns diets into warnings', () => {
    const goulash = recipeWith('1 ק"ג שריר בקר, חתוך לקוביות', '4 כפות שומן אווז או שמן', 'חצי כוס קמח לציפוי הבשר');
    expect(profileConflicts(goulash, { allergies: [], diets: ['vegetarian'] })).toEqual(['meat']);
    expect(profileConflicts(goulash, { allergies: [], diets: ['glutenFree'] })).toEqual(['gluten']);
    expect(profileConflicts(recipeWith('200 g bacon', '100 g butter'), { allergies: [], diets: ['kosher'] })).toEqual(['pork', 'meatAndDairy']);
    expect(profileConflicts(recipeWith('2 tbsp honey', '1 cup oat milk'), { allergies: [], diets: ['vegan'] })).toEqual(['honey']);
  });
});

describe('disliked ingredients', () => {
  it('finds the user\'s own dislikes as whole words, with simple plurals, in the translated recipe', () => {
    const recipe = recipeWith('2 tbsp chopped cilantro', '100 g black olives', '1 eggplant', '1 kg beef shank');
    expect(dislikedIngredients(recipe, ['Cilantro', 'olive', 'egg', 'mushrooms'])).toEqual(['Cilantro', 'olive']);
    const hebrew = recipeWith('חופן כוסברה קצוצה', '100 גרם זיתים שחורים', 'והפטריות');
    expect(dislikedIngredients(hebrew, ['כוסברה', 'זית', 'פטריות', 'דג'])).toEqual(['כוסברה', 'זית', 'פטריות']);
    expect(dislikedIngredients(recipeWith('1 cup grains'), ['דג'])).toEqual([]);
  });

  it('keeps dislikes clean when stored', () => {
    expect(parseDislikes(' cilantro, Olives;olives\n , mushrooms ')).toEqual(['cilantro', 'Olives', 'mushrooms']);
    expect(parseProfile('{"dislikes":["כוסברה"," זיתים "]}').dislikes).toEqual(['כוסברה', 'זיתים']);
  });
});

describe('cuisine affinity', () => {
  it('matches favorite cuisines from title and tags', () => {
    expect(matchesFavoriteCuisine({ title: 'Creamy Tomato Pasta', tags: [] }, ['italian'])).toBe(true);
    expect(matchesFavoriteCuisine({ title: 'מתכון לגולאש נהדר', tags: ['בשר'] }, ['homestyle'])).toBe(true);
    expect(matchesFavoriteCuisine({ title: 'Banana bread', tags: ['baking'] }, ['italian', 'asian'])).toBe(false);
  });
});

describe('relative days and stored profile', () => {
  it('describes how long ago something was cooked', () => {
    const now = new Date(2026, 9, 20, 18, 0);
    const ago = (days: number) => new Date(2026, 9, 20 - days, 12, 0).toISOString();
    expect([0, 1, 3, 8, 16, 40, 95].map((days) => relativeDay(ago(days), now))).toEqual([
      { unit: 'today', count: 0 }, { unit: 'yesterday', count: 1 }, { unit: 'days', count: 3 }, { unit: 'week', count: 1 },
      { unit: 'weeks', count: 2 }, { unit: 'month', count: 1 }, { unit: 'months', count: 3 },
    ]);
  });

  it('parses a stored profile defensively', () => {
    expect(parseProfile('{"name":"  Yaron ","householdSize":4,"diets":["vegan","keto"],"allergies":["nuts"],"cuisines":["italian"]}'))
      .toEqual({ name: 'Yaron', householdSize: 4, diets: ['vegan'], allergies: ['nuts'], cuisines: ['italian'], dislikes: [] });
    expect(parseProfile('not json').name).toBe('');
    expect(parseProfile(null).householdSize).toBeNull();
  });
});
