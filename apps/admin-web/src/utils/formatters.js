import { format, parseISO } from 'date-fns'

/**
 * Format ISO date string to readable date
 * @param {string} dateString
 * @param {string} [formatStr='MMM dd, yyyy']
 * @returns {string}
 */
export function formatDate(dateString, formatStr = 'MMM dd, yyyy') {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    return format(date, formatStr)
  } catch (error) {
    return dateString
  }
}

/**
 * Format ISO datetime string to readable datetime
 * @param {string} dateTimeString
 * @param {string} [formatStr='MMM dd, yyyy HH:mm']
 * @returns {string}
 */
export function formatDateTime(dateTimeString, formatStr = 'MMM dd, yyyy HH:mm') {
  if (!dateTimeString) return ''
  try {
    const date = parseISO(dateTimeString)
    return format(date, formatStr)
  } catch (error) {
    return dateTimeString
  }
}

/**
 * Format phone number for display
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone) {
  if (!phone) return ''
  // Simple formatting - can be enhanced
  return phone.trim()
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string} dateString
 * @returns {string}
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return formatDate(dateString)
  } catch (error) {
    return dateString
  }
}
