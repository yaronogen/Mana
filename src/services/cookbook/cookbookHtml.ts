import type { AppLanguage, Recipe } from '../../domain/recipe';
import { formatIngredient } from '../../domain/ingredientText';
import { displayIngredient } from '../../domain/scaling';
import { convertTemperatures, type UnitSystem } from '../../domain/units';
import { textDirectionOf } from '../../i18n/textDirection';
import { categoryLabels, resources } from '../../i18n/resources';

/**
 * "My cookbook" as print-ready HTML for a PDF: a cover page, a contents page, then every recipe on a
 * page of its own. Recipes are numbered; the contents page lists those numbers, because the PDF
 * renderers on iOS and Android cannot report page numbers. Amounts follow the user's measurement
 * setting with the recipe's own amount alongside, as in the app.
 */
export type CookbookOptions = {
  title: string;
  author: string;
  language: AppLanguage;
  recipes: Recipe[];
  /** Recipe photos as data: URIs, keyed by recipe id; recipes without one get no photo. */
  images?: Record<string, string>;
  /** Estimated kcal per serving, keyed by recipe id; only fresh estimates are passed. */
  kcal?: Record<string, number>;
  unitSystem?: UnitSystem;
  date?: Date;
};

/** Keeps the PDF (with embedded photos) a size phones can build and mail. */
export const MAX_COOKBOOK_RECIPES = 60;

const PAPER = { a4: { width: 595, height: 842, css: 'A4' }, letter: { width: 612, height: 792, css: 'letter' } } as const;
/** US measurements suggest a US printer: Letter paper; everyone else gets A4. */
export const paperFor = (unitSystem: UnitSystem = 'original') => unitSystem === 'us' ? PAPER.letter : PAPER.a4;

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => key in values ? String(values[key]) : match);

const dir = (text: string, fallback: AppLanguage) => (textDirectionOf(text) ?? (fallback === 'he' ? 'rtl' : 'ltr'));

function recipePage(recipe: Recipe, number: number, options: CookbookOptions): string {
  const copy = resources[recipe.outputLanguage];
  const language = recipe.outputLanguage;
  const unitSystem = options.unitSystem ?? 'original';
  const facts = [
    recipe.servings !== null ? `${copy.servings}: ${recipe.servings}` : null,
    recipe.preparationTime !== null ? `${copy.prepTime}: ${recipe.preparationTime} ${copy.minutes}` : null,
    recipe.cookingTime !== null ? `${copy.cookTime}: ${recipe.cookingTime} ${copy.minutes}` : null,
    recipe.totalTime !== null ? `${copy.totalTime}: ${recipe.totalTime} ${copy.minutes}` : null,
    options.kcal?.[recipe.id] ? fill(copy.kcalPerServing, { kcal: options.kcal[recipe.id] }) : null,
  ].filter((fact): fact is string => fact !== null);
  const ingredients = recipe.ingredients.map((ingredient) => {
    const shown = displayIngredient(ingredient, { factor: 1, unitSystem, language });
    const original = shown.original ? ` <span class="original">(${escapeHtml(shown.original)})</span>` : '';
    return `<li>${escapeHtml(formatIngredient(shown.ingredient, copy.optional))}${original}</li>`;
  }).join('');
  const steps = recipe.steps.map((step) => `<li>${escapeHtml(convertTemperatures(step.text, unitSystem))}</li>`).join('');
  const image = options.images?.[recipe.id];
  const source = recipe.sourceName ?? recipe.sourceUrl;
  return `<section class="page recipe" dir="${dir(recipe.title, language)}" lang="${language}" id="recipe-${number}">
  <div class="kicker"><span class="number">${number}</span> ${escapeHtml(categoryLabels[language][recipe.category])}</div>
  <h2>${escapeHtml(recipe.title)}</h2>
  ${recipe.description ? `<p class="description">${escapeHtml(recipe.description)}</p>` : ''}
  ${facts.length ? `<p class="facts">${facts.map(escapeHtml).join('<span class="dot">·</span>')}</p>` : ''}
  ${image ? `<img class="photo" src="${escapeHtml(image)}" alt="">` : ''}
  <h3>${escapeHtml(copy.ingredients)}</h3>
  <ul class="ingredients">${ingredients}</ul>
  ${steps ? `<h3>${escapeHtml(copy.preparation)}</h3><ol class="steps">${steps}</ol>` : ''}
  ${recipe.notes.length ? `<h3>${escapeHtml(copy.notes)}</h3>${recipe.notes.map((note) => `<p class="note">${escapeHtml(note)}</p>`).join('')}` : ''}
  ${source ? `<p class="source">${escapeHtml(copy.source)}: ${escapeHtml(source)}</p>` : ''}
</section>`;
}

export function buildCookbookHtml(options: CookbookOptions): string {
  const copy = resources[options.language];
  const rtl = options.language === 'he';
  const paper = paperFor(options.unitSystem);
  const date = new Intl.DateTimeFormat(options.language, { year: 'numeric', month: 'long', day: 'numeric' }).format(options.date ?? new Date());
  const count = options.recipes.length === 1 ? copy.cookbookOneRecipe : fill(copy.cookbookRecipeCount, { n: options.recipes.length });
  const contents = options.recipes.map((recipe, index) => `<li><a href="#recipe-${index + 1}"><span class="number">${index + 1}</span>
    <span class="entry"><bdi>${escapeHtml(recipe.title)}</bdi></span>
    <span class="category">${escapeHtml(categoryLabels[options.language][recipe.category])}</span></a></li>`).join('');
  return `<!doctype html>
<html lang="${options.language}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(options.title)}</title>
<style>
  @page { size: ${paper.css}; margin: 18mm 17mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, "Helvetica Neue", Roboto, "Noto Sans", "Noto Sans Hebrew", Arial, sans-serif; color: #252C24; font-size: 11pt; line-height: 1.5; }
  .page { page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .cover { min-height: 240mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .brand { font-size: 20pt; font-weight: 800; color: #385943; letter-spacing: -0.5pt; direction: ltr; }
  .brand .n { position: relative; display: inline-block; }
  .brand .n::before { content: ""; position: absolute; left: 50%; top: 0.02em; width: 0.21em; height: 0.21em; margin-left: -0.105em; border-radius: 50%; background: #D87B4D; }
  .cover h1 { font-size: 36pt; line-height: 1.15; margin: 18mm 0 6mm; color: #252C24; }
  .cover .author { font-size: 15pt; margin: 0 0 3mm; }
  .cover .meta { color: #616960; font-size: 11pt; margin: 0; }
  .rule { width: 30mm; height: 3px; background: #D87B4D; border-radius: 2px; margin: 10mm auto 0; }
  .contents h2 { font-size: 22pt; margin: 0 0 8mm; }
  .contents ol { list-style: none; padding: 0; margin: 0; }
  .contents li { border-bottom: 1px solid #E8E4DA; break-inside: avoid; }
  .contents a { display: flex; align-items: baseline; gap: 4mm; padding: 2.6mm 0; color: inherit; text-decoration: none; }
  .contents .number { min-width: 8mm; font-weight: 800; color: #385943; }
  .contents .entry { flex: 1; font-weight: 600; }
  .contents .category { color: #616960; font-size: 9.5pt; }
  .recipe .kicker { color: #385943; font-size: 9pt; font-weight: 700; letter-spacing: 1pt; text-transform: uppercase; }
  .recipe .kicker .number { display: inline-block; min-width: 7mm; padding: 0.6mm 2mm; margin-inline-end: 2mm; border-radius: 3mm; background: #385943; color: #FFFFFF; text-align: center; letter-spacing: 0; }
  .recipe h2 { font-size: 22pt; line-height: 1.2; margin: 3mm 0 3mm; }
  .recipe h3 { font-size: 13pt; color: #385943; margin: 6mm 0 2mm; break-after: avoid; }
  .description { color: #4A5249; margin: 0 0 3mm; }
  .facts { color: #616960; font-size: 10pt; margin: 0 0 4mm; }
  .facts .dot { margin: 0 2mm; }
  .photo { display: block; width: 100%; max-height: 80mm; object-fit: cover; border-radius: 4mm; margin: 2mm 0 2mm; }
  .ingredients { margin: 0; padding-inline-start: 5mm; }
  .ingredients li { margin: 1mm 0; break-inside: avoid; }
  .original { color: #616960; font-size: 9.5pt; }
  .steps { margin: 0; padding-inline-start: 6mm; }
  .steps li { margin: 0 0 2.5mm; break-inside: avoid; }
  .note { margin: 1mm 0; color: #4A5249; }
  .source { margin-top: 6mm; color: #616960; font-size: 9pt; overflow-wrap: anywhere; }
</style>
</head>
<body>
<section class="page cover">
  <div class="brand">Ma<span class="n">n</span>a</div>
  <h1 dir="${dir(options.title, options.language)}">${escapeHtml(options.title)}</h1>
  ${options.author.trim() ? `<p class="author">${escapeHtml(fill(copy.cookbookBy, { name: options.author.trim() }))}</p>` : ''}
  <p class="meta">${escapeHtml(count)} · ${escapeHtml(date)}</p>
  <div class="rule"></div>
</section>
<section class="page contents">
  <h2>${escapeHtml(copy.cookbookContents)}</h2>
  <ol>${contents}</ol>
</section>
${options.recipes.map((recipe, index) => recipePage(recipe, index + 1, options)).join('\n')}
</body>
</html>`;
}
