<template>
  <Card>
    <template #header>
      <h3 class="text-lg font-semibold text-neutral-900">{{ t('stats.rsvpStatistics') }}</h3>
    </template>

    <div v-if="!guests || guests.length === 0" class="text-center py-8 text-neutral-500">
      {{ t('guests.noGuestsYet') }}
    </div>

    <div v-else class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-neutral-900">{{ total }}</div>
          <div class="text-sm text-neutral-600">{{ t('stats.totalGuests') }}</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-success-600">{{ stats.yes }}</div>
          <div class="text-sm text-neutral-600">{{ t('stats.yes') }}</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-error-600">{{ stats.no }}</div>
          <div class="text-sm text-neutral-600">{{ t('stats.no') }}</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-warning-600">{{ stats.maybe }}</div>
          <div class="text-sm text-neutral-600">{{ t('stats.maybe') }}</div>
        </div>
      </div>

      <div class="pt-4 border-t border-neutral-200">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-neutral-700">{{ t('stats.responseRate') }}</span>
          <span class="text-sm font-semibold text-neutral-900">{{ responseRate }}%</span>
        </div>
        <div class="w-full bg-neutral-200 rounded-full h-2">
          <div
            class="bg-primary-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${responseRate}%` }"
          />
        </div>
      </div>

      <div v-if="totalHeadcount > 0" class="pt-4 border-t border-neutral-200">
        <div class="text-center">
          <div class="text-2xl font-bold text-primary-600">{{ totalHeadcount }}</div>
          <div class="text-sm text-neutral-600">{{ t('stats.totalAttendees') }}</div>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../common/Card.vue'

const { t } = useI18n()

const props = defineProps({
  guests: {
    type: Array,
    default: () => [],
  },
})

const total = computed(() => props.guests.length)

const stats = computed(() => {
  return {
    yes: props.guests.filter((g) => g.rsvpStatus === 'YES').length,
    no: props.guests.filter((g) => g.rsvpStatus === 'NO').length,
    maybe: props.guests.filter((g) => g.rsvpStatus === 'MAYBE').length,
    noResponse: props.guests.filter((g) => g.rsvpStatus === 'NO_RESPONSE').length,
  }
})

const responseRate = computed(() => {
  if (total.value === 0) return 0
  const responded = total.value - stats.value.noResponse
  return Math.round((responded / total.value) * 100)
})

const totalHeadcount = computed(() => {
  return props.guests
    .filter((g) => g.rsvpStatus === 'YES' && g.headcount)
    .reduce((sum, g) => sum + (g.headcount || 0), 0)
})
</script>
