/**
 * @typedef {Object} Guest
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {RsvpStatus} rsvpStatus
 * @property {number|null} headcount
 * @property {string|null} rsvpUpdatedAt
 * @property {string|null} updatedAt
 */

/**
 * @typedef {Object} Campaign
 * @property {string} id
 * @property {string} name
 * @property {string} eventTitle
 * @property {string|null} eventDate
 * @property {string} scheduledAt
 * @property {CampaignStatus} status
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Guest[]} [guests]
 */

/**
 * @typedef {'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED'} CampaignStatus
 */

/**
 * @typedef {'NO_RESPONSE' | 'YES' | 'NO' | 'MAYBE'} RsvpStatus
 */

/**
 * @typedef {Object} CreateCampaignData
 * @property {string} name
 * @property {string} eventTitle
 * @property {string} [eventDate]
 * @property {string} scheduledAt
 * @property {Array<{name: string, phone: string}>} guests
 */

/**
 * @typedef {Object} CreateCampaignResponse
 * @property {string} campaignId
 */

/**
 * @typedef {Object} TelegramLink
 * @property {string} guestId
 * @property {string} name
 * @property {string} phone
 * @property {string} link
 * @property {string} token
 */

/**
 * @typedef {Object} GenerateLinksResponse
 * @property {string} campaignId
 * @property {string} botUsername
 * @property {TelegramLink[]} links
 */

/**
 * @typedef {Object} ApiError
 * @property {string} error
 * @property {Array} [details]
 */
