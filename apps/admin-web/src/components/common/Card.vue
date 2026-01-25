<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="card-header mb-4 pb-4 border-b border-neutral-200">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer mt-4 pt-4 border-t border-neutral-200">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  elevated: {
    type: Boolean,
    default: false,
  },
  padding: {
    type: String,
    default: 'default',
    validator: (value) => ['none', 'sm', 'default', 'lg'].includes(value),
  },
})

const cardClasses = computed(() => {
  const base = props.elevated ? 'card-elevated' : 'card'
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
  }
  return `${base} ${paddingClasses[props.padding]}`
})
</script>
