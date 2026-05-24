import { poiCategoryLabels } from '../constants/pois'
import type { Poi, PoiBoundsSearchParams, PoiCategory, PoiSearchBounds } from '../types/pois'

const OVERPASS_INTERPRETER_URL = 'https://overpass-api.de/api/interpreter'
const DEFAULT_POI_LIMIT = 180
const MAX_BOUNDS_LAT_SPAN = 0.12
const MAX_BOUNDS_LNG_SPAN = 0.12

export class PoiApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PoiApiError'
    this.status = status
  }
}

type OverpassElementType = 'node' | 'way' | 'relation'

interface OverpassElement {
  id: number
  type: OverpassElementType
  lat?: number
  lon?: number
  center?: {
    lat?: number
    lon?: number
  }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

const categoryQueryParts: Record<PoiCategory, string[]> = {
  education: [
    'nwr["amenity"~"^(school|kindergarten|college|university)$"]',
  ],
  food: [
    'nwr["amenity"~"^(restaurant|fast_food|cafe)$"]',
  ],
  fuel: [
    'nwr["amenity"="fuel"]',
  ],
  health: [
    'nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]',
    'nwr["healthcare"~"^(hospital|clinic)$"]',
  ],
  leisure: [
    'nwr["leisure"~"^(park|garden|playground)$"]',
    'nwr["place"="square"]',
  ],
  market: [
    'nwr["shop"~"^(supermarket|convenience|grocery)$"]',
    'nwr["amenity"="marketplace"]',
  ],
}

function normalizeCoordinate(value: number) {
  return Number(value.toFixed(4))
}

function normalizeBounds(bounds: PoiSearchBounds) {
  return {
    east: normalizeCoordinate(bounds.east),
    north: normalizeCoordinate(bounds.north),
    south: normalizeCoordinate(bounds.south),
    west: normalizeCoordinate(bounds.west),
  }
}

function isBoundsTooLarge(bounds: PoiSearchBounds) {
  const latitudeSpan = Math.abs(bounds.north - bounds.south)
  const longitudeSpan = Math.abs(bounds.east - bounds.west)
  return latitudeSpan > MAX_BOUNDS_LAT_SPAN || longitudeSpan > MAX_BOUNDS_LNG_SPAN
}

function buildOverpassQuery(params: PoiBoundsSearchParams) {
  const bounds = normalizeBounds(params.bounds)
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const queryParts = params.categories.flatMap((category) => categoryQueryParts[category] ?? [])

  return `[out:json][timeout:15];
(
${queryParts.map((part) => `  ${part}(${bbox});`).join('\n')}
);
out center;`
}

function getPoiCategory(tags: Record<string, string>, allowedCategories: Set<PoiCategory>): PoiCategory | null {
  const amenity = tags.amenity
  const healthcare = tags.healthcare
  const leisure = tags.leisure
  const place = tags.place
  const shop = tags.shop

  if (
    allowedCategories.has('market') &&
    ((shop ? ['supermarket', 'convenience', 'grocery'].includes(shop) : false) || amenity === 'marketplace')
  ) {
    return 'market'
  }

  if (allowedCategories.has('fuel') && amenity === 'fuel') {
    return 'fuel'
  }

  if (
    allowedCategories.has('health') &&
    (
      (amenity ? ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(amenity) : false) ||
      (healthcare ? ['hospital', 'clinic'].includes(healthcare) : false)
    )
  ) {
    return 'health'
  }

  if (allowedCategories.has('food') && amenity && ['restaurant', 'fast_food', 'cafe'].includes(amenity)) {
    return 'food'
  }

  if (
    allowedCategories.has('education') &&
    amenity &&
    ['school', 'kindergarten', 'college', 'university'].includes(amenity)
  ) {
    return 'education'
  }

  if (
    allowedCategories.has('leisure') &&
    ((leisure ? ['park', 'garden', 'playground'].includes(leisure) : false) || place === 'square')
  ) {
    return 'leisure'
  }

  return null
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6371000
  const latitudeDistance = toRadians(to.latitude - from.latitude)
  const longitudeDistance = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDistance / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function getElementCoordinates(element: OverpassElement) {
  const latitude = element.type === 'node' ? element.lat : element.center?.lat
  const longitude = element.type === 'node' ? element.lon : element.center?.lon

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    latitude: latitude as number,
    longitude: longitude as number,
  }
}

function getPoiName(tags: Record<string, string>, category: PoiCategory) {
  return (
    tags.name ||
    tags.brand ||
    tags.operator ||
    tags['official_name'] ||
    poiCategoryLabels[category]
  )
}

function normalizeOverpassElements(payload: OverpassResponse, params: PoiBoundsSearchParams): Poi[] {
  const allowedCategories = new Set(params.categories)
  const seen = new Set<string>()
  const elements = Array.isArray(payload.elements) ? payload.elements : []
  const pois: Poi[] = []

  for (const element of elements) {
    const key = `${element.type}-${element.id}`
    if (seen.has(key)) continue

    const tags = element.tags ?? {}
    const category = getPoiCategory(tags, allowedCategories)
    const coordinates = getElementCoordinates(element)

    if (!category || !coordinates) continue

    seen.add(key)
    pois.push({
      id: key,
      osmId: element.id,
      osmType: element.type,
      category,
      name: getPoiName(tags, category),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      tags,
      distanceMeters: getDistanceMeters(params.center, coordinates),
    })
  }

  return pois
    .sort((first, second) => (first.distanceMeters ?? 0) - (second.distanceMeters ?? 0))
    .slice(0, params.limit ?? DEFAULT_POI_LIMIT)
}

export async function searchPoisByBounds(
  params: PoiBoundsSearchParams,
  signal?: AbortSignal,
): Promise<Poi[]> {
  if (!params.categories.length) return []
  if (isBoundsTooLarge(params.bounds)) return []

  const query = buildOverpassQuery(params)
  const body = new URLSearchParams({ data: query })
  const response = await fetch(OVERPASS_INTERPRETER_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
    signal,
  })

  if (!response.ok) {
    throw new PoiApiError(response.status, `Overpass error ${response.status}`)
  }

  const payload = (await response.json()) as OverpassResponse
  return normalizeOverpassElements(payload, params)
}
