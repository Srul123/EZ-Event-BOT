<template>
  <Teleport to="body">
    <div
      class="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full"
      role="region"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="notificationClasses(notification.type)"
          role="alert"
        >
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <!-- Success Icon -->
              <svg
                v-if="notification.type === 'success'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <!-- Error Icon -->
              <svg
                v-else-if="notification.type === 'error'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <!-- Warning Icon -->
              <svg
                v-else-if="notification.type === 'warning'"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <!-- Info Icon -->
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium">{{ notification.message }}</p>
            </div>
            <div class="ml-4 flex-shrink-0">
              <button
                class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="closeButtonClasses(notification.type)"
                @click="removeNotification(notification.id)"
              >
                <span class="sr-only">Close</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useNotifications } from '../../composables/useNotifications.js'

const { notifications, removeNotification } = useNotifications()

function notificationClasses(type) {
  const base = 'rounded-lg shadow-lg p-4 pointer-events-auto'
  const variants = {
    success: 'bg-success-50 border border-success-200 text-success-800',
    error: 'bg-error-50 border border-error-200 text-error-800',
    info: 'bg-info-50 border border-info-200 text-info-800',
    warning: 'bg-warning-50 border border-warning-200 text-warning-800',
  }
  return `${base} ${variants[type] || variants.info}`
}

function closeButtonClasses(type) {
  const variants = {
    success: 'text-success-500 hover:text-success-700 focus:ring-success-500',
    error: 'text-error-500 hover:text-error-700 focus:ring-error-500',
    info: 'text-info-500 hover:text-info-700 focus:ring-info-500',
    warning: 'text-warning-500 hover:text-warning-700 focus:ring-warning-500',
  }
  return variants[type] || variants.info
}
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
