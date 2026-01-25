<template>
  <div class="flex items-center justify-center min-h-[60vh] p-4">
    <div class="card max-w-2xl text-center">
      <h2 class="text-3xl font-bold text-neutral-900 mb-4">
        {{ t('home.welcome') }}
      </h2>
      <p class="text-lg text-neutral-600 mb-6">
        {{ t('home.description') }}
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link to="/campaigns/create" class="btn btn-primary px-6 py-3">
          {{ t('campaigns.create') }}
        </router-link>
        <router-link to="/campaigns" class="btn btn-outline px-6 py-3">
          {{ t('home.viewCampaigns') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
