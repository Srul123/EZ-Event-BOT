<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex flex-col sm:flex-row gap-4 flex-1">
        <div class="flex-1 max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('guests.searchPlaceholder')"
            class="input w-full"
          />
        </div>
        <select v-model="statusFilter" class="input w-full sm:w-auto">
          <option value="">{{ t('common.allStatuses') }}</option>
          <option value="NO_RESPONSE">{{ t('common.noResponse') }}</option>
          <option value="YES">{{ t('common.yes') }}</option>
          <option value="NO">{{ t('common.no') }}</option>
          <option value="MAYBE">{{ t('common.maybe') }}</option>
        </select>
      </div>
      <Button variant="outline" size="sm" :loading="loading" @click="handleRefresh">
        <svg
          class="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {{ t('common.refresh') }}
      </Button>
    </div>

    <div class="card overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                @click="sortBy('name')"
              >
                {{ t('common.name') }}
                <span v-if="sortField === 'name'" class="ml-1">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                @click="sortBy('phone')"
              >
                {{ t('guests.phone') }}
                <span v-if="sortField === 'phone'" class="ml-1">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                @click="sortBy('rsvpStatus')"
              >
                {{ t('guests.rsvpStatus') }}
                <span v-if="sortField === 'rsvpStatus'" class="ml-1">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                {{ t('common.headcount') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                @click="sortBy('rsvpUpdatedAt')"
              >
                {{ t('common.lastUpdated') }}
                <span v-if="sortField === 'rsvpUpdatedAt'" class="ml-1">
                  {{ sortOrder === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr
              v-for="guest in filteredAndSortedGuests"
              :key="guest.id"
              class="hover:bg-neutral-50"
            >
              <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900">
                {{ guest.name }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                {{ guest.phone }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm">
                <RSVPStatusBadge :status="guest.rsvpStatus" />
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                {{ guest.headcount || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">
                {{ formatRelativeTime(guest.rsvpUpdatedAt || guest.updatedAt) }}
              </td>
            </tr>
            <tr v-if="filteredAndSortedGuests.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-neutral-500">
                {{ t('guests.noGuests') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatRelativeTime } from '../../utils/formatters.js'
import RSVPStatusBadge from './RSVPStatusBadge.vue'
import Button from '../common/Button.vue'

const { t } = useI18n()

const props = defineProps({
  guests: {
    type: Array,
    required: true,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['refresh'])

const searchQuery = ref('')
const statusFilter = ref('')
const sortField = ref('name')
const sortOrder = ref('asc')

function sortBy(field) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

function handleRefresh() {
  emit('refresh')
}

const filteredAndSortedGuests = computed(() => {
  let filtered = [...props.guests]

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (guest) =>
        guest.name.toLowerCase().includes(query) || guest.phone.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter((guest) => guest.rsvpStatus === statusFilter.value)
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]

    // Handle null/undefined values
    if (aVal == null) aVal = ''
    if (bVal == null) bVal = ''

    // Convert to string for comparison
    if (typeof aVal !== 'string') aVal = String(aVal)
    if (typeof bVal !== 'string') bVal = String(bVal)

    const comparison = aVal.localeCompare(bVal)
    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return filtered
})
</script>
