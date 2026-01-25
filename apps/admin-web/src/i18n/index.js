import { createI18n } from 'vue-i18n'
import en from './locales/en.js'
import he from './locales/he.js'

// Get saved language preference or default to Hebrew
const savedLocale = localStorage.getItem('preferred-language') || 'he'

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: savedLocale, // Default locale (Hebrew)
  fallbackLocale: 'en', // Fallback locale
  messages: {
    en,
    he
  }
})

// Set initial document direction
document.documentElement.dir = savedLocale === 'he' ? 'rtl' : 'ltr'
document.documentElement.lang = savedLocale

export default i18n
