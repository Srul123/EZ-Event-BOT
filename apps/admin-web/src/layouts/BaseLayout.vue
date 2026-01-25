<template>
  <div class="min-h-screen flex flex-col" :dir="dir">
    <header class="bg-gradient-to-br from-primary-50 to-secondary-50 text-neutral-900 shadow-md">
      <div class="container-custom py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">EZ-Event Admin</h1>
          <nav class="flex items-center gap-6">
            <router-link 
              to="/" 
              class="px-4 py-2 rounded-lg font-medium transition-colors duration-200 hover:bg-primary-100 active:bg-primary-200 text-neutral-900"
              active-class="bg-primary-200"
            >
              {{ t('nav.home') }}
            </router-link>
            <router-link 
              to="/campaigns" 
              class="px-4 py-2 rounded-lg font-medium transition-colors duration-200 hover:bg-primary-100 active:bg-primary-200 text-neutral-900"
              active-class="bg-primary-200"
            >
              {{ t('nav.campaigns') }}
            </router-link>
            <LanguageSwitcher />
          </nav>
        </div>
      </div>
    </header>
    <main class="flex-1 container-custom py-8">
      <router-view />
    </main>
    <footer class="bg-neutral-100 py-6 text-center text-neutral-600 mt-auto">
      <p class="text-sm">&copy; 2026 EZ-Event Admin. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue'

const { locale } = useI18n()

const dir = computed(() => locale.value === 'he' ? 'rtl' : 'ltr')

// Watch for locale changes and update document direction
watch(locale, (newLocale) => {
  document.documentElement.dir = newLocale === 'he' ? 'rtl' : 'ltr'
  document.documentElement.lang = newLocale
}, { immediate: true })

const { t } = useI18n()
</script>
