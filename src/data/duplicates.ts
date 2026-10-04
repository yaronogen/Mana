import { getRecipes } from './database';

export async function hasDuplicateTitle(title: string, exceptId?: string): Promise<boolean> {
  const normalized = title.trim().toLocaleLowerCase();
  if (!normalized) return false;
  const matches = await getRecipes({ query: normalized });
  return matches.some((recipe) => recipe.id !== exceptId && recipe.title.trim().toLocaleLowerCase() === normalized);
}
