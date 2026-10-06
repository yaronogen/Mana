import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createRecipeAiProvider, ProviderUnavailableError } from '../_shared/recipeAiProvider.ts';
import { fetchRecipePage, PageFetchError } from '../_shared/fetchRecipePage.ts';
import {
  extractInstagramCaption, extractWebPage, formatInstagramForModel, formatWebRecipeForModel, instagramEmbedUrl, instagramPostCode, instagramPostUrl,
  isFetchableUrl, isRecipeInLanguage, type InstagramCaption,
} from '../../../src/services/import/webRecipe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const languages: Record<string, string> = { en: 'English', de: 'German', he: 'Hebrew' };
const maxCharacters = 30_000;
const minPageTextCharacters = 120;

const maxSharedRecipeCharacters = 60_000;
const minCaptionCharacters = 30;

/** Ten random letters and digits for a share link (62^10 possibilities). */
function shareCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  // 256 is not a multiple of 62; the slight bias is irrelevant for unguessable link codes.
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function isSharedRecipeShape(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const recipe = value as Record<string, unknown>;
  return typeof recipe.title === 'string' && recipe.title.trim().length > 0 && recipe.title.length <= 140
    && typeof recipe.outputLanguage === 'string' && !!languages[recipe.outputLanguage]
    && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && recipe.ingredients.length <= 100
    && Array.isArray(recipe.steps) && recipe.steps.length > 0 && recipe.steps.length <= 80;
}

/** The caption of a public Instagram post: the embed page first, then the post page. Null when neither has it. */
async function readInstagramCaption(code: string): Promise<InstagramCaption | null> {
  for (const url of [instagramEmbedUrl(code), instagramPostUrl(code)]) {
    try {
      const caption = extractInstagramCaption((await fetchRecipePage(url)).html);
      if (caption && caption.caption.length >= minCaptionCharacters) return caption;
    } catch (error) {
      if (!(error instanceof PageFetchError)) throw error;
    }
  }
  return null;
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  try {
    const authorization = request.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!authorization || !supabaseUrl || !anonKey || !serviceKey) return json(503, { error: 'service_unavailable' });

    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json(401, { error: 'unauthorized' });

    const requestBody: unknown = await request.json();
    if (!requestBody || typeof requestBody !== 'object') return json(400, { error: 'invalid_request' });
    const body = requestBody as { action?: unknown; text?: unknown; url?: unknown; targetLanguage?: unknown; content?: unknown; recipe?: unknown; code?: unknown };

    // Stores a copy of a recipe for another Mana user and returns its link code. Does not consume an import.
    // The receiving app validates the recipe fully (Zod) before showing it; this is a shape and size check.
    if (body.action === 'share') {
      if (!isSharedRecipeShape(body.recipe)) return json(400, { error: 'invalid_request' });
      if (JSON.stringify(body.recipe).length > maxSharedRecipeCharacters) return json(413, { error: 'text_too_long' });
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const code = shareCode();
      const { data: allowed, error: shareError } = await admin.rpc('create_shared_recipe', { p_user_id: user.id, p_code: code, p_recipe: body.recipe });
      if (shareError) return json(503, { error: 'service_unavailable' });
      if (!allowed) return json(429, { error: 'share_limit_reached' });
      return json(200, { code });
    }

    // Returns a shared recipe by its link code, while the link has not expired.
    if (body.action === 'receive') {
      if (typeof body.code !== 'string' || !/^[A-Za-z0-9]{10}$/.test(body.code)) return json(404, { error: 'not_found' });
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: shared, error: receiveError } = await admin.from('shared_recipes').select('recipe')
        .eq('code', body.code).gt('expires_at', new Date().toISOString()).maybeSingle();
      if (receiveError) return json(503, { error: 'service_unavailable' });
      if (!shared) return json(404, { error: 'not_found' });
      return json(200, { recipe: shared.recipe });
    }

    // Plan and monthly usage for the billing screen; does not consume an import.
    if (body.action === 'usage') {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: status, error: statusError } = await admin.rpc('recipe_import_status', { p_user_id: user.id });
      if (statusError) return json(503, { error: 'service_unavailable' });
      return json(200, status);
    }

    if (typeof body.targetLanguage !== 'string' || !languages[body.targetLanguage]) return json(400, { error: 'invalid_request' });
    const targetLanguage = body.targetLanguage;

    // Translates the wording of a recipe the user already saved, to show it in another app language.
    // It has its own monthly allowance and never consumes an import.
    if (body.action === 'translate') {
      if (!body.content || typeof body.content !== 'object') return json(400, { error: 'invalid_request' });
      const contentJson = JSON.stringify(body.content);
      if (contentJson.length > maxCharacters) return json(413, { error: 'text_too_long' });
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: allowed, error: quotaError } = await admin.rpc('consume_recipe_translation', { p_user_id: user.id });
      if (quotaError) return json(503, { error: 'service_unavailable' });
      if (!allowed) return json(429, { error: 'translation_limit_reached' });
      return json(200, await createRecipeAiProvider().translateSaved(contentJson, targetLanguage));
    }

    let pageUrl: string | null = null;
    let imageUrl: string | null = null;
    let text: string;
    if (typeof body.url === 'string') {
      pageUrl = body.url.trim();
      if (pageUrl.length > 2048 || !isFetchableUrl(pageUrl)) return json(400, { error: 'invalid_url' });
      text = '';
    } else if (typeof body.text === 'string') {
      text = body.text.trim();
      if (!text) return json(422, { error: 'recipe_not_found' });
      if (text.length > maxCharacters) return json(413, { error: 'text_too_long' });
    } else {
      return json(400, { error: 'invalid_request' });
    }

    // Instagram post or reel: the recipe is in the caption. It is read before the import is counted,
    // so a private post or a blocked page does not use up one of the user's imports.
    let sourceName: string | null = null;
    const instagramCode = pageUrl ? instagramPostCode(pageUrl) : null;
    if (instagramCode) {
      const caption = await readInstagramCaption(instagramCode);
      if (!caption) return json(422, { error: 'instagram_caption_unavailable' });
      text = formatInstagramForModel(caption);
      pageUrl = instagramPostUrl(instagramCode);
      imageUrl = caption.imageUrl;
      sourceName = caption.author ? `@${caption.author} · Instagram` : 'Instagram';
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: allowed, error: quotaError } = await admin.rpc('consume_recipe_import', { p_user_id: user.id });
    if (quotaError) return json(503, { error: 'service_unavailable' });
    if (!allowed) return json(429, { error: 'daily_limit_reached' });

    if (pageUrl && !instagramCode) {
      let html: string;
      try {
        ({ html } = await fetchRecipePage(pageUrl));
      } catch (error) {
        if (error instanceof PageFetchError) return json(424, { error: 'page_unavailable' });
        throw error;
      }
      const page = extractWebPage(html, pageUrl);
      // Already in the requested language: return the structured facts without any model call.
      if (page.kind === 'structured' && isRecipeInLanguage(page.recipe, targetLanguage)) return json(200, { source: page.recipe });
      // Otherwise only the compact recipe text (or capped readable page text) goes to the model.
      text = page.kind === 'structured' ? formatWebRecipeForModel(page.recipe) : page.text;
      imageUrl = page.kind === 'structured' ? page.recipe.imageUrl : page.imageUrl;
      if (text.length < minPageTextCharacters) return json(422, { error: 'recipe_not_found' });
    }

    const provider = createRecipeAiProvider();
    const result = await provider.extractAndTranslate(text, targetLanguage);
    if (!result.hasRecipe || !result.recipe) return json(422, { error: 'recipe_not_found' });
    if (pageUrl && typeof result.recipe === 'object') {
      const recipe = result.recipe as Record<string, unknown>;
      recipe.sourceUrl = pageUrl;
      recipe.imageUrl = imageUrl;
      recipe.sourceName = sourceName ?? recipe.sourceName ?? new URL(pageUrl).hostname.replace(/^www\./, '');
    }
    return json(200, result.recipe);
  } catch (error) {
    if (error instanceof ProviderUnavailableError) return json(502, { error: 'provider_unavailable' });
    // Deliberately do not log pasted recipe content or provider responses.
    return json(500, { error: 'processing_failed' });
  }
});
