import { ref } from 'vue'
import { parseAndValidateCsv, normalizeCsvGuests } from '../utils/csvParser.js'
import { validateGuest, findDuplicatePhones } from '../utils/validators.js'

/**
 * Composable for CSV import functionality
 * @returns {Object}
 */
export function useCsvImport() {
  const guests = ref([])
  const errors = ref([])
  const loading = ref(false)

  /**
   * Parse and validate CSV file
   * @param {File} file
   */
  async function parseCsv(file) {
    loading.value = true
    errors.value = []
    guests.value = []

    try {
      const result = await parseAndValidateCsv(file)
      guests.value = result.guests
      errors.value = result.errors

      // Additional validation: check for duplicates
      const duplicates = findDuplicatePhones(guests.value)
      if (duplicates.length > 0) {
        duplicates.forEach((dup) => {
          errors.value.push({
            type: 'duplicate',
            message: `Duplicate phone number: ${dup.phone}`,
            row: dup.index,
          })
        })
      }

      // Validate each guest
      guests.value.forEach((guest, index) => {
        const validation = validateGuest(guest)
        if (!validation.valid) {
          guest._errors = validation.errors
          errors.value.push({
            type: 'validation',
            message: validation.errors.join(', '),
            row: index,
          })
        } else {
          delete guest._errors
        }
      })

      return { success: true, guests: guests.value, errors: errors.value }
    } catch (error) {
      errors.value = [{ type: 'file', message: error.message }]
      return { success: false, guests: [], errors: errors.value }
    } finally {
      loading.value = false
    }
  }

  /**
   * Add guest manually
   * @param {Object} guest
   */
  function addGuest(guest) {
    const validation = validateGuest(guest)
    if (validation.valid) {
      guests.value.push({ ...guest, _errors: undefined })
      return true
    }
    return false
  }

  /**
   * Remove guest by index
   * @param {number} index
   */
  function removeGuest(index) {
    guests.value.splice(index, 1)
  }

  /**
   * Update guest by index
   * @param {number} index
   * @param {Object} updates
   */
  function updateGuest(index, updates) {
    if (index >= 0 && index < guests.value.length) {
      const updated = { ...guests.value[index], ...updates }
      const validation = validateGuest(updated)
      if (validation.valid) {
        delete updated._errors
      } else {
        updated._errors = validation.errors
      }
      guests.value[index] = updated
    }
  }

  /**
   * Get valid guests (without errors)
   * @returns {Array}
   */
  function getValidGuests() {
    return guests.value.filter((g) => !g._errors || g._errors.length === 0)
  }

  /**
   * Clear all guests
   */
  function clearGuests() {
    guests.value = []
    errors.value = []
  }

  return {
    guests,
    errors,
    loading,
    parseCsv,
    addGuest,
    removeGuest,
    updateGuest,
    getValidGuests,
    clearGuests,
  }
}
