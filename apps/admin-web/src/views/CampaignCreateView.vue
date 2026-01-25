<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-neutral-900">{{ t('campaigns.create') }}</h1>
      <Button variant="outline" @click="$router.push({ name: 'campaigns' })">
        {{ t('common.cancel') }}
      </Button>
    </div>

    <Card>
      <CampaignForm :loading="loading" @submit="handleSubmit" />
    </Card>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useCampaigns } from '../composables/useCampaigns.js'
import { useNotifications } from '../composables/useNotifications.js'
import CampaignForm from '../components/campaign/CampaignForm.vue'
import Card from '../components/common/Card.vue'
import Button from '../components/common/Button.vue'

const { t } = useI18n()
const router = useRouter()
const { createCampaign, loading } = useCampaigns()
const { success, error: notifyError } = useNotifications()

async function handleSubmit(formData) {
  try {
    // Convert datetime-local to ISO string
    const scheduledAt = new Date(formData.scheduledAt).toISOString()

    const campaignId = await createCampaign({
      name: formData.name,
      eventTitle: formData.eventTitle,
      eventDate: formData.eventDate || undefined,
      scheduledAt,
      guests: formData.guests,
    })

    success(t('notifications.campaignCreated'))
    router.push({ name: 'campaigns-detail', params: { id: campaignId } })
  } catch (error) {
    notifyError(error.message || t('campaigns.failedToCreate'))
  }
}
</script>
