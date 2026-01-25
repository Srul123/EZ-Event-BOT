<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="toggleDropdown"
      class="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors duration-200 hover:bg-primary-100 active:bg-primary-200 text-neutral-900"
      :aria-label="t('common.language')"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
      <span class="hidden sm:inline">{{ currentLanguageName }}</span>
      <svg
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50"
      :class="locale === 'he' ? 'left-0' : 'right-0'"
    >
      <button
        v-for="lang in languages"
        :key="lang.code"
        @click="switchLanguage(lang.code)"
        class="w-full text-left px-4 py-2 hover:bg-primary-50 transition-colors flex items-center justify-between"
        :class="{ 'bg-primary-100': locale === lang.code }"
      >
        <span class="flex items-center gap-2">
          <span class="text-lg">{{ lang.flag }}</span>
          <span>{{ lang.name }}</span>
        </span>
        <svg
          v-if="locale === lang.code"
          class="w-4 h-4 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref(null)

const languages = [
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
]

const currentLanguageName = computed(() => {
  const lang = languages.find(l => l.code === locale.value)
  return lang ? lang.name : 'Language'
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function switchLanguage(langCode) {
  locale.value = langCode
  closeDropdown()
  
  // Update document direction
  document.documentElement.dir = langCode === 'he' ? 'rtl' : 'ltr'
  document.documentElement.lang = langCode
  
  // Save preference to localStorage
  localStorage.setItem('preferred-language', langCode)
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  // Set initial direction
  document.documentElement.dir = locale.value === 'he' ? 'rtl' : 'ltr'
  document.documentElement.lang = locale.value
  
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>
