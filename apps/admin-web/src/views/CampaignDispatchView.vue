<template>
  <div class="space-y-6">
    <LoadingSpinner v-if="loading && !campaign" full-page />

    <div v-else-if="error && !campaign" class="card text-center py-12">
      <p class="text-error-600 mb-4">{{ error }}</p>
      <Button variant="outline" @click="$router.push({ name: 'campaigns' })">
        {{ t('campaigns.backToCampaigns') }}
      </Button>
    </div>

    <div v-else-if="campaign" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-neutral-900">{{ t('campaigns.dispatch') }}</h1>
          <p class="text-lg text-neutral-600 mt-1">{{ campaign.name }}</p>
        </div>
        <Button variant="outline" @click="goToDetail">{{ t('campaigns.backToCampaign') }}</Button>
      </div>

      <!-- Campaign Summary -->
      <Card>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('common.event') }}:</span>
            <span class="ml-2 text-neutral-900">{{ campaign.eventTitle }}</span>
          </div>
          <div v-if="campaign.eventDate">
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.eventDateLabel') }}</span>
            <span class="ml-2 text-neutral-900">{{ formatDate(campaign.eventDate) }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.guestsLabel') }}</span>
            <span class="ml-2 text-neutral-900">
              {{ campaign.guests ? campaign.guests.length : 0 }}
            </span>
          </div>
        </div>
      </Card>

      <!-- Link Generator -->
      <Card>
        <LinkGenerator :links="links" :loading="generatingLinks" @generate="handleGenerate" />
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useCampaigns } from '../composables/useCampaigns.js'
import { useNotifications } from '../composables/useNotifications.js'
import { formatDate } from '../utils/formatters.js'
import LinkGenerator from '../components/links/LinkGenerator.vue'
import Card from '../components/common/Card.vue'
import Button from '../components/common/Button.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const { currentCampaign, loading, error, fetchCampaign, generateLinks } = useCampaigns()
const { success, error: notifyError } = useNotifications()

const links = ref(null)
const generatingLinks = ref(false)

const campaign = computed(() => currentCampaign.value)

function goToDetail() {
  router.push({ name: 'campaigns-detail', params: { id: route.params.id } })
}

async function handleGenerate() {
  generatingLinks.value = true
  try {
    const result = await generateLinks(route.params.id)
    links.value = result.links
    success(t('links.generatedSuccess'))
  } catch (error) {
    notifyError(error.message || t('links.failedToGenerate'))
  } finally {
    generatingLinks.value = false
  }
}

onMounted(async () => {
  try {
    await fetchCampaign(route.params.id)
  } catch (error) {
    notifyError(t('campaigns.failedToLoad'))
  }
})
</script>
