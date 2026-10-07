import { describe, expect, it } from 'vitest';
import { photoRecipeSchema } from '../services/ai/schemas';
import { openQuestionWarnings, usableClarifications, type Clarification } from './clarifications';

const lot: Clarification = { target: 'ingredient', index: 1, question: "Is this '1 Lot Zucker' (an old unit, about 15 g)?", options: ['1 Lot Zucker (ca. 15 g)', '1 Liter Zucker'] };

describe('photo clarifications', () => {
  it('keeps questions that point at a real line and offer a real choice', () => {
    expect(usableClarifications([lot], { ingredients: 3, steps: 2 })).toEqual([lot]);
    expect(usableClarifications([{ target: 'title', index: null, question: 'Is it "Omas Gugelhupf"?', options: ['Omas Gugelhupf', 'Omas Guglhupf'] }], { ingredients: 1, steps: 1 })).toHaveLength(1);
  });

  it('drops questions about lines that do not exist, and options that are not a choice', () => {
    expect(usableClarifications([{ ...lot, index: 3 }], { ingredients: 3, steps: 2 })).toEqual([]);
    expect(usableClarifications([{ ...lot, index: null }], { ingredients: 3, steps: 2 })).toEqual([]);
    expect(usableClarifications([{ ...lot, target: 'step', index: 2 }], { ingredients: 3, steps: 2 })).toEqual([]);
    expect(usableClarifications([{ ...lot, options: ['1 Lot Zucker', ' 1 Lot Zucker '] }], { ingredients: 3, steps: 2 })).toEqual([]);
    expect(usableClarifications([{ ...lot, question: '  ' }], { ingredients: 3, steps: 2 })).toEqual([]);
  });

  it('turns open questions into "please check" notes', () => {
    expect(openQuestionWarnings([lot])).toEqual([lot.question]);
  });

  it('reads a photo result, and a broken question list never blocks the recipe', () => {
    const recipe = {
      title: 'Gugelhupf', description: null, sourceLanguage: 'de', sourceUrl: null, sourceName: null, servings: null, preparationTime: null, cookingTime: 60, totalTime: null,
      ingredients: [{ originalText: '½ Pfund Mehl', quantityText: '½', quantityValue: 0.5, unit: 'Pfund', ingredient: 'Mehl', preparation: null, isOptional: false }],
      steps: [{ text: 'Eine Stunde backen.' }], category: 'baking', tags: [], notes: [], warnings: [],
    };
    expect(photoRecipeSchema.parse({ ...recipe, clarifications: [lot] }).clarifications).toHaveLength(1);
    expect(photoRecipeSchema.parse({ ...recipe, clarifications: [{ target: 'ingredient', index: 0, question: 'x', options: ['only one'] }] }).clarifications).toEqual([]);
    expect(photoRecipeSchema.parse(recipe).clarifications).toEqual([]);
    // Historic units stay exactly as written.
    expect(photoRecipeSchema.parse(recipe).ingredients[0]).toMatchObject({ quantityText: '½', unit: 'Pfund' });
  });
});
