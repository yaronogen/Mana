// The user's taste profile. Stored only on the device (app_settings key "profile").

export const DIETS = ['vegetarian', 'vegan', 'glutenFree', 'dairyFree', 'kosher'] as const;
export const ALLERGENS = ['nuts', 'peanuts', 'gluten', 'dairy', 'eggs', 'fish', 'shellfish', 'sesame', 'soy'] as const;
export const CUISINES = ['italian', 'mediterranean', 'middleEastern', 'asian', 'mexican', 'french', 'indian', 'homestyle'] as const;

export type Diet = (typeof DIETS)[number];
export type Allergen = (typeof ALLERGENS)[number];
export type Cuisine = (typeof CUISINES)[number];

export type Profile = {
  name: string;
  householdSize: number | null;
  diets: Diet[];
  allergies: Allergen[];
  cuisines: Cuisine[];
  /** Free-text ingredients the user doesn't like, in their own words and language. */
  dislikes: string[];
};

export const EMPTY_PROFILE: Profile = { name: '', householdSize: null, diets: [], allergies: [], cuisines: [], dislikes: [] };

/** Splits "cilantro, olives; mushrooms" into clean, unique entries. */
export function parseDislikes(text: string): string[] {
  const seen = new Set<string>();
  return text.split(/[,;\n]/).map((item) => item.trim().slice(0, 40)).filter((item) => {
    const key = item.toLocaleLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

/** Parses a stored profile defensively; unknown values are dropped. */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return EMPTY_PROFILE;
  try {
    const value = JSON.parse(raw) as Partial<Profile>;
    const pick = <T extends string>(items: unknown, allowed: readonly T[]) =>
      Array.isArray(items) ? items.filter((item): item is T => allowed.includes(item as T)) : [];
    const size = Number(value.householdSize);
    return {
      name: typeof value.name === 'string' ? value.name.trim().slice(0, 40) : '',
      householdSize: Number.isInteger(size) && size >= 1 && size <= 12 ? size : null,
      diets: pick(value.diets, DIETS),
      allergies: pick(value.allergies, ALLERGENS),
      cuisines: pick(value.cuisines, CUISINES),
      dislikes: Array.isArray(value.dislikes) ? parseDislikes(value.dislikes.filter((item): item is string => typeof item === 'string').join(',')) : [],
    };
  } catch {
    return EMPTY_PROFILE;
  }
}
