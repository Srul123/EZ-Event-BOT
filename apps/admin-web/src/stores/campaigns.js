import { defineStore } from 'pinia'
import { createCampaign, listCampaigns, getCampaignById, generateLinks } from '../api/campaigns.js'

/**
 * @typedef {import('../api/types.js').Campaign} Campaign
 * @typedef {import('../api/types.js').CampaignStatus} CampaignStatus
 * @typedef {import('../api/types.js').CreateCampaignData} CreateCampaignData
 */

export const useCampaignsStore = defineStore('campaigns', {
  state: () => ({
    campaigns: [],
    currentCampaign: null,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * Get campaigns filtered by status
     * @param {CampaignStatus} status
     * @returns {Campaign[]}
     */
    campaignsByStatus: (state) => (status) => {
      return state.campaigns.filter((campaign) => campaign.status === status)
    },

    /**
     * Get active (RUNNING) campaigns
     * @returns {Campaign[]}
     */
    activeCampaigns: (state) => {
      return state.campaigns.filter((campaign) => campaign.status === 'RUNNING')
    },
  },

  actions: {
    /**
     * Fetch all campaigns
     */
    async fetchCampaigns() {
      this.loading = true
      this.error = null
      try {
        this.campaigns = await listCampaigns()
      } catch (error) {
        this.error = error.message || 'Failed to fetch campaigns'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch a single campaign by ID
     * @param {string} id
     */
    async fetchCampaign(id) {
      this.loading = true
      this.error = null
      try {
        this.currentCampaign = await getCampaignById(id)
        // Also update in campaigns list if it exists
        const index = this.campaigns.findIndex((c) => c.id === id)
        if (index !== -1) {
          this.campaigns[index] = this.currentCampaign
        }
      } catch (error) {
        this.error = error.message || 'Failed to fetch campaign'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new campaign
     * @param {CreateCampaignData} data
     * @returns {Promise<string>} Campaign ID
     */
    async createCampaign(data) {
      this.loading = true
      this.error = null
      try {
        const result = await createCampaign(data)
        // Refresh campaigns list
        await this.fetchCampaigns()
        return result.campaignId
      } catch (error) {
        this.error = error.message || 'Failed to create campaign'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Generate Telegram links for a campaign
     * @param {string} campaignId
     * @returns {Promise<import('../api/types.js').GenerateLinksResponse>}
     */
    async generateLinks(campaignId) {
      this.loading = true
      this.error = null
      try {
        const result = await generateLinks(campaignId)
        // Refresh campaign to get updated status
        await this.fetchCampaign(campaignId)
        return result
      } catch (error) {
        this.error = error.message || 'Failed to generate links'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Refresh campaign data (for manual RSVP updates)
     * @param {string} id
     */
    async refreshCampaign(id) {
      await this.fetchCampaign(id)
    },

    /**
     * Clear current campaign
     */
    clearCurrentCampaign() {
      this.currentCampaign = null
    },
  },
})
