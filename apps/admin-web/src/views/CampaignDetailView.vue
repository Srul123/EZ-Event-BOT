<template>
  <div class="space-y-6">
    <LoadingSpinner v-if="loading && !currentCampaign" full-page />

    <div v-else-if="error && !currentCampaign" class="card text-center py-12">
      <p class="text-error-600 mb-4">{{ error }}</p>
      <Button variant="outline" @click="$router.push({ name: 'campaigns' })">
        {{ t('campaigns.backToCampaigns') }}
      </Button>
    </div>

    <div v-else-if="currentCampaign" class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-neutral-900">{{ currentCampaign.name }}</h1>
          <p class="text-lg text-neutral-600 mt-1">{{ currentCampaign.eventTitle }}</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" :loading="loading" @click="handleRefresh">
            {{ t('common.refresh') }}
          </Button>
          <Button
            variant="primary"
            @click="
              $router.push({
                name: 'campaigns-dispatch',
                params: { id: currentCampaign.id },
              })
            "
          >
            {{ t('campaigns.generateLinks') }}
          </Button>
        </div>
      </div>

      <!-- Campaign Info -->
      <Card>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.statusLabel') }}</span>
            <Badge :variant="statusVariant" class="ml-2">{{ currentCampaign.status }}</Badge>
          </div>
          <div v-if="currentCampaign.eventDate">
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.eventDateLabel') }}</span>
            <span class="ml-2 text-neutral-900">{{ formatDate(currentCampaign.eventDate) }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.scheduledAtLabel') }}</span>
            <span class="ml-2 text-neutral-900">
              {{ formatDateTime(currentCampaign.scheduledAt) }}
            </span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.createdLabel') }}</span>
            <span class="ml-2 text-neutral-900">
              {{ formatDateTime(currentCampaign.createdAt) }}
            </span>
          </div>
        </div>
      </Card>

      <!-- Statistics -->
      <CampaignStats v-if="currentCampaign.guests" :guests="currentCampaign.guests" />

      <!-- Guest Table -->
      <div>
        <h2 class="text-xl font-semibold text-neutral-900 mb-4">{{ t('guests.title') }}</h2>
        <GuestTable
          :guests="currentCampaign.guests || []"
          :loading="loading"
          @refresh="handleRefresh"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useCampaigns } from '../composables/useCampaigns.js'
import { useNotifications } from '../composables/useNotifications.js'
import { formatDate, formatDateTime } from '../utils/formatters.js'
import CampaignStats from '../components/campaign/CampaignStats.vue'
import GuestTable from '../components/guest/GuestTable.vue'
import Card from '../components/common/Card.vue'
import Button from '../components/common/Button.vue'
import Badge from '../components/common/Badge.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'

const { t } = useI18n()

const route = useRoute()
const { currentCampaign, loading, error, fetchCampaign, refreshCampaign } = useCampaigns()
const { success, error: notifyError } = useNotifications()

const statusVariant = computed(() => {
  if (!currentCampaign.value) return 'neutral'
  const map = {
    DRAFT: 'neutral',
    SCHEDULED: 'info',
    RUNNING: 'primary',
    COMPLETED: 'success',
    FAILED: 'error',
  }
  return map[currentCampaign.value.status] || 'neutral'
})

async function handleRefresh() {
  try {
    await refreshCampaign(route.params.id)
    success(t('campaigns.dataRefreshed'))
  } catch (error) {
    notifyError(t('campaigns.failedToRefresh'))
  }
}

onMounted(async () => {
  try {
    await fetchCampaign(route.params.id)
  } catch (error) {
    notifyError(t('campaigns.failedToLoad'))
  }
})

onUnmounted(() => {
  // Clear current campaign when leaving
})
</script>
