import { create } from 'zustand';
import type { Clarification } from '../domain/clarifications';
import type { Recipe } from '../domain/recipe';

type ImportDraftState = {
  draft: Recipe | null;
  /** Questions about the draft (photo imports only), shown on the review screen. */
  clarifications: Clarification[];
  setDraft: (draft: Recipe | null, clarifications?: Clarification[]) => void;
};
export const useImportDraft = create<ImportDraftState>((set) => ({
  draft: null, clarifications: [],
  setDraft: (draft, clarifications = []) => set({ draft, clarifications }),
}));
