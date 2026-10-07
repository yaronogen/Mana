import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_LANGUAGES, isAppLanguage } from '../domain/recipe';
import { resources } from './resources';

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(APP_LANGUAGES.map((language) => [language, { translation: resources[language] }])),
  // The device language when Mana speaks it ("iw" is an old code for Hebrew), otherwise English.
  lng: ((code) => isAppLanguage(code) ? code : code === 'iw' ? 'he' : 'en')(getLocales()[0]?.languageCode),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
