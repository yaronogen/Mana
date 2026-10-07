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

// Dutch, Spanish, Italian, French and Polish words for the same warnings. Matching is whole-word, so plurals
// and (for Polish) common case endings are listed. Exceptions remove look-alikes first: coconut milk is not dairy,
// nutmeg is not a nut, peanuts are not tree nuts, rice flour has no gluten.
const MORE_LANGUAGES: Record<keyof typeof KEYWORDS, Keywords> = {
  nuts: { words: [
    'noten', 'noot', 'amandel', 'amandelen', 'walnoot', 'walnoten', 'hazelnoot', 'hazelnoten', 'pecannoten', 'cashewnoten', 'pistache', 'pistachenoten', 'macadamianoten', 'pijnboompitten',
    'nuez', 'nueces', 'almendra', 'almendras', 'avellana', 'avellanas', 'anacardo', 'anacardos', 'pistacho', 'pistachos', 'piñones', 'pecanas',
    'noce', 'noci', 'mandorla', 'mandorle', 'nocciola', 'nocciole', 'anacardi', 'pistacchio', 'pistacchi', 'pinoli',
    'noix', 'amande', 'amandes', 'noisette', 'noisettes', 'noix de cajou', 'pistache', 'pistaches', 'pignons', 'pignons de pin',
    'orzech', 'orzechy', 'orzechów', 'orzechami', 'migdał', 'migdały', 'migdałów', 'migdałami', 'orzechy laskowe', 'orzechów laskowych', 'nerkowce', 'nerkowców', 'pistacje', 'pistacji', 'orzeszki piniowe', 'pekan'],
  except: ['nuez moscada', 'noce moscata', 'noix de muscade', 'noix de coco', 'orzechy ziemne', 'orzeszki ziemne', 'orzechów ziemnych', 'orzeszków ziemnych'] },
  peanuts: { words: [
    'pinda', "pinda's", 'pindakaas', 'apennootjes',
    'cacahuete', 'cacahuetes', 'cacahuate', 'cacahuates', 'maní', 'mantequilla de cacahuete', 'mantequilla de maní',
    'arachide', 'arachidi', 'noccioline', 'burro di arachidi',
    'cacahuète', 'cacahuètes', 'cacahouète', 'cacahouètes', 'arachides', 'beurre de cacahuète', 'beurre de cacahouète',
    'orzeszki ziemne', 'orzeszków ziemnych', 'orzechy ziemne', 'orzechów ziemnych', 'masło orzechowe', 'masła orzechowego'] },
  gluten: { words: [
    'bloem', 'meel', 'tarwe', 'tarwebloem', 'brood', 'broodkruim', 'paneermeel', 'pasta', 'noedels', 'spaghetti', 'couscous', 'gerst', 'rogge', 'griesmeel', 'bulgur', 'spelt',
    'harina', 'trigo', 'pan rallado', 'miga de pan', 'pan de molde', 'pan integral', 'barra de pan', 'rebanada de pan', 'rebanadas de pan', 'pan duro', 'fideos', 'espaguetis', 'cuscús', 'cebada', 'centeno', 'sémola', 'espelta',
    'farina', 'frumento', 'grano', 'pane', 'pangrattato', 'cuscus', 'orzo', 'segale', 'semola', 'farro', 'tagliatelle', 'penne', 'lasagne',
    'farine', 'blé', 'pain', 'chapelure', 'pâtes', 'nouilles', 'orge', 'seigle', 'semoule', 'boulgour', 'épeautre',
    'mąka', 'mąki', 'mąkę', 'mąką', 'pszenica', 'pszenicy', 'pszenna', 'pszennej', 'chleb', 'chleba', 'bułka tarta', 'bułki tartej', 'makaron', 'makaronu', 'kuskus', 'jęczmień', 'żyto', 'żytnia', 'żytniej', 'kasza manna', 'orkisz'],
  except: [
    'rijstmeel', 'maïsmeel', 'amandelmeel', 'glutenvrije bloem', 'glutenvrij brood', 'glutenvrije pasta',
    'harina de arroz', 'harina de maíz', 'harina de almendra', 'harina de almendras', 'harina sin gluten', 'pan sin gluten', 'pasta sin gluten',
    'farina di riso', 'farina di mais', 'farina di mandorle', 'farina senza glutine', 'grano saraceno', 'pasta senza glutine', 'pane senza glutine', 'pasta di mandorle',
    'farine de riz', 'farine de maïs', "farine d'amande", "farine d'amandes", 'farine sans gluten', 'pain sans gluten', 'blé noir', 'pâtes sans gluten',
    'mąka ryżowa', 'mąki ryżowej', 'mąka kukurydziana', 'mąki kukurydzianej', 'mąka migdałowa', 'mąki migdałowej', 'mąka bezglutenowa', 'mąki bezglutenowej', 'makaron ryżowy', 'makaron bezglutenowy'] },
  dairy: { words: [
    'melk', 'boter', 'roomboter', 'room', 'slagroom', 'zure room', 'kaas', 'yoghurt', 'kwark', 'crème fraîche', 'parmezaan', 'mozzarella', 'ricotta', 'mascarpone', 'feta', 'ghee', 'karnemelk',
    'leche', 'mantequilla', 'nata', 'crema', 'queso', 'yogur', 'yogurt', 'requesón', 'parmesano', 'suero de leche',
    'latte', 'burro', 'panna', 'formaggio', 'formaggi', 'parmigiano', 'grana', 'pecorino', 'besciamella', 'stracchino',
    'lait', 'beurre', 'crème', 'fromage', 'fromages', 'yaourt', 'parmesan', 'béchamel', 'gruyère', 'emmental', 'comté',
    'mleko', 'mleka', 'mlekiem', 'masło', 'masła', 'masłem', 'śmietana', 'śmietany', 'śmietaną', 'śmietanka', 'śmietanki', 'ser', 'sera', 'serem', 'sery', 'twaróg', 'twarogu', 'jogurt', 'jogurtu', 'parmezan', 'maślanka', 'kefir'],
  // 'room' is Dutch for cream, not the English 'room temperature'.
  except: [
    'room temperature', 'room temp', 'kokosmelk', 'havermelk', 'amandelmelk', 'sojamelk', 'rijstmelk', 'kokosroom', 'pindakaas', 'cacaoboter',
    'leche de coco', 'leche de avena', 'leche de almendras', 'leche de soja', 'leche de arroz', 'mantequilla de cacahuete', 'mantequilla de maní', 'crema de coco', 'crema de cacahuete', 'manteca de cacao',
    'latte di cocco', 'latte di mandorla', "latte d'avena", 'latte di avena', 'latte di soia', 'latte di riso', 'burro di arachidi', 'burro di cacao', 'panna di cocco',
    'lait de coco', "lait d'avoine", "lait d'amande", 'lait de soja', 'lait de riz', 'beurre de cacahuète', 'beurre de cacahouète', 'crème de coco', 'beurre de cacao',
    'mleko kokosowe', 'mleczko kokosowe', 'mleka kokosowego', 'mleko owsiane', 'mleko migdałowe', 'mleko sojowe', 'mleko ryżowe', 'masło orzechowe', 'masła orzechowego', 'masło kakaowe'] },
  eggs: { words: [
    'ei', 'eieren', 'eidooier', 'eidooiers', 'eigeel', 'eiwit', 'eiwitten', 'mayonaise',
    'huevo', 'huevos', 'yema', 'yemas', 'clara', 'claras', 'mayonesa',
    'uovo', 'uova', 'tuorlo', 'tuorli', 'albume', 'albumi', 'maionese',
    'œuf', 'œufs', 'oeuf', 'oeufs', "jaune d'œuf", "jaunes d'œufs", "blanc d'œuf", "blancs d'œufs", 'mayonnaise',
    'jajko', 'jajka', 'jajek', 'jajkiem', 'jajkami', 'jaja', 'jaj', 'żółtko', 'żółtka', 'żółtek', 'białko', 'białka', 'białek', 'majonez', 'majonezu'] },
  fish: { words: [
    'vis', 'zalm', 'tonijn', 'kabeljauw', 'ansjovis', 'sardines', 'sardientjes', 'forel', 'zeebaars', 'vissaus', 'makreel', 'haring', 'schol',
    'pescado', 'salmón', 'atún', 'bacalao', 'anchoa', 'anchoas', 'boquerones', 'sardina', 'sardinas', 'trucha', 'lubina', 'salsa de pescado', 'merluza', 'caballa',
    'pesce', 'salmone', 'tonno', 'merluzzo', 'baccalà', 'acciuga', 'acciughe', 'alici', 'trota', 'branzino', 'spigola', 'salsa di pesce', 'sgombro',
    'poisson', 'poissons', 'saumon', 'thon', 'cabillaud', 'morue', 'anchois', 'truite', 'loup de mer', 'sauce de poisson', 'maquereau', 'colin',
    'ryba', 'ryby', 'rybę', 'rybą', 'ryb', 'łosoś', 'łososia', 'łososiem', 'tuńczyk', 'tuńczyka', 'dorsz', 'dorsza', 'sardynki', 'sardynek', 'pstrąg', 'pstrąga', 'okoń morski', 'sos rybny', 'makrela', 'makreli', 'śledź', 'śledzia', 'śledzie', 'mintaj'] },
  shellfish: { words: [
    'garnalen', 'garnaal', 'krab', 'kreeft', 'mosselen', 'kokkels', 'oesters', 'sint-jakobsschelpen', 'inktvis', 'calamares', 'zeevruchten', 'langoustines',
    'gambas', 'langostinos', 'camarones', 'cangrejo', 'langosta', 'mejillones', 'almejas', 'ostras', 'vieiras', 'calamar', 'sepia', 'marisco', 'mariscos', 'pulpo',
    'gamberi', 'gamberetti', 'gambero', 'granchio', 'aragosta', 'astice', 'cozze', 'vongole', 'ostriche', 'capesante', 'calamari', 'seppia', 'seppie', 'frutti di mare', 'polpo', 'scampi',
    'crevette', 'crevettes', 'crabe', 'homard', 'langouste', 'moules', 'palourdes', 'huîtres', 'saint-jacques', 'calamars', 'encornets', 'seiche', 'fruits de mer', 'poulpe',
    'krewetki', 'krewetek', 'krewetkami', 'kraba', 'homar', 'homara', 'małże', 'małży', 'ostrygi', 'przegrzebki', 'kalmary', 'kalmarów', 'mątwa', 'owoce morza', 'ośmiornica', 'ośmiornicy'] },
  sesame: { words: ['sesam', 'sesamzaad', 'sesamolie', 'tahini', 'sésamo', 'ajonjolí', 'tahín', 'sesamo', 'semi di sesamo', 'tahina', 'sésame', 'graines de sésame', 'tahiné', 'sezam', 'sezamu', 'sezamem'] },
  soy: { words: ['sojasaus', 'tempeh', 'salsa de soja', 'soia', 'salsa di soia', 'sauce soja', 'soi', 'sos sojowy', 'sosu sojowego'] },
  meat: { words: [
    'vlees', 'rundvlees', 'varkensvlees', 'lamsvlees', 'lam', 'kip', 'kipfilet', 'kippendijen', 'kalkoen', 'kalfsvlees', 'spek', 'ontbijtspek', 'worst', 'worstjes', 'gehakt', 'rundergehakt',
    'carne', 'ternera', 'cerdo', 'cordero', 'pollo', 'pavo', 'beicon', 'jamón', 'chorizo', 'salchicha', 'salchichas', 'carne picada', 'panceta',
    'manzo', 'maiale', 'agnello', 'tacchino', 'vitello', 'pancetta', 'prosciutto', 'salsiccia', 'salsicce', 'macinato', 'carne macinata', 'guanciale', 'bresaola', 'salame', 'mortadella',
    'viande', 'bœuf', 'boeuf', 'porc', 'agneau', 'poulet', 'dinde', 'veau', 'lardons', 'jambon', 'saucisse', 'saucisses', 'viande hachée', 'steak haché', 'canard',
    'mięso', 'mięsa', 'mięsem', 'wołowina', 'wołowiny', 'wieprzowina', 'wieprzowiny', 'jagnięcina', 'kurczak', 'kurczaka', 'kurczakiem', 'indyk', 'indyka', 'cielęcina', 'boczek', 'boczku', 'szynka', 'szynki', 'kiełbasa', 'kiełbasy', 'kiełbaski', 'mięso mielone', 'mielone', 'schab', 'schabu', 'wątróbka'] },
  pork: { words: [
    'varkensvlees', 'varken', 'spek', 'ontbijtspek', 'reuzel',
    'cerdo', 'beicon', 'jamón', 'panceta', 'chorizo', 'manteca de cerdo',
    'maiale', 'pancetta', 'prosciutto', 'guanciale', 'lardo', 'strutto', 'salame', 'mortadella',
    'porc', 'lardons', 'jambon', 'lard', 'saindoux',
    'wieprzowina', 'wieprzowiny', 'boczek', 'boczku', 'szynka', 'szynki', 'smalec', 'smalcu', 'schab', 'schabu', 'słonina'] },
  honey: { words: ['honing', 'miel', 'miele', 'miód', 'miodu', 'miodem'] },
};

const MATCHERS = Object.fromEntries(Object.entries(KEYWORDS).map(([key, keywords]) => {
  const more = MORE_LANGUAGES[key as keyof typeof KEYWORDS];
  return [key, matcher({ words: [...keywords.words, ...more.words], except: [...(keywords.except ?? []), ...(more.except ?? [])] })];
})) as Record<keyof typeof KEYWORDS, (text: string) => boolean>;

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

/**
 * Splits the conflicts into the user's allergies (a health risk, shown as an allergen warning) and the rest
 * (diet conflicts, shown as a softer heads-up). An allergy that is also a diet conflict counts only as an allergy.
 */
export function splitConflicts(recipe: Pick<Recipe, 'ingredients'>, profile: Pick<Profile, 'allergies' | 'diets'>): { allergens: Allergen[]; other: Conflict[] } {
  const all = profileConflicts(recipe, profile);
  const allergens = all.filter((conflict): conflict is Allergen => (profile.allergies as Conflict[]).includes(conflict));
  return { allergens, other: all.filter((conflict) => !(allergens as Conflict[]).includes(conflict)) };
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
