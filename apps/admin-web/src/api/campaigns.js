import apiClient from './client.js'

/**
 * Create a new campaign
 * @param {import('./types.js').CreateCampaignData} data
 * @returns {Promise<import('./types.js').CreateCampaignResponse>}
 */
export async function createCampaign(data) {
  const response = await apiClient.post('/campaigns', data)
  return response.data
}

/**
 * Get list of all campaigns
 * @returns {Promise<import('./types.js').Campaign[]>}
 */
export async function listCampaigns() {
  const response = await apiClient.get('/campaigns')
  return response.data
}

/**
 * Get campaign details by ID
 * @param {string} id
 * @returns {Promise<import('./types.js').Campaign>}
 */
export async function getCampaignById(id) {
  const response = await apiClient.get(`/campaigns/${id}`)
  return response.data
}

/**
 * Generate Telegram invite links for a campaign
 * @param {string} campaignId
 * @returns {Promise<import('./types.js').GenerateLinksResponse>}
 */
export async function generateLinks(campaignId) {
  const response = await apiClient.post(`/campaigns/${campaignId}/generate-telegram-links`)
  return response.data
}
