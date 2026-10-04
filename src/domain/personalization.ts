import type { Allergen, Cuisine, Profile } from './profile';
import type { Recipe } from './recipe';

// Deterministic, on-device personalization: allergy/diet hints and cuisine affinity.
// Hints never change a recipe; they only inform the user and the suggestion ranking.

export type Conflict = Allergen | 'meat' | 'pork' | 'honey' | 'meatAndDairy';

type Keywords = { words: string[]; except?: string[] };

const HEBREW = '֐-׿';
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word matcher. Hebrew words may carry one or two attached prefixes (ו ה ב ל מ כ ש). */
function matcher({ words, except = [] }: Keywords): (text: string) => boolean {
  const toPattern = (word: string) => /[֐-׿]/.test(word)
    ? `(?:^|[^${HEBREW}])[והבלמכש]{0,2}${escape(word)}(?=$|[^${HEBREW}])`
    : `(?:^|[^\\p{L}])${escape(word)}(?=$|[^\\p{L}])`;
  const hit = new RegExp(words.map(toPattern).join('|'), 'iu');
  const skip = except.length ? new RegExp(except.map(toPattern).join('|'), 'giu') : null;
  return (text) => hit.test(skip ? text.replace(skip, ' ') : text);
}

const KEYWORDS: Record<Exclude<Conflict, 'meatAndDairy'>, Keywords> = {
  nuts: { words: ['nuts', 'almond', 'almonds', 'walnut', 'walnuts', 'hazelnut', 'hazelnuts', 'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios', 'macadamia', 'pine nuts',
    'nüsse', 'mandel', 'mandeln', 'walnuss', 'walnüsse', 'haselnuss', 'haselnüsse', 'pistazie', 'pistazien', 'pinienkerne',
    'אגוז', 'אגוזים', 'שקד', 'שקדים', 'פקאן', 'קשיו', 'פיסטוק', 'צנוברים', 'אגוזי לוז'] },
  peanuts: { words: ['peanut', 'peanuts', 'erdnuss', 'erdnüsse', 'erdnussbutter', 'בוטנים', 'בוטן'] },
  gluten: { words: ['flour', 'wheat', 'bread', 'breadcrumbs', 'pasta', 'noodles', 'spaghetti', 'couscous', 'barley', 'rye', 'semolina', 'bulgur',
    'mehl', 'weizen', 'brot', 'nudeln', 'gerste', 'roggen', 'grieß', 'paniermehl',
    'קמח', 'חיטה', 'לחם', 'פסטה', 'אטריות', 'ספגטי', 'קוסקוס', 'שעורה', 'שיפון', 'סולת', 'פירורי לחם', 'בורגול'],
  except: ['gluten-free flour', 'rice flour', 'corn flour', 'almond flour', 'reismehl', 'maismehl', 'קמח אורז', 'קמח תירס', 'קמח שקדים'] },
  dairy: { words: ['milk', 'butter', 'cream', 'cheese', 'yogurt', 'yoghurt', 'parmesan', 'mozzarella', 'ricotta', 'mascarpone', 'ghee', 'feta',
    'milch', 'sahne', 'käse', 'joghurt', 'quark', 'schmand',
    'חלב', 'חמאה', 'שמנת', 'גבינה', 'גבינת', 'יוגורט', 'לבנה', 'פרמזן', 'מוצרלה', 'ריקוטה', 'פטה'],
  except: ['peanut butter', 'coconut milk', 'coconut cream', 'oat milk', 'almond milk', 'soy milk', 'rice milk',
    'erdnussbutter', 'kokosmilch', 'hafermilch', 'mandelmilch', 'sojamilch', 'reismilch',
    'חמאת בוטנים', 'חלב קוקוס', 'חלב שיבולת שועל', 'חלב שקדים', 'חלב סויה', 'חלב אורז'] },
  eggs: { words: ['egg', 'eggs', 'yolk', 'yolks', 'mayonnaise', 'ei', 'eier', 'eigelb', 'eiweiß', 'ביצה', 'ביצים', 'חלמון', 'חלמונים', 'חלבון', 'חלבונים', 'מיונז'] },
  fish: { words: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'anchovies', 'sardine', 'sardines', 'trout', 'tilapia', 'sea bass', 'fish sauce',
    'fisch', 'lachs', 'thunfisch', 'kabeljau', 'sardellen', 'sardinen', 'forelle',
    'דג', 'דגים', 'סלמון', 'טונה', 'אמנון', 'סרדינים', 'אנשובי', 'בקלה'] },
  shellfish: { words: ['shrimp', 'shrimps', 'prawn', 'prawns', 'crab', 'lobster', 'mussels', 'clams', 'oysters', 'scallops', 'calamari', 'squid',
    'garnelen', 'krabben', 'hummer', 'muscheln', 'austern', 'tintenfisch',
    'שרימפס', 'סרטנים', 'לובסטר', 'מולים', 'צדפות', 'קלמרי', 'פירות ים'] },
  sesame: { words: ['sesame', 'tahini', 'sesam', 'tahin', 'שומשום', 'טחינה'] },
  soy: { words: ['soy', 'soya', 'tofu', 'edamame', 'miso', 'soja', 'סויה', 'טופו', 'מיסו', 'אדממה'] },
  meat: { words: ['meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'veal', 'bacon', 'ham', 'sausage', 'sausages', 'mince', 'minced meat', 'ground beef',
    'fleisch', 'rind', 'rinder', 'rindfleisch', 'schwein', 'schweinefleisch', 'lamm', 'hähnchen', 'huhn', 'pute', 'kalb', 'speck', 'schinken', 'wurst', 'hackfleisch',
    'בשר', 'בקר', 'עוף', 'הודו', 'כבש', 'טלה', 'עגל', 'נקניק', 'נקניקיות', 'פרגיות', 'שניצל', 'כבד'] },
  pork: { words: ['pork', 'bacon', 'ham', 'lard', 'schwein', 'schweinefleisch', 'speck', 'schinken', 'חזיר', 'בייקון'] },
  honey: { words: ['honey', 'honig', 'דבש'] },
};

const MATCHERS = Object.fromEntries(Object.entries(KEYWORDS).map(([key, keywords]) => [key, matcher(keywords)])) as Record<keyof typeof KEYWORDS, (text: string) => boolean>;

const ingredientText = (recipe: Pick<Recipe, 'ingredients'>) =>
  recipe.ingredients.map((item) => [item.originalText, item.ingredient, item.preparation].filter(Boolean).join(' ')).join('\n');

/** What in this recipe the profile should be warned about (allergies and diets), in a stable order. */
export function profileConflicts(recipe: Pick<Recipe, 'ingredients'>, profile: Pick<Profile, 'allergies' | 'diets'>): Conflict[] {
  const text = ingredientText(recipe);
  const found = new Set<Conflict>();
  const check = (conflict: keyof typeof KEYWORDS) => { if (MATCHERS[conflict](text)) found.add(conflict); };
  profile.allergies.forEach(check);
  for (const diet of profile.diets) {
    if (diet === 'glutenFree') check('gluten');
    if (diet === 'dairyFree') check('dairy');
    if (diet === 'vegetarian' || diet === 'vegan') { check('meat'); check('fish'); check('shellfish'); }
    if (diet === 'vegan') { check('dairy'); check('eggs'); check('honey'); }
    if (diet === 'kosher') {
      check('pork'); check('shellfish');
      if (MATCHERS.meat(text) && MATCHERS.dairy(text)) found.add('meatAndDairy');
    }
  }
  const order: Conflict[] = ['nuts', 'peanuts', 'gluten', 'dairy', 'eggs', 'fish', 'shellfish', 'sesame', 'soy', 'meat', 'pork', 'honey', 'meatAndDairy'];
  return order.filter((conflict) => found.has(conflict));
}

const CUISINE_WORDS: Record<Cuisine, Keywords> = {
  italian: { words: ['italian', 'pasta', 'pizza', 'risotto', 'lasagna', 'italienisch', 'איטלקי', 'איטלקית', 'פסטה', 'פיצה', 'ריזוטו', 'לזניה'] },
  mediterranean: { words: ['mediterranean', 'greek', 'feta', 'olive', 'olives', 'mediterran', 'griechisch', 'ים תיכוני', 'ים תיכונית', 'יווני', 'יוונית', 'זיתים'] },
  middleEastern: { words: ['hummus', 'tahini', 'shakshuka', 'falafel', 'couscous', 'sabich', 'חומוס', 'טחינה', 'שקשוקה', 'פלאפל', 'קוסקוס', 'סביח'] },
  asian: { words: ['asian', 'wok', 'ramen', 'sushi', 'stir-fry', 'teriyaki', 'asiatisch', 'אסייתי', 'אסייתית', 'ווק', 'ראמן', 'סושי'] },
  mexican: { words: ['mexican', 'taco', 'tacos', 'tortilla', 'burrito', 'quesadilla', 'mexikanisch', 'מקסיקני', 'מקסיקנית', 'טאקו', 'טורטייה', 'בוריטו'] },
  french: { words: ['french', 'quiche', 'ratatouille', 'crêpe', 'crepe', 'französisch', 'צרפתי', 'צרפתית', 'קיש', 'רטטוי', 'קרפ'] },
  indian: { words: ['indian', 'curry', 'masala', 'dal', 'tikka', 'indisch', 'הודי', 'הודית', 'קארי', 'מסאלה'] },
  homestyle: { words: ['stew', 'soup', 'goulash', 'casserole', 'eintopf', 'suppe', 'gulasch', 'auflauf', 'תבשיל', 'מרק', 'גולאש', 'קדירה'] },
};
const CUISINE_MATCHERS = Object.fromEntries(Object.entries(CUISINE_WORDS).map(([key, keywords]) => [key, matcher(keywords)])) as Record<Cuisine, (text: string) => boolean>;

/** True when the recipe's title or tags suggest one of the user's favorite cuisines. */
export function matchesFavoriteCuisine(recipe: Pick<Recipe, 'title' | 'tags'>, cuisines: Cuisine[]): boolean {
  const text = [recipe.title, ...recipe.tags].join(' ');
  return cuisines.some((cuisine) => CUISINE_MATCHERS[cuisine](text));
}

/**
 * The user's own disliked ingredients found in a recipe, as the user wrote them.
 * Matches whole words in the recipe's (translated) ingredient lines, allowing simple plurals:
 * "olive" finds "olives", "זית" finds "זיתים".
 */
export function dislikedIngredients(recipe: Pick<Recipe, 'ingredients'>, dislikes: string[]): string[] {
  const text = ingredientText(recipe);
  return dislikes.filter((dislike) => {
    const word = escape(dislike.trim());
    if (!word) return false;
    const pattern = /[֐-׿]/.test(dislike)
      ? `(?:^|[^${HEBREW}])[והבלמכש]{0,2}${word}(?:ים|ות|ה|ת)?(?=$|[^${HEBREW}])`
      : `(?:^|[^\\p{L}])${word}(?:s|es)?(?=$|[^\\p{L}])`;
    return new RegExp(pattern, 'iu').test(text);
  });
}

export type RelativeDay = { unit: 'today' | 'yesterday' | 'days' | 'week' | 'weeks' | 'month' | 'months'; count: number };

/** How long ago a date was, in kitchen terms ("3 days", "2 weeks"). */
export function relativeDay(iso: string, now = new Date()): RelativeDay {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000));
  if (days === 0) return { unit: 'today', count: 0 };
  if (days === 1) return { unit: 'yesterday', count: 1 };
  if (days < 7) return { unit: 'days', count: days };
  if (days < 14) return { unit: 'week', count: 1 };
  if (days < 30) return { unit: 'weeks', count: Math.floor(days / 7) };
  if (days < 60) return { unit: 'month', count: 1 };
  return { unit: 'months', count: Math.floor(days / 30) };
}
