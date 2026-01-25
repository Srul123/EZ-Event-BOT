<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleBackdropClick"
      >
        <div class="fixed inset-0 bg-neutral-900/50" @click="handleBackdropClick" />
        <div
          :class="modalClasses"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="$slots.header ? 'modal-title' : undefined"
        >
          <div v-if="$slots.header" id="modal-title" class="mb-4">
            <slot name="header" />
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-neutral-200">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value),
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close', 'update:show'])

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    emit('close')
    emit('update:show', false)
  }
}

const modalClasses = computed(() => {
  const base = 'relative bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto'
  const sizes = {
    sm: 'w-full max-w-sm',
    md: 'w-full max-w-md',
    lg: 'w-full max-w-lg',
    xl: 'w-full max-w-2xl',
  }
  return `${base} ${sizes[props.size]} p-6`
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-body,
.modal-leave-active .modal-body {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-body,
.modal-leave-to .modal-body {
  transform: scale(0.95);
}
</style>
