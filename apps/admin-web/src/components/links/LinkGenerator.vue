<template>
  <div class="space-y-4">
    <div v-if="!links" class="text-center py-8">
      <p class="text-neutral-600 mb-4">{{ t('links.generateDescription') }}</p>
      <Button variant="primary" :loading="loading" @click="handleGenerate">
        {{ t('links.generate') }}
      </Button>
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="text-lg font-semibold text-neutral-900">
          {{ links.length }} {{ links.length !== 1 ? t('links.generatedPlural') : t('links.generated') }}
        </h4>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="copyAllLinks">
            {{ t('links.copyAll') }}
          </Button>
          <Button variant="outline" size="sm" @click="exportCsv">
            {{ t('links.exportCsv') }}
          </Button>
        </div>
      </div>

      <div class="card overflow-hidden p-0">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-neutral-200">
            <thead class="bg-neutral-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  {{ t('links.guest') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  {{ t('links.phone') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                  {{ t('links.link') }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                  {{ t('links.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-neutral-200">
              <tr v-for="link in links" :key="link.guestId" class="hover:bg-neutral-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900">
                  {{ link.name }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                  {{ link.phone }}
                </td>
                <td class="px-4 py-3 text-sm text-neutral-600">
                  <code class="text-xs bg-neutral-100 px-2 py-1 rounded">{{ link.link }}</code>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm">
                  <Button variant="ghost" size="sm" @click="copyLink(link.link)">
                    {{ copiedLink === link.link ? t('common.copied') : t('common.copy') }}
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from '../common/Button.vue'

const { t } = useI18n()

const props = defineProps({
  links: {
    type: Array,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['generate'])

const copiedLink = ref(null)

function handleGenerate() {
  emit('generate')
}

async function copyLink(link) {
  try {
    await navigator.clipboard.writeText(link)
    copiedLink.value = link
    setTimeout(() => {
      copiedLink.value = null
    }, 2000)
  } catch (error) {
    alert(t('links.failedToCopy'))
  }
}

async function copyAllLinks() {
  if (!props.links || props.links.length === 0) return

  const allLinks = props.links.map((l) => `${l.name}: ${l.link}`).join('\n')
  try {
    await navigator.clipboard.writeText(allLinks)
    alert(t('links.allLinksCopied'))
  } catch (error) {
    alert(t('links.failedToCopyAll'))
  }
}

function exportCsv() {
  if (!props.links || props.links.length === 0) return

  const headers = ['Name', 'Phone', 'Link']
  const rows = props.links.map((l) => [l.name, l.phone, l.link])
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'telegram-links.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
</script>
