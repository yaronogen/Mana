import { create } from 'zustand';
import type { Recipe } from '../domain/recipe';

type ImportDraftState = { draft: Recipe | null; setDraft: (draft: Recipe | null) => void };
export const useImportDraft = create<ImportDraftState>((set) => ({ draft: null, setDraft: (draft) => set({ draft }) }));
