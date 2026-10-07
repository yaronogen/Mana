import { formatIngredient } from '../../domain/ingredientText';
import type { AppLanguage, Recipe } from '../../domain/recipe';
import { categoryLabels } from '../../i18n/resources';

const shareCopy: Record<AppLanguage, { ingredients: string; preparation: string; shared: string; servings: string; prep: string; cook: string; optional: string; source: string; minute: string }> = {
  en: { ingredients: 'INGREDIENTS', preparation: 'PREPARATION', shared: 'Shared from Mana', servings: 'Servings', prep: 'Prep', cook: 'Cook', optional: 'optional', source: 'Source', minute: 'min' },
  de: { ingredients: 'ZUTATEN', preparation: 'ZUBEREITUNG', shared: 'Geteilt aus Mana', servings: 'Portionen', prep: 'Vorbereitung', cook: 'Garzeit', optional: 'optional', source: 'Quelle', minute: 'Min.' },
  he: { ingredients: 'מרכיבים', preparation: 'אופן ההכנה', shared: 'שותף דרך Mana', servings: 'מנות', prep: 'הכנה', cook: 'בישול', optional: 'אופציונלי', source: 'מקור', minute: 'דק׳' },
  nl: { ingredients: 'INGREDIËNTEN', preparation: 'BEREIDING', shared: 'Gedeeld via Mana', servings: 'Porties', prep: 'Voorbereiding', cook: 'Kooktijd', optional: 'optioneel', source: 'Bron', minute: 'min' },
  es: { ingredients: 'INGREDIENTES', preparation: 'ELABORACIÓN', shared: 'Compartido desde Mana', servings: 'Raciones', prep: 'Preparación', cook: 'Cocción', optional: 'opcional', source: 'Fuente', minute: 'min' },
  it: { ingredients: 'INGREDIENTI', preparation: 'PROCEDIMENTO', shared: 'Condiviso da Mana', servings: 'Porzioni', prep: 'Preparazione', cook: 'Cottura', optional: 'facoltativo', source: 'Fonte', minute: 'min' },
  fr: { ingredients: 'INGRÉDIENTS', preparation: 'PRÉPARATION', shared: 'Partagé depuis Mana', servings: 'Portions', prep: 'Préparation', cook: 'Cuisson', optional: 'facultatif', source: 'Source', minute: 'min' },
  pl: { ingredients: 'SKŁADNIKI', preparation: 'SPOSÓB PRZYGOTOWANIA', shared: 'Udostępnione z Mana', servings: 'Porcje', prep: 'Przygotowanie', cook: 'Gotowanie', optional: 'opcjonalnie', source: 'Źródło', minute: 'min' },
};

export function formatRecipeShare(recipe: Recipe): string {
  const copy = shareCopy[recipe.outputLanguage];
  const metadata = [
    recipe.servings ? `${copy.servings}: ${recipe.servings}` : null,
    recipe.preparationTime ? `${copy.prep}: ${recipe.preparationTime} ${copy.minute}` : null,
    recipe.cookingTime ? `${copy.cook}: ${recipe.cookingTime} ${copy.minute}` : null,
  ].filter(Boolean).join(' · ');
  const ingredients = recipe.ingredients.map((ingredient) => `• ${formatIngredient(ingredient, copy.optional)}`).join('\n');
  const steps = recipe.steps.map((step, index) => `${index + 1}. ${step.text}`).join('\n');
  const parts = [
    `🍽️ ${recipe.title}`,
    categoryLabels[recipe.outputLanguage][recipe.category],
    metadata,
    recipe.description,
    copy.ingredients,
    ingredients,
    copy.preparation,
    steps,
    recipe.notes.length ? recipe.notes.join('\n') : null,
    recipe.sourceUrl ?? (recipe.sourceName ? `${copy.source}: ${recipe.sourceName}` : null),
    copy.shared,
  ].filter(Boolean);
  return parts.join('\n\n');
}
