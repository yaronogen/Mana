/**
 * Questions the photo reader asks only when it really could not tell what a recipe says: a word or number it
 * couldn't read, or an old unit with more than one meaning. Each option is a full replacement for that line,
 * so choosing one is just an edit the user could have typed. They are never saved with the recipe.
 */
export type Clarification = {
  target: 'title' | 'ingredient' | 'step';
  /** Position of the ingredient or step it is about (0-based); null for the title. */
  index: number | null;
  question: string;
  options: string[];
};

/** Keeps only questions that point at a line the recipe really has, with at least two distinct options. */
export function usableClarifications(list: Clarification[], counts: { ingredients: number; steps: number }): Clarification[] {
  return list.filter((item) => {
    const options = new Set(item.options.map((option) => option.trim()).filter(Boolean));
    if (options.size < 2 || !item.question.trim()) return false;
    if (item.target === 'title') return item.index === null || item.index === 0;
    const count = item.target === 'ingredient' ? counts.ingredients : counts.steps;
    return item.index !== null && Number.isInteger(item.index) && item.index >= 0 && item.index < count;
  }).map((item) => ({ ...item, index: item.target === 'title' ? null : item.index, options: [...new Set(item.options.map((option) => option.trim()).filter(Boolean))] }));
}

/** Questions the user left open stay visible on the saved recipe as "please check" warnings. */
export const openQuestionWarnings = (open: Clarification[]) => open.map((item) => item.question.trim());
