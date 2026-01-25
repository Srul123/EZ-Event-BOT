<template>
  <div class="space-y-6">
    <!-- Progress Indicator -->
    <div class="flex items-center justify-between mb-6">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="flex items-center flex-1"
      >
        <div
          :class="[
            'flex items-center justify-center w-8 h-8 rounded-full font-medium',
            index < currentStep
              ? 'bg-primary-500 text-white'
              : index === currentStep
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                : 'bg-neutral-200 text-neutral-600',
          ]"
        >
          {{ index + 1 }}
        </div>
        <div
          v-if="index < steps.length - 1"
          :class="[
            'flex-1 h-1 mx-2',
            index < currentStep ? 'bg-primary-500' : 'bg-neutral-200',
          ]"
        />
      </div>
    </div>

    <!-- Step 1: Campaign Details -->
    <div v-if="currentStep === 0" class="space-y-4">
      <h3 class="text-xl font-semibold text-neutral-900">{{ t('form.campaignDetails') }}</h3>
      <Input
        v-model="formData.name"
        :label="t('campaigns.name')"
        placeholder="e.g., Summer BBQ 2024"
        :error="errors.name"
        required
      />
      <Input
        v-model="formData.eventTitle"
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
    <div class="flex justify-between pt-6 border-t border-neutral-200">
      <Button
        v-if="currentStep > 0"
        variant="outline"
        @click="currentStep--"
      >
        {{ t('common.previous') }}
      </Button>
      <div v-else />
      <Button
        v-if="currentStep < steps.length - 1"
        variant="primary"
        :disabled="!canProceed"
        @click="currentStep++"
      >
        {{ t('common.next') }}
      </Button>
      <Button
        v-else
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
