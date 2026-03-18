<template>
  <div class="mx-auto w-full max-w-5xl space-y-6">
    <!-- Progress Indicator -->
    <div class="mb-6 overflow-x-auto pb-2">
      <div class="flex min-w-[360px] items-start justify-between md:min-w-0">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="flex flex-1 items-center"
      >
        <div class="flex flex-col items-center gap-2">
          <div
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-full font-medium',
              index < currentStep
                ? 'bg-primary-500 text-white'
                : index === currentStep
                  ? 'border-2 border-primary-500 bg-primary-100 text-primary-700'
                  : 'bg-neutral-200 text-neutral-600',
            ]"
          >
            {{ index + 1 }}
          </div>
          <span
            :class="[
              'hidden text-xs font-medium text-center md:block',
              index <= currentStep ? 'text-primary-700' : 'text-neutral-500',
            ]"
          >
            {{ step }}
          </span>
        </div>
        <div
          v-if="index < steps.length - 1"
          :class="[
            'mx-2 h-1 flex-1',
            index < currentStep ? 'bg-primary-500' : 'bg-neutral-200',
          ]"
        />
      </div>
    </div>
    </div>

    <!-- Step 1: Campaign Details -->
    <div v-if="currentStep === 0" class="space-y-4">
      <h3 class="text-xl font-semibold text-neutral-900">{{ t('form.campaignDetails') }}</h3>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Input
          v-model="formData.name"
          class="lg:col-span-2"
          :label="t('campaigns.name')"
          placeholder="e.g., Summer BBQ 2024"
          :error="errors.name"
          required
        />
        <Input
          v-model="formData.eventTitle"
          class="lg:col-span-2"
          :label="t('form.eventTitle')"
          :placeholder="t('form.eventTitlePlaceholder')"
          :error="errors.eventTitle"
          required
        />
        <Input
          v-model="formData.eventDate"
          type="date"
          :label="t('form.eventDate')"
          :error="errors.eventDate"
        />
        <Input
          v-model="formData.scheduledAt"
          type="datetime-local"
          :label="t('form.scheduledAt')"
          :error="errors.scheduledAt"
          required
        />
      </div>
    </div>

    <!-- Step 2: Guest Import -->
    <div v-if="currentStep === 1" class="space-y-4">
      <h3 class="text-xl font-semibold text-neutral-900">{{ t('guests.import') }}</h3>
      <GuestImport v-model="formData.guests" />
      <div v-if="formData.guests.length === 0" class="text-sm text-error-500">
        {{ t('form.validation.atLeastOneGuest') }}
      </div>
    </div>

    <!-- Step 3: Review -->
    <div v-if="currentStep === 2" class="space-y-4">
      <h3 class="text-xl font-semibold text-neutral-900">{{ t('form.review') }}</h3>
      <Card>
        <div class="space-y-3">
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('campaigns.name') }}:</span>
            <span class="ml-2 text-neutral-900">{{ formData.name }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('form.eventTitle') }}:</span>
            <span class="ml-2 text-neutral-900">{{ formData.eventTitle }}</span>
          </div>
          <div v-if="formData.eventDate">
            <span class="text-sm font-medium text-neutral-600">{{ t('form.eventDate') }}:</span>
            <span class="ml-2 text-neutral-900">{{ formatDate(formData.eventDate) }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('form.scheduledAt') }}:</span>
            <span class="ml-2 text-neutral-900">{{ formatDateTime(formData.scheduledAt) }}</span>
          </div>
          <div>
            <span class="text-sm font-medium text-neutral-600">{{ t('guests.title') }}:</span>
            <span class="ml-2 text-neutral-900">{{ formData.guests.length }}</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <Button
        v-if="currentStep > 0"
        class="w-full sm:w-auto"
        variant="outline"
        @click="currentStep--"
      >
        {{ t('common.previous') }}
      </Button>
      <div v-else class="hidden sm:block" />
      <Button
        v-if="currentStep < steps.length - 1"
        class="w-full sm:w-auto"
        variant="primary"
        :disabled="!canProceed"
        @click="currentStep++"
      >
        {{ t('common.next') }}
      </Button>
      <Button
        v-else
        class="w-full sm:w-auto"
        variant="primary"
        :loading="loading"
        :disabled="!canSubmit"
        @click="$emit('submit', formData)"
      >
        {{ t('campaigns.create') }}
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatDateTime } from '../../utils/formatters.js'
import { validateRequired } from '../../utils/validators.js'
import Input from '../common/Input.vue'
import Button from '../common/Button.vue'
import Card from '../common/Card.vue'
import GuestImport from '../guest/GuestImport.vue'

const { t } = useI18n()

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['submit'])

const steps = [t('form.steps.details'), t('form.steps.guests'), t('form.steps.review')]
const currentStep = ref(0)

const formData = ref({
  name: '',
  eventTitle: '',
  eventDate: '',
  scheduledAt: '',
  guests: [],
})

const errors = computed(() => {
  const errs = {}
  if (currentStep.value === 0) {
    if (!validateRequired(formData.value.name)) {
      errs.name = t('form.validation.campaignNameRequired')
    }
    if (!validateRequired(formData.value.eventTitle)) {
      errs.eventTitle = t('form.validation.eventTitleRequired')
    }
    if (!validateRequired(formData.value.scheduledAt)) {
      errs.scheduledAt = t('form.validation.scheduledDateRequired')
    }
  }
  return errs
})

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return (
      validateRequired(formData.value.name) &&
      validateRequired(formData.value.eventTitle) &&
      validateRequired(formData.value.scheduledAt)
    )
  }
  if (currentStep.value === 1) {
    return formData.value.guests.length > 0
  }
  return true
})

const canSubmit = computed(() => {
  return (
    validateRequired(formData.value.name) &&
    validateRequired(formData.value.eventTitle) &&
    validateRequired(formData.value.scheduledAt) &&
    formData.value.guests.length > 0
  )
})
</script>
