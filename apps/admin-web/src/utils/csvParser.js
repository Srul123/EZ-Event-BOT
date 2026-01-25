import Papa from 'papaparse'

/**
 * Parse CSV file to array of objects
 * @param {File} file
 * @returns {Promise<{data: Array, errors: Array}>}
 */
export async function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        resolve({
          data: results.data,
          errors: results.errors,
        })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

/**
 * Validate and normalize CSV data to guest format
 * @param {Array} csvData
 * @returns {Array<{name: string, phone: string, _errors?: string[]}>}
 */
export function normalizeCsvGuests(csvData) {
  return csvData.map((row, index) => {
    const guest = {
      name: (row.name || '').trim(),
      phone: (row.phone || '').trim(),
    }
    
    // Collect validation errors
    const errors = []
    if (!guest.name) {
      errors.push('Name is required')
    }
    if (!guest.phone) {
      errors.push('Phone is required')
    }
    
    if (errors.length > 0) {
      guest._errors = errors
    }
    
    return guest
  })
}

/**
 * Parse and validate CSV file
 * @param {File} file
 * @returns {Promise<{guests: Array, errors: Array}>}
 */
export async function parseAndValidateCsv(file) {
  try {
    const { data, errors: parseErrors } = await parseCsv(file)
    const guests = normalizeCsvGuests(data)
    
    // Filter out rows with errors
    const validGuests = guests.filter((g) => !g._errors || g._errors.length === 0)
    const invalidRows = guests.filter((g) => g._errors && g._errors.length > 0)
    
    return {
      guests: validGuests,
      errors: [
        ...parseErrors.map((e) => ({ type: 'parse', message: e.message, row: e.row })),
        ...invalidRows.map((g, idx) => ({
          type: 'validation',
          message: g._errors.join(', '),
          row: guests.indexOf(g),
        })),
      ],
    }
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`)
  }
}
