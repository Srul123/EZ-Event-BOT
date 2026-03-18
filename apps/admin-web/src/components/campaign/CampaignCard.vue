<template>
  <Card class="cursor-pointer hover:shadow-lg transition-shadow" @click="$emit('click')">
    <template #header>
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-neutral-900">{{ campaign.name }}</h3>
          <p class="text-sm text-neutral-600 mt-1">{{ campaign.eventTitle }}</p>
        </div>
        <div class="ml-3 flex items-center gap-2">
          <Badge :variant="statusVariant">{{ campaign.status }}</Badge>
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            :aria-label="t('campaigns.delete')"
            @click.stop="$emit('delete', campaign.id)"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </template>

    <div class="space-y-3">
      <div v-if="campaign.eventDate" class="flex items-center text-sm text-neutral-600">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {{ formatDate(campaign.eventDate) }}
      </div>

      <div class="flex items-center text-sm text-neutral-600">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Scheduled: {{ formatDateTime(campaign.scheduledAt) }}
      </div>

      <div v-if="campaign.guests" class="pt-3 border-t border-neutral-200">
        <div class="flex items-center justify-between text-sm">
          <span class="text-neutral-600">Guests:</span>
          <span class="font-medium text-neutral-900">{{ campaign.guests.length }}</span>
        </div>
        <div v-if="rsvpStats" class="mt-2 flex gap-2">
          <Badge v-if="rsvpStats.yes > 0" variant="success" size="sm">
            {{ rsvpStats.yes }} Yes
          </Badge>
          <Badge v-if="rsvpStats.no > 0" variant="error" size="sm">
            {{ rsvpStats.no }} No
          </Badge>
          <Badge v-if="rsvpStats.maybe > 0" variant="warning" size="sm">
            {{ rsvpStats.maybe }} Maybe
          </Badge>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatDateTime } from '../../utils/formatters.js'
import Card from '../common/Card.vue'
import Badge from '../common/Badge.vue'

const props = defineProps({
  campaign: {
    type: Object,
    required: true,
  },
})

const { t } = useI18n()

defineEmits(['click', 'delete'])

const statusVariant = computed(() => {
  const map = {
    DRAFT: 'neutral',
    SCHEDULED: 'info',
    RUNNING: 'primary',
    COMPLETED: 'success',
    FAILED: 'error',
  }
  return map[props.campaign.status] || 'neutral'
})

const rsvpStats = computed(() => {
  if (!props.campaign.guests) return null

  return {
    yes: props.campaign.guests.filter((g) => g.rsvpStatus === 'YES').length,
    no: props.campaign.guests.filter((g) => g.rsvpStatus === 'NO').length,
    maybe: props.campaign.guests.filter((g) => g.rsvpStatus === 'MAYBE').length,
  }
})
</script>
