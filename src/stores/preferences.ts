import { create } from 'zustand';
import { getSetting, setSetting } from '../data/database';
import { isAppLanguage, type AppLanguage } from '../domain/recipe';
import type { UnitSystem } from '../domain/units';
import i18n from '../i18n';
import { applyLayoutDirection } from '../i18n/direction';
import { useTranslations } from './translations';

export type Appearance = 'system' | 'light' | 'dark';

type PreferencesState = {
  language: AppLanguage;
  appearance: Appearance;
  unitSystem: UnitSystem;
  onboarded: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setAppearance: (appearance: Appearance) => Promise<void>;
  setUnitSystem: (unitSystem: UnitSystem) => Promise<void>;
  finishOnboarding: () => Promise<void>;
};

export const usePreferences = create<PreferencesState>((set, get) => ({
  language: 'en', appearance: 'system', unitSystem: 'original', onboarded: false, hydrated: false,
  hydrate: async () => {
    try {
      const [language, appearance, unitSystem, onboarded] = await Promise.all([
        getSetting('language'), getSetting('appearance'), getSetting('unitSystem'), getSetting('onboarded'),
      ]);
      const nextLanguage: AppLanguage = isAppLanguage(language) ? language : 'en';
      await i18n.changeLanguage(nextLanguage);
      set({
        language: nextLanguage,
        appearance: appearance === 'light' || appearance === 'dark' ? appearance : 'system',
        unitSystem: unitSystem === 'metric' || unitSystem === 'us' ? unitSystem : 'original',
        onboarded: onboarded === 'true', hydrated: true,
      });
      applyLayoutDirection();
      // Catch up on recipes saved in another language (e.g. imported before switching languages).
      void useTranslations.getState().translateCookbook(nextLanguage).catch(() => undefined);
    } catch {
      set({ hydrated: true });
    }
  },
  setLanguage: async (language) => {
    await i18n.changeLanguage(language);
    await setSetting('language', language);
    set({ language });
    applyLayoutDirection();
    // Show saved recipes in the new language too; each is translated once and cached on the device.
    void useTranslations.getState().translateCookbook(language).catch(() => undefined);
  },
  setAppearance: async (appearance) => {
    await setSetting('appearance', appearance);
    set({ appearance });
  },
  setUnitSystem: async (unitSystem) => {
    await setSetting('unitSystem', unitSystem);
    set({ unitSystem });
  },
  finishOnboarding: async () => {
    await setSetting('onboarded', 'true');
    set({ onboarded: true });
  },
}));
