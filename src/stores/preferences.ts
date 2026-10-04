import { create } from 'zustand';
import { getSetting, setSetting } from '../data/database';
import type { AppLanguage } from '../domain/recipe';
import i18n from '../i18n';
import { applyLayoutDirection } from '../i18n/direction';

export type Appearance = 'system' | 'light' | 'dark';

type PreferencesState = {
  language: AppLanguage;
  appearance: Appearance;
  onboarded: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setAppearance: (appearance: Appearance) => Promise<void>;
  finishOnboarding: () => Promise<void>;
};

export const usePreferences = create<PreferencesState>((set, get) => ({
  language: 'en', appearance: 'system', onboarded: false, hydrated: false,
  hydrate: async () => {
    try {
      const [language, appearance, onboarded] = await Promise.all([
        getSetting('language'), getSetting('appearance'), getSetting('onboarded'),
      ]);
      const nextLanguage: AppLanguage = language === 'de' || language === 'he' ? language : 'en';
      await i18n.changeLanguage(nextLanguage);
      set({
        language: nextLanguage,
        appearance: appearance === 'light' || appearance === 'dark' ? appearance : 'system',
        onboarded: onboarded === 'true', hydrated: true,
      });
      applyLayoutDirection();
    } catch {
      set({ hydrated: true });
    }
  },
  setLanguage: async (language) => {
    await i18n.changeLanguage(language);
    await setSetting('language', language);
    set({ language });
    applyLayoutDirection();
  },
  setAppearance: async (appearance) => {
    await setSetting('appearance', appearance);
    set({ appearance });
  },
  finishOnboarding: async () => {
    await setSetting('onboarded', 'true');
    set({ onboarded: true });
  },
}));
