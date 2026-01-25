<template>
  <div class="space-y-4">
    <div
      :class="dropZoneClasses"
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent
      @dragleave="isDragging = false"
      @dragenter="isDragging = true"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        class="hidden"
        @change="handleFileSelect"
      />
      <div class="text-center">
        <svg
          class="mx-auto h-12 w-12 text-neutral-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="mt-2 text-sm text-neutral-600">
          <button
            type="button"
            class="font-medium text-primary-600 hover:text-primary-500"
            @click="$refs.fileInput?.click()"
          >
            Click to upload
          </button>
          or drag and drop
        </p>
        <p class="text-xs text-neutral-500">CSV file with name and phone columns</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-4">
      <LoadingSpinner />
      <p class="mt-2 text-sm text-neutral-600">Parsing CSV...</p>
    </div>

    <div v-if="errors.length > 0" class="rounded-lg bg-error-50 border border-error-200 p-4">
      <h4 class="text-sm font-medium text-error-800 mb-2">Errors found:</h4>
      <ul class="text-sm text-error-700 space-y-1">
        <li v-for="(error, index) in errors" :key="index">
          {{ error.message }}
          <span v-if="error.row !== undefined"> (Row {{ error.row + 1 }})</span>
        </li>
      </ul>
    </div>

    <div v-if="guests.length > 0" class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-neutral-700">
          {{ validGuestsCount }} valid guest{{ validGuestsCount !== 1 ? 's' : '' }}
        </h4>
        <Button variant="ghost" size="sm" @click="clearGuests">Clear All</Button>
      </div>
      <div class="border border-neutral-200 rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-neutral-200">
          <thead class="bg-neutral-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                Name
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                Phone
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                Status
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-neutral-200">
            <tr
              v-for="(guest, index) in guests"
              :key="index"
              :class="guest._errors ? 'bg-error-50' : ''"
            >
              <td class="px-4 py-3 text-sm text-neutral-900">{{ guest.name }}</td>
              <td class="px-4 py-3 text-sm text-neutral-900">{{ guest.phone }}</td>
              <td class="px-4 py-3 text-sm">
                <span
                  v-if="guest._errors"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-800"
                >
                  Invalid
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800"
                >
                  Valid
                </span>
              </td>
              <td class="px-4 py-3 text-right text-sm">
                <Button variant="ghost" size="sm" @click="removeGuest(index)">Remove</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCsvImport } from '../../composables/useCsvImport.js'
import Button from '../common/Button.vue'
import LoadingSpinner from '../common/LoadingSpinner.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

const { guests, errors, loading, parseCsv, removeGuest, getValidGuests, clearGuests } =
  useCsvImport()

const fileInput = ref(null)
const isDragging = ref(false)

const dropZoneClasses = computed(() => {
  const base =
    'border-2 border-dashed rounded-lg p-8 transition-colors duration-200 cursor-pointer'
  if (isDragging.value) {
    return `${base} border-primary-500 bg-primary-50`
  }
  return `${base} border-neutral-300 hover:border-neutral-400`
})

const validGuestsCount = computed(() => getValidGuests().length)

function handleDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) {
    handleFile(files[0])
  }
}

function handleFileSelect(event) {
  const files = event.target.files
  if (files.length > 0) {
    handleFile(files[0])
  }
}

async function handleFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('Please select a CSV file')
    return
  }

  const result = await parseCsv(file)
  if (result.success) {
    emit('update:modelValue', getValidGuests())
  }
}

// Sync guests with modelValue on mount
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue.length > 0 && guests.value.length === 0) {
      guests.value = [...newValue]
    }
  },
  { immediate: true }
)

// Watch for changes and emit
watch(
  () => getValidGuests(),
  (validGuests) => {
    emit('update:modelValue', validGuests)
  },
  { deep: true }
)
</script>
