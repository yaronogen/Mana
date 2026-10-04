import { I18nManager, Platform } from 'react-native';
import type { AppLanguage } from '../domain/recipe';

export const isRtlLanguage = (language: AppLanguage) => language === 'he';

/**
 * Mana mirrors Hebrew itself: screens set `direction` from the app language and the shared Text/TextInput
 * components right-align Hebrew. The native RTL mode is kept off so the language can change instantly,
 * without restarting the app (a forced reload breaks Expo Go), and every platform renders the same way.
 */
export function applyLayoutDirection(): void {
  if (Platform.OS === 'web') return;
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {
    // Direction is a presentation detail; never let it block saving the language.
  }
}
