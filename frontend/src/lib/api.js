const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || ''

export function getApiUrl() {
  if (!configuredApiUrl) return '/api'

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1'

    if (!isLocalHost) {
      return '/api'
    }

    const isHttpsPage = window.location.protocol === 'https:'
    const isInsecureAbsoluteApi = configuredApiUrl.startsWith('http://')

    if (isHttpsPage && isInsecureAbsoluteApi) {
      return '/api'
    }

    try {
      const api = new URL(configuredApiUrl, window.location.origin)
      if (api.origin === window.location.origin) return '/api'
    } catch (error) {
      return '/api'
    }
  }

  return configuredApiUrl
}

export const API_URL = getApiUrl()

export function getRequestErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Network connection failed. Please refresh the page and try again.'
  }
  return fallback
}
