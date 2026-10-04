import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: resources.en },
    de: { translation: resources.de },
    he: { translation: resources.he },
  },
  lng: getLocales()[0]?.languageCode === 'he' ? 'he' : getLocales()[0]?.languageCode === 'de' ? 'de' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
