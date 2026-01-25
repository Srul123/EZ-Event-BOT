import { computed } from 'vue'
import { useCampaignsStore } from '../stores/campaigns.js'

/**
 * Composable for campaign operations
 * @returns {Object}
 */
export function useCampaigns() {
  const store = useCampaignsStore()

  return {
    // State
    campaigns: computed(() => store.campaigns),
    currentCampaign: computed(() => store.currentCampaign),
    loading: computed(() => store.loading),
    error: computed(() => store.error),

    // Actions
    fetchCampaigns: () => store.fetchCampaigns(),
    fetchCampaign: (id) => store.fetchCampaign(id),
    createCampaign: (data) => store.createCampaign(data),
    generateLinks: (campaignId) => store.generateLinks(campaignId),
    refreshCampaign: (id) => store.refreshCampaign(id),
    clearCurrentCampaign: () => store.clearCurrentCampaign(),

    // Getters
    campaignsByStatus: (status) => store.campaignsByStatus(status),
    activeCampaigns: computed(() => store.activeCampaigns),
  }
}
