import Anthropic from 'npm:@anthropic-ai/sdk@^0.131.0';
import { buildRecipeUserPrompt, buildTranslateUserPrompt, RECIPE_SYSTEM_PROMPT, RECIPE_TRANSLATE_SYSTEM_PROMPT } from '../../../src/services/ai/prompts.ts';

const categories = ['starters', 'soups', 'salads', 'main-courses', 'side-dishes', 'pasta-rice', 'breakfast', 'baking', 'desserts', 'snacks', 'sauces-dips', 'drinks', 'other'];

const recipeSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'description', 'sourceLanguage', 'sourceUrl', 'sourceName', 'servings', 'preparationTime', 'cookingTime', 'totalTime', 'ingredients', 'steps', 'category', 'tags', 'notes', 'warnings'],
  properties: {
    title: { type: 'string' }, description: { type: ['string', 'null'] }, sourceLanguage: { type: 'string' },
    sourceUrl: { type: ['string', 'null'] }, sourceName: { type: ['string', 'null'] }, servings: { type: ['integer', 'null'] },
    preparationTime: { type: ['integer', 'null'] }, cookingTime: { type: ['integer', 'null'] }, totalTime: { type: ['integer', 'null'] },
    ingredients: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['originalText', 'quantityText', 'quantityValue', 'unit', 'ingredient', 'preparation', 'isOptional'], properties: {
      originalText: { type: ['string', 'null'] }, quantityText: { type: ['string', 'null'] }, quantityValue: { type: ['number', 'null'] }, unit: { type: ['string', 'null'] },
      ingredient: { type: 'string' }, preparation: { type: ['string', 'null'] }, isOptional: { type: 'boolean' },
    } } },
    steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } } },
    category: { type: 'string', enum: categories }, tags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } },
  },
};

const strings = { type: 'array', items: { type: 'string' } };
const translationSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'description', 'ingredients', 'steps', 'tags', 'notes', 'warnings'],
  properties: {
    title: { type: 'string' }, description: { type: ['string', 'null'] },
    ingredients: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['ingredient', 'preparation', 'unit'], properties: {
      ingredient: { type: 'string' }, preparation: { type: ['string', 'null'] }, unit: { type: ['string', 'null'] },
    } } },
    steps: strings, tags: strings, notes: strings, warnings: strings,
  },
};

export type RecipeAiProvider = {
  extractAndTranslate: (sourceText: string, targetLanguage: string) => Promise<{ hasRecipe: boolean; recipe: unknown | null }>;
  /** Translates the wording of an already saved recipe (see translatableContent in the app). */
  translateSaved: (contentJson: string, targetLanguage: string) => Promise<unknown>;
};

const envelopeSchema = {
  type: 'object', additionalProperties: false, required: ['hasRecipe', 'recipe'],
  properties: { hasRecipe: { type: 'boolean' }, recipe: { anyOf: [recipeSchema, { type: 'null' }] } },
};

export class ProviderUnavailableError extends Error {}

// Claude via the official Anthropic SDK. Model and effort are server-side secrets so they can be tuned without an app release.
class ClaudeRecipeProvider implements RecipeAiProvider {
  async extractAndTranslate(sourceText: string, targetLanguage: string) {
    const result = await this.structuredCall(RECIPE_SYSTEM_PROMPT, buildRecipeUserPrompt(sourceText, targetLanguage), envelopeSchema, targetLanguage);
    if (!result || typeof result !== 'object') throw new ProviderUnavailableError('invalid_provider_response');
    const structured = result as { hasRecipe?: unknown; recipe?: unknown };
    if (typeof structured.hasRecipe !== 'boolean') throw new ProviderUnavailableError('invalid_provider_response');
    return { hasRecipe: structured.hasRecipe, recipe: structured.recipe ?? null };
  }

  translateSaved(contentJson: string, targetLanguage: string) {
    return this.structuredCall(RECIPE_TRANSLATE_SYSTEM_PROMPT, buildTranslateUserPrompt(contentJson, targetLanguage), translationSchema, targetLanguage);
  }

  /** One structured-output call; returns the parsed JSON. */
  private async structuredCall(system: string, prompt: string, schema: Record<string, unknown>, targetLanguage: string): Promise<unknown> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new ProviderUnavailableError('provider_not_configured');
    if (!['en', 'de', 'he'].includes(targetLanguage)) throw new ProviderUnavailableError('target_language_not_supported');
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 90_000 });
    let response: Awaited<ReturnType<typeof client.beta.messages.create>>;
    try {
      response = await client.beta.messages.create({
        model: Deno.env.get('CLAUDE_MODEL') ?? 'claude-opus-5-5',
        max_tokens: 16000,
        // Extracting or translating an already-compact recipe needs little reasoning; low effort keeps token use down.
        output_config: {
          effort: (Deno.env.get('CLAUDE_EFFORT') ?? 'low') as 'low' | 'medium' | 'high',
          format: { type: 'json_schema', schema },
        },
        // If a safety classifier declines a request, the API retries it on a fallback model inside the same call.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) throw new ProviderUnavailableError(`provider_request_failed_${error.status ?? 'network'}`);
      throw error;
    }
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') throw new ProviderUnavailableError(`provider_${response.stop_reason}`);
    const content = response.content.find((block) => block.type === 'text')?.text;
    if (typeof content !== 'string') throw new ProviderUnavailableError('invalid_provider_response');
    return JSON.parse(content) as unknown;
  }
}

export function createRecipeAiProvider(): RecipeAiProvider {
  const provider = Deno.env.get('MANA_AI_PROVIDER') ?? 'anthropic';
  if (provider === 'anthropic') return new ClaudeRecipeProvider();
  throw new ProviderUnavailableError('provider_not_supported');
}
