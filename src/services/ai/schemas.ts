import { z } from 'zod';
import { RECIPE_CATEGORIES } from '../../domain/recipe';

export const recipeDraftSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(800).nullable(),
  sourceLanguage: z.string().min(2).max(16),
  sourceUrl: z.string().url().nullable().catch(null),
  sourceName: z.string().max(160).nullable(),
  // Set by the Edge Function for link imports, never by the model.
  imageUrl: z.string().url().max(2048).nullable().optional().catch(null),
  servings: z.number().int().positive().nullable(),
  preparationTime: z.number().int().nonnegative().nullable(),
  cookingTime: z.number().int().nonnegative().nullable(),
  totalTime: z.number().int().nonnegative().nullable(),
  ingredients: z.array(z.object({
    originalText: z.string().max(300).nullable(),
    quantityText: z.string().max(80).nullable(),
    quantityValue: z.number().finite().nullable(),
    unit: z.string().max(40).nullable(),
    ingredient: z.string().trim().min(1).max(240),
    preparation: z.string().max(240).nullable(),
    isOptional: z.boolean(),
  })).min(1).max(100),
  steps: z.array(z.object({ text: z.string().trim().min(1).max(1500) })).min(1).max(80),
  category: z.enum(RECIPE_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
  notes: z.array(z.string().trim().min(1).max(600)).max(20),
  warnings: z.array(z.string().trim().max(300)).max(10).default([]),
});

export type RecipeDraft = z.infer<typeof recipeDraftSchema>;
