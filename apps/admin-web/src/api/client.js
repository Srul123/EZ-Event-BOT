import axios from 'axios'

/**
 * Axios instance configured for API requests
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common error cases
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      if (status === 404) {
        error.message = data.error || 'Resource not found'
      } else if (status === 400) {
        error.message = data.error || 'Validation error'
        error.details = data.details || []
      } else if (status >= 500) {
        error.message = data.error || 'Server error'
      }
    } else if (error.request) {
      // Request made but no response received
      error.message = 'Network error. Please check your connection.'
    } else {
      // Something else happened
      error.message = error.message || 'An unexpected error occurred'
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
