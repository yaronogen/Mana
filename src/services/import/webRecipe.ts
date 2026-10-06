// Web page recipe extraction shared by the app and the `recipe-process` Edge Function.
// Keep this module free of imports so Deno can load it directly from the function.
//
// Token strategy: the Edge Function downloads the page, but the model never sees raw HTML.
// 1. Most recipe sites publish a schema.org Recipe (JSON-LD). It is read deterministically and
//    reduced to a compact text of title, servings, times, ingredients and steps.
// 2. If the recipe is already in the requested language, no model call is made at all.
// 3. Without structured data, readable page text (scripts, navigation and markup removed) is
//    capped and sent through the regular text import.

export type WebRecipe = {
  title: string;
  description: string | null;
  language: string | null;
  servings: number | null;
  preparationTime: number | null;
  cookingTime: number | null;
  totalTime: number | null;
  ingredients: string[];
  steps: string[];
  keywords: string[];
  categoryHint: string | null;
  sourceUrl: string;
  sourceName: string | null;
  imageUrl: string | null;
};

export type WebPageExtraction =
  | { kind: 'structured'; recipe: WebRecipe }
  | { kind: 'text'; text: string; language: string | null; imageUrl: string | null };

export const MAX_PAGE_TEXT_CHARACTERS = 12_000;
const MAX_DESCRIPTION_CHARACTERS = 280;

/** Returns the URL when the pasted input is a single web link, otherwise null. No network access. */
export function extractRecipeUrl(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value) || value.length > 2048) return null;
  if (/^https?:\/\/[^/?#\s]+\.[^/?#\s]+/i.test(value)) return value;
  if (/^www\.[^/?#\s]+\.[^/?#\s]+/i.test(value)) return `https://${value}`;
  return null;
}

/** Server-side guard: only public http(s) hosts may be fetched. */
export function isFetchableUrl(value: string): boolean {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '80' && url.port !== '443') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host.includes('.') && !host.includes(':')) return false;
  if (host === 'localhost' || /\.(localhost|local|internal|lan|home|arpa)$/.test(host)) return false;
  if (host.includes(':')) return false; // IPv6 literals are never needed for recipe sites.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return false;
  return true;
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', times: '×' };

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function cleanText(value: string): string {
  return decodeEntities(value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

/** ISO 8601 duration (PT1H30M, P0DT2H) to whole minutes. */
export function durationToMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match || value.trim().toUpperCase() === 'P' || value.trim().toUpperCase() === 'PT') return null;
  const minutes = Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0) + Number(match[4] ?? 0) / 60;
  return minutes > 0 ? Math.round(minutes) : null;
}

function servingsFrom(value: unknown): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === 'number') return Number.isInteger(first) && first > 0 ? first : null;
  if (typeof first !== 'string') return null;
  const match = first.match(/\d+/);
  const count = match ? Number(match[0]) : 0;
  return count > 0 && count < 1000 ? count : null;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  return asArray(node['@type']).some((entry) => typeof entry === 'string' && entry.toLowerCase().replace(/^.*[/:]/, '') === type.toLowerCase());
}

function findRecipeNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findRecipeNode(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const node = value as Record<string, unknown>;
  if (hasType(node, 'Recipe')) return node;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const found = findRecipeNode(node[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function instructionTexts(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof value === 'string') {
    const text = cleanText(value);
    // A single block of text: split on line breaks, or on step numbers when it starts with "1." / "1)".
    const parts = /^1[.)]\s/.test(text) && !text.includes('\n') ? text.split(/\s(?=\d{1,2}[.)]\s)/) : text.split(/\n+/);
    return parts.map((line) => line.replace(/^\d{1,2}[.)]\s*/, '').trim()).filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap((entry) => instructionTexts(entry, depth + 1));
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (node.itemListElement) {
      const steps = instructionTexts(node.itemListElement, depth + 1);
      const sectionName = hasType(node, 'HowToSection') && typeof node.name === 'string' ? cleanText(node.name) : '';
      return sectionName && steps.length ? [`${sectionName}:`, ...steps] : steps;
    }
    const text = typeof node.text === 'string' ? node.text : typeof node.name === 'string' ? node.name : null;
    return text ? instructionTexts(text, depth + 1) : [];
  }
  return [];
}

function stringOrName(value: unknown): string | null {
  const first = asArray(value)[0];
  if (typeof first === 'string') return cleanText(first) || null;
  if (first && typeof first === 'object' && typeof (first as Record<string, unknown>).name === 'string') {
    return cleanText((first as Record<string, string>).name) || null;
  }
  return null;
}

function absoluteImageUrl(value: unknown, pageUrl: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), pageUrl);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

/** First usable image from schema.org `image` (string, ImageObject, or arrays of either). */
function imageFrom(value: unknown, pageUrl: string): string | null {
  for (const entry of asArray(value)) {
    const candidate = entry && typeof entry === 'object'
      ? (entry as Record<string, unknown>).url ?? (entry as Record<string, unknown>).contentUrl
      : entry;
    const url = absoluteImageUrl(candidate, pageUrl);
    if (url) return url;
  }
  return null;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? '').trim() : null;
}

function metaContent(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attribute(tag, 'property') ?? attribute(tag, 'name'))?.toLowerCase() === key) return attribute(tag, 'content');
  }
  return null;
}

export function pageImage(html: string, pageUrl: string): string | null {
  return absoluteImageUrl(metaContent(html, 'og:image') ?? metaContent(html, 'twitter:image'), pageUrl);
}

export function pageLanguage(html: string): string | null {
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0];
  const lang = (htmlTag && attribute(htmlTag, 'lang')) ?? metaContent(html, 'og:locale');
  return lang ? lang.replace('_', '-') : null;
}

function readRecipeFromJsonLd(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    const raw = block[1].trim().replace(/^<!--|-->$/g, '');
    let data: unknown;
    try { data = JSON.parse(raw); } catch {
      try { data = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ')); } catch { continue; }
    }
    const recipe = findRecipeNode(data);
    if (recipe) return recipe;
  }
  return null;
}

export function extractStructuredRecipe(html: string, pageUrl: string): WebRecipe | null {
  const node = readRecipeFromJsonLd(html);
  if (!node) return null;
  const ingredients = asArray(node.recipeIngredient ?? node.ingredients)
    .filter((entry): entry is string => typeof entry === 'string')
    .map(cleanText).filter(Boolean);
  const steps = instructionTexts(node.recipeInstructions);
  const title = stringOrName(node.name) ?? stringOrName(node.headline);
  if (!title || !ingredients.length || !steps.length) return null;
  const description = typeof node.description === 'string' ? cleanText(node.description) : '';
  const keywords = asArray(node.keywords).flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
    .map((entry) => cleanText(entry)).filter((entry) => entry && entry.length <= 40);
  let hostname: string | null = null;
  try { hostname = new URL(pageUrl).hostname.replace(/^www\./, ''); } catch { /* keep null */ }
  return {
    title: title.slice(0, 140),
    description: description ? description.slice(0, MAX_DESCRIPTION_CHARACTERS) : null,
    language: stringOrName(node.inLanguage) ?? pageLanguage(html),
    servings: servingsFrom(node.recipeYield ?? node.yield),
    preparationTime: durationToMinutes(node.prepTime),
    cookingTime: durationToMinutes(node.cookTime),
    totalTime: durationToMinutes(node.totalTime),
    ingredients: ingredients.slice(0, 100),
    steps: steps.slice(0, 80),
    keywords: [...new Set(keywords)].slice(0, 8),
    categoryHint: stringOrName(node.recipeCategory),
    sourceUrl: pageUrl,
    sourceName: metaContent(html, 'og:site_name') ?? hostname,
    imageUrl: imageFrom(node.image, pageUrl) ?? pageImage(html, pageUrl),
  };
}

/** Readable page text without scripts, styles, navigation or markup, capped for the model. */
export function extractPageText(html: string, maxCharacters = MAX_PAGE_TEXT_CHARACTERS): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const text = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe|template|button|select)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|section|article|table)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, maxCharacters);
}

export function extractWebPage(html: string, pageUrl: string): WebPageExtraction {
  const recipe = extractStructuredRecipe(html, pageUrl);
  if (recipe) return { kind: 'structured', recipe };
  return { kind: 'text', text: extractPageText(html), language: pageLanguage(html), imageUrl: pageImage(html, pageUrl) };
}

/** Compact model input: only the recipe facts, no page markup. */
export function formatWebRecipeForModel(recipe: WebRecipe): string {
  const times = [
    recipe.preparationTime !== null ? `prep ${recipe.preparationTime} min` : null,
    recipe.cookingTime !== null ? `cook ${recipe.cookingTime} min` : null,
    recipe.totalTime !== null ? `total ${recipe.totalTime} min` : null,
  ].filter(Boolean).join(', ');
  return [
    recipe.title,
    recipe.description,
    recipe.servings !== null ? `Servings: ${recipe.servings}` : null,
    times ? `Times: ${times}` : null,
    recipe.categoryHint ? `Category: ${recipe.categoryHint}` : null,
    recipe.keywords.length ? `Keywords: ${recipe.keywords.join(', ')}` : null,
    'Ingredients:',
    ...recipe.ingredients.map((line) => `- ${line}`),
    'Steps:',
    ...recipe.steps.map((line, index) => `${index + 1}. ${line}`),
  ].filter((line): line is string => Boolean(line)).join('\n');
}

const HEBREW = /[֐-׿]/;

/** True when the structured recipe can be saved as-is for the target language (no translation needed). */
export function isRecipeInLanguage(recipe: WebRecipe, targetLanguage: string): boolean {
  const declared = recipe.language?.toLowerCase().split('-')[0] ?? null;
  const sample = [recipe.title, ...recipe.ingredients, ...recipe.steps].join(' ');
  const hebrewShare = (sample.match(new RegExp(HEBREW.source, 'g'))?.length ?? 0) / Math.max(1, sample.replace(/[\s\d\p{P}]/gu, '').length);
  if (targetLanguage === 'he') return (declared === 'he' || declared === 'iw' || declared === null) && hebrewShare > 0.5;
  return declared === targetLanguage && hebrewShare < 0.05;
}

const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ['drinks', /drink|cocktail|smoothie|beverage|getränk|שתי|קוקטייל|שייק/i],
  ['desserts', /dessert|nachtisch|nachspeise|קינוח|pudding|ice cream|eis\b|גלידה/i],
  ['baking', /bak|cake|bread|cookie|kuchen|brot|gebäck|plätzchen|עוג|לחם|מאפ|אפי/i],
  ['soups', /soup|suppe|eintopf|מרק/i],
  ['salads', /salad|salat|סלט/i],
  ['breakfast', /breakfast|brunch|frühstück|ארוחת בוקר/i],
  ['pasta-rice', /pasta|noodle|rice|risotto|nudel|reis|פסטה|אורז|ריזוטו/i],
  ['sauces-dips', /sauce|dip|dressing|soße|sauce|רוטב|ממרח|מטבל/i],
  ['starters', /starter|appetizer|vorspeise|ראשונ/i],
  ['side-dishes', /side|beilage|תוספ/i],
  ['snacks', /snack|חטיף|נשנוש/i],
  ['main-courses', /main|meat|beef|chicken|fish|hauptgericht|fleisch|huhn|fisch|עיקרי|בשר|עוף|דג/i],
];

/** Best-effort category for recipes saved without a model call; the user can change it in review. */
export function guessCategory(recipe: WebRecipe): string {
  for (const source of [recipe.categoryHint, recipe.title, recipe.keywords.join(' ')]) {
    if (!source) continue;
    const hit = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(source));
    if (hit) return hit[0];
  }
  return 'other';
}

// Instagram posts and reels. Shared from the Instagram app, Mana receives only the post link; the recipe
// is in the caption. The public embed page (the one websites use to embed a post) carries the full
// caption; the post page's og:description is a fallback that may be shortened. Private posts have neither.

export type InstagramCaption = { caption: string; author: string | null; imageUrl: string | null };

/** The post code of an Instagram post or reel link ("instagram.com/reel/ABC123/?igsh=…" → "ABC123"); null for other links. */
export function instagramPostCode(value: string): string | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (!/^(www\.|m\.)?instagram\.com$/i.test(url.hostname)) return null;
  return url.pathname.match(/^\/(?:[A-Za-z0-9._]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]{5,40})\/?$/)?.[1] ?? null;
}

export const instagramPostUrl = (code: string) => `https://www.instagram.com/p/${code}/`;
export const instagramEmbedUrl = (code: string) => `https://www.instagram.com/p/${code}/embed/captioned/`;

/** Reads the caption from an Instagram embed page, or from a post page's og:description. */
export function extractInstagramCaption(html: string): InstagramCaption | null {
  const start = html.indexOf('<div class="Caption"');
  const imageTag = html.match(/<img\b[^>]*class="[^"]*EmbeddedMediaImage[^"]*"[^>]*>/i)?.[0];
  const embedImage = imageTag ? attribute(imageTag, 'src') : null;
  if (start !== -1) {
    const rest = html.slice(start);
    const end = rest.search(/<div class="CaptionComments"|<div class="Footer"/);
    const block = end === -1 ? rest.slice(0, 20_000) : rest.slice(0, end);
    const username = block.match(/<a\b[^>]*class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/i);
    const caption = cleanText(block.replace(username?.[0] ?? '', '')).slice(0, MAX_PAGE_TEXT_CHARACTERS);
    if (caption) return { caption, author: username ? cleanText(username[1]) || null : null, imageUrl: embedImage };
  }
  // "120 likes, 4 comments - cook on October 1, 2026: "caption"."
  const description = metaContent(html, 'og:description');
  const quoted = description?.match(/^[\s\S]*?\s-\s([A-Za-z0-9._]+)\s[^:]*:\s*"([\s\S]+)"\.?\s*$/);
  if (!quoted) return null;
  const caption = quoted[2].trim().slice(0, MAX_PAGE_TEXT_CHARACTERS);
  return caption ? { caption, author: quoted[1], imageUrl: metaContent(html, 'og:image') } : null;
}

/** Model input for a caption: who posted it, then the caption as written. */
export function formatInstagramForModel({ caption, author }: InstagramCaption): string {
  return [author ? `Instagram post by @${author}` : 'Instagram post', caption].join('\n\n');
}
