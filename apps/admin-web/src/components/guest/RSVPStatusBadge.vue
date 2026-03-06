<template>
  <Badge :variant="badgeVariant" :size="size">
    <slot>{{ statusLabel }}</slot>
  </Badge>
</template>

<script setup>
import { computed } from 'vue'
import Badge from '../common/Badge.vue'
import { RSVP_STATUSES } from '@ez-event-bot/shared'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => RSVP_STATUSES.includes(value),
  },
  size: {
    type: String,
    default: 'md',
  },
})

const badgeVariant = computed(() => {
  const map = {
    NO_RESPONSE: 'neutral',
    YES: 'success',
    NO: 'error',
    MAYBE: 'warning',
  }
  return map[props.status] || 'neutral'
})

const statusLabel = computed(() => {
  const map = {
    NO_RESPONSE: 'No Response',
    YES: 'Yes',
    NO: 'No',
    MAYBE: 'Maybe',
  }
  return map[props.status] || props.status
})
</script>
