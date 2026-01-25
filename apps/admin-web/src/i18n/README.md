# i18n Setup

This project uses vue-i18n for internationalization.

## Usage in Components

### Composition API (Recommended)

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Use translations
const message = t('common.save')
const campaignTitle = t('campaigns.title')

// Change locale
locale.value = 'en' // or 'fr', 'es', etc.
</script>

<template>
  <div>
    <h1>{{ t('campaigns.title') }}</h1>
    <button>{{ t('common.save') }}</button>
  </div>
</template>
```

### Options API

```vue
<script>
export default {
  methods: {
    getMessage() {
      return this.$t('common.save')
    }
  }
}
</script>

<template>
  <div>{{ $t('campaigns.title') }}</div>
</template>
```

## Adding New Locales

1. Create a new locale file in `src/i18n/locales/` (e.g., `fr.js`)
2. Import and add it to `src/i18n/index.js`:

```js
import fr from './locales/fr.js'

const i18n = createI18n({
  // ...
  messages: {
    en,
    fr
  }
})
```

## Translation Keys Structure

- `common.*` - Common UI elements (buttons, labels, etc.)
- `nav.*` - Navigation items
- `campaigns.*` - Campaign-related translations
- `guests.*` - Guest-related translations
- `notifications.*` - Notification messages
