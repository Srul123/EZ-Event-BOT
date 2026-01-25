/**
 * Validate phone number format
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false
  // Accepts formats: +1234567890, 1234567890, (123) 456-7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
  return phoneRegex.test(phone.trim())
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate required field
 * @param {any} value
 * @returns {boolean}
 */
export function validateRequired(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * Validate guest object
 * @param {Object} guest
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateGuest(guest) {
  const errors = []
  
  if (!validateRequired(guest.name)) {
    errors.push('Name is required')
  }
  
  if (!validateRequired(guest.phone)) {
    errors.push('Phone is required')
  } else if (!validatePhone(guest.phone)) {
    errors.push('Invalid phone number format')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate guests array
 * @param {Array} guests
 * @returns {{valid: boolean, errors: Array<{index: number, errors: string[]}>}}
 */
export function validateGuests(guests) {
  if (!Array.isArray(guests) || guests.length === 0) {
    return {
      valid: false,
      errors: [{ index: -1, errors: ['At least one guest is required'] }],
    }
  }
  
  const errors = []
  guests.forEach((guest, index) => {
    const validation = validateGuest(guest)
    if (!validation.valid) {
      errors.push({
        index,
        errors: validation.errors,
      })
    }
  })
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check for duplicate phone numbers in guests array
 * @param {Array} guests
 * @returns {Array<{index: number, phone: string}>}
 */
export function findDuplicatePhones(guests) {
  const phoneMap = new Map()
  const duplicates = []
  
  guests.forEach((guest, index) => {
    if (guest.phone) {
      const normalizedPhone = guest.phone.trim().toLowerCase()
      if (phoneMap.has(normalizedPhone)) {
        duplicates.push({ index, phone: guest.phone })
        if (!duplicates.find((d) => d.index === phoneMap.get(normalizedPhone))) {
          duplicates.push({ index: phoneMap.get(normalizedPhone), phone: guest.phone })
        }
      } else {
        phoneMap.set(normalizedPhone, index)
      }
    }
  })
  
  return duplicates
}
