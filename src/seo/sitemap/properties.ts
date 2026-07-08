import {
  DEFAULT_API_BASE_URL,
  normalizeApiBaseUrl,
  PUBLIC_PROPERTY_ENDPOINTS,
} from '../../api/publicEndpoints'
import type { Property } from '../../types/api'
import { buildAbsoluteUrl, SITEMAP_FILES } from './config'
import type { SitemapFile } from './types'

interface ApiFailure {
  success: false
  error: {
    message: string
  }
}

interface ApiSuccess<T> {
  data: T
  success: true
}

interface PropertySlugCandidate {
  seoSlug?: string | null
  slug?: string | null
}

function getBuildApiBaseUrl() {
  return normalizeApiBaseUrl(
    process.env.VITE_API_URL ??
      process.env.VITE_API_BASE_URL ??
      process.env.API_URL ??
      process.env.API_BASE_URL ??
      DEFAULT_API_BASE_URL,
  )
}

async function parseJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text) as unknown
}

function normalizePropertyList(payload: unknown): Property[] {
  if (Array.isArray(payload)) return payload as Property[]

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      data?: unknown
      items?: unknown
      properties?: unknown
      results?: unknown
    }

    for (const value of [candidate.properties, candidate.items, candidate.results, candidate.data]) {
      if (Array.isArray(value)) return value as Property[]
    }
  }

  return []
}

function createSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getPropertySlug(property: Property) {
  const candidate = property as Property & PropertySlugCandidate
  const explicitSlug = candidate.slug ?? candidate.seoSlug
  if (explicitSlug?.trim()) return createSlug(explicitSlug)

  const titleSlug = property.title ? createSlug(property.title) : ''
  return [titleSlug, property.id].filter(Boolean).join('-')
}

function getPropertyLastmod(property: Property) {
  return property.updatedAt ?? property.createdAt ?? new Date().toISOString()
}

async function fetchPropertiesFromEndpoint(baseUrl: string, endpoint: string) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = (await parseJson(response)) as ApiSuccess<unknown> | ApiFailure | unknown

  if (!response.ok || (payload && typeof payload === 'object' && 'success' in payload && payload.success === false)) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload as ApiFailure).error.message
        : `HTTP ${response.status}`
    throw new Error(message)
  }

  return normalizePropertyList(payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload)
}

async function getPublicProperties() {
  const baseUrl = getBuildApiBaseUrl()
  const warnings: string[] = []

  for (const endpoint of PUBLIC_PROPERTY_ENDPOINTS) {
    try {
      const properties = await fetchPropertiesFromEndpoint(baseUrl, endpoint)
      console.info(`[sitemap] Imóveis públicos carregados de ${baseUrl}${endpoint}: ${properties.length}`)
      return properties
    } catch (error) {
      warnings.push(
        `${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  console.warn(
    `[sitemap] Aviso: não foi possível carregar imóveis públicos para ${SITEMAP_FILES.properties}. Gerando sitemap vazio. Endpoints testados: ${warnings.join(
      ' | ',
    )}`,
  )
  return []
}

export async function createPropertiesSitemap(): Promise<SitemapFile> {
  const properties = await getPublicProperties()

  return {
    filename: SITEMAP_FILES.properties,
    entries: properties.map((property) => ({
      changefreq: 'daily',
      lastmod: getPropertyLastmod(property),
      loc: buildAbsoluteUrl(`/imovel/${getPropertySlug(property)}`),
      priority: 0.8,
    })),
  }
}
