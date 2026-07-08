export const DEFAULT_API_BASE_URL = 'https://smartmap-backend.onrender.com/api'

export const PUBLIC_PROPERTY_ENDPOINTS = [
  '/public/properties',
  '/properties/public',
  '/map/properties',
  '/properties',
] as const

export function normalizeApiBaseUrl(value: string) {
  const baseUrl = value.replace(/\/+$/, '')
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`
}
