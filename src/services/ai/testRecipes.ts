import type { AppLanguage } from '../../domain/recipe';

export type TranslationFixture = {
  id: string;
  sourceLanguage: string;
  targetLanguage: AppLanguage;
  sourceText: string;
  factsToPreserve: string[];
};

// Original, compact evaluation prompts; these are fixtures, not production content.
export const translationFixtures: TranslationFixture[] = [
  {
    id: 'de-en-fractions-convection', sourceLanguage: 'de', targetLanguage: 'en',
    sourceText: 'Kartoffelgratin\nFür 4 Portionen\n600 g Kartoffeln, in dünne Scheiben geschnitten\n150 ml Sahne\n1/2 TL Salz\nOptional: 80–100 g geriebener Käse\nBei 180 °C Umluft 35 Minuten backen. Nach 20 Minuten mit Käse bestreuen.',
    factsToPreserve: ['600 g', '150 ml', '1/2 TL', '80–100 g', '180 °C', '35 Minuten', '20 Minuten', 'Umluft'],
  },
  {
    id: 'de-he-range-temperature', sourceLanguage: 'de', targetLanguage: 'he',
    sourceText: 'Zitronen-Linsen\n2 EL Olivenöl\n1–2 Knoblauchzehen, fein gehackt\n200 g rote Linsen\n750 ml Gemüsebrühe\nSalz nach Geschmack\n12 Minuten köcheln lassen. Mit Zitronenschale servieren.',
    factsToPreserve: ['2 EL', '1–2', '200 g', '750 ml', '12 Minuten', 'nach Geschmack'],
  },
  {
    id: 'en-de-us-units', sourceLanguage: 'en', targetLanguage: 'de',
    sourceText: 'Skillet cornbread\n1 1/2 cups cornmeal\n1/4 cup melted butter, divided\n2 large eggs\nBake at 400°F for 18–22 minutes until golden.',
    factsToPreserve: ['1 1/2 cups', '1/4 cup', '2', '400°F', '18–22 minutes', 'divided'],
  },
  {
    id: 'en-he-temperatures', sourceLanguage: 'en', targetLanguage: 'he',
    sourceText: 'Roasted carrots\n500 g carrots, peeled and halved lengthwise\n1 tbsp olive oil\n1/2 tsp cumin\nRoast at 425°F (220°C) for 25 minutes, turning once halfway through. Add salt to taste.',
    factsToPreserve: ['500 g', '1 tbsp', '1/2 tsp', '425°F', '220°C', '25 minutes', 'to taste'],
  },
  {
    id: 'he-en-mixed-script', sourceLanguage: 'he', targetLanguage: 'en',
    sourceText: 'עוגת שקדים\n2 ביצים\n¾ כוס סוכר\n100 גרם שקדים טחונים\nאופים ב-170°C במשך 28 דקות. מצננים לפני ההגשה.',
    factsToPreserve: ['2', '¾ כוס', '100 גרם', '170°C', '28 דקות'],
  },
  {
    id: 'he-de-optional', sourceLanguage: 'he', targetLanguage: 'de',
    sourceText: 'סלט מלפפונים\n3 מלפפונים\n2 כפות שמן זית\nמיץ מחצי לימון\nשמיר קצוץ, לפי הטעם\nאפשר להוסיף 1 שן שום כתושה.',
    factsToPreserve: ['3', '2 כפות', 'חצי לימון', 'לפי הטעם', '1 שן שום'],
  },
  {
    id: 'it-en-oven-setting', sourceLanguage: 'it', targetLanguage: 'en',
    sourceText: 'Pasta al forno\n250 g rigatoni\n200 g passata\n1 spicchio d’aglio\nFacoltativo: 60 g mozzarella\nCuocere in forno statico a 190 °C per 24 minuti.',
    factsToPreserve: ['250 g', '200 g', '1 spicchio', '60 g', '190 °C', '24 minuti', 'forno statico'],
  },
  {
    id: 'fr-de-to-taste', sourceLanguage: 'fr', targetLanguage: 'de',
    sourceText: 'Soupe de courgettes\n2 courgettes (environ 500 g)\n700 ml de bouillon\n1 c. à café de thym\nPoivre au goût\nLaisser mijoter 16 minutes.',
    factsToPreserve: ['2', '500 g', '700 ml', '1 c. à café', '16 minutes', 'au goût'],
  },
  {
    id: 'es-en-metric-range', sourceLanguage: 'es', targetLanguage: 'en',
    sourceText: 'Tortilla de patatas\n400–450 g potatoes\n4 eggs\n2 tbsp olive oil, divided\nCook over medium-low heat for 8 minutes per side. Add salt to taste.',
    factsToPreserve: ['400–450 g', '4 eggs', '2 tbsp', '8 minutes per side', 'to taste', 'divided'],
  },
];
