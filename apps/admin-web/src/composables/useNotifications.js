import { ref } from 'vue'

/**
 * @typedef {'success' | 'error' | 'info' | 'warning'} NotificationType
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {NotificationType} type
 * @property {string} message
 * @property {number} timeout
 */

const notifications = ref([])

/**
 * Composable for notification system
 * @returns {Object}
 */
export function useNotifications() {
  /**
   * Show a notification
   * @param {string} message
   * @param {NotificationType} [type='info']
   * @param {number} [timeout=5000]
   */
  function notify(message, type = 'info', timeout = 5000) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const notification = {
      id,
      type,
      message,
      timeout,
    }

    notifications.value.push(notification)

    // Auto-dismiss
    if (timeout > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, timeout)
    }

    return id
  }

  /**
   * Remove notification by ID
   * @param {string} id
   */
  function removeNotification(id) {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * Clear all notifications
   */
  function clearNotifications() {
    notifications.value = []
  }

  // Convenience methods
  function success(message, timeout = 5000) {
    return notify(message, 'success', timeout)
  }

  function error(message, timeout = 7000) {
    return notify(message, 'error', timeout)
  }

  function info(message, timeout = 5000) {
    return notify(message, 'info', timeout)
  }

  function warning(message, timeout = 6000) {
    return notify(message, 'warning', timeout)
  }

  return {
    notifications,
    notify,
    removeNotification,
    clearNotifications,
    success,
    error,
    info,
    warning,
  }
}
