import { allPoiCategories, poiCategoryLabels, poiCategoryPriority } from '../constants/pois'
import type { Poi, PoiBoundsSearchParams, PoiCategory, PoiSearchBounds } from '../types/pois'

const OVERPASS_INTERPRETER_URL = 'https://overpass-api.de/api/interpreter'
const DEFAULT_POI_LIMIT = 420
const MAX_BOUNDS_LAT_SPAN = 0.35
const MAX_BOUNDS_LNG_SPAN = 0.35

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
  market: [
    'nwr["shop"~"^(supermarket|convenience|grocery)$"]',
    'nwr["amenity"="marketplace"]',
  ],
  fuel: [
    'nwr["amenity"="fuel"]',
  ],
  health: [
    'nwr["amenity"~"^(hospital|clinic|doctors|dentist|health_post)$"]',
    'nwr["healthcare"~"^(hospital|clinic|doctor|centre|dentist|yes)$"]',
  ],
  pharmacy: [
    'nwr["amenity"="pharmacy"]',
    'nwr["shop"="chemist"]',
  ],
  food: [
    'nwr["amenity"~"^(restaurant|fast_food|cafe)$"]',
  ],
  education: [
    'nwr["amenity"~"^(school|kindergarten|college|university)$"]',
  ],
  fitness: [
    'nwr["leisure"~"^(fitness_centre|fitness_station)$"]',
    'nwr["sport"~"^(fitness|crossfit|gymnastics|pilates|yoga)$"]',
  ],
  leisure: [
    'nwr["leisure"~"^(park|garden|playground)$"]',
    'nwr["place"="square"]',
  ],
  religion: [
    'nwr["amenity"="place_of_worship"]',
    'nwr["building"~"^(church|cathedral|chapel|mosque|temple|synagogue)$"]',
    'nwr["religion"]',
  ],
}

const healthAmenities = ['hospital', 'clinic', 'doctors', 'dentist', 'health_post']
const healthcareTags = ['hospital', 'clinic', 'doctor', 'centre', 'dentist', 'yes']
const fitnessLeisureTags = ['fitness_centre', 'fitness_station']
const fitnessSportTags = ['fitness', 'crossfit', 'gymnastics', 'pilates', 'yoga']
const religionBuildings = ['church', 'cathedral', 'chapel', 'mosque', 'temple', 'synagogue']

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

function getBoundsSpan(bounds: PoiSearchBounds) {
  const latitudeSpan = Math.abs(bounds.north - bounds.south)
  const longitudeSpan = Math.abs(bounds.east - bounds.west)

  return {
    latitudeSpan,
    longitudeSpan,
  }
}

function isBoundsTooLarge(bounds: PoiSearchBounds) {
  const { latitudeSpan, longitudeSpan } = getBoundsSpan(bounds)
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
  const building = tags.building
  const healthcare = tags.healthcare
  const leisure = tags.leisure
  const place = tags.place
  const religion = tags.religion
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

  if (allowedCategories.has('pharmacy') && (amenity === 'pharmacy' || shop === 'chemist')) {
    return 'pharmacy'
  }

  if (
    allowedCategories.has('health') &&
    (
      (amenity ? healthAmenities.includes(amenity) : false) ||
      (healthcare ? healthcareTags.includes(healthcare) : false)
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
    allowedCategories.has('fitness') &&
    (
      (leisure ? fitnessLeisureTags.includes(leisure) : false) ||
      (tags.sport ? fitnessSportTags.includes(tags.sport) : false)
    )
  ) {
    return 'fitness'
  }

  if (
    allowedCategories.has('leisure') &&
    ((leisure ? ['park', 'garden', 'playground'].includes(leisure) : false) || place === 'square')
  ) {
    return 'leisure'
  }

  if (
    allowedCategories.has('religion') &&
    (
      amenity === 'place_of_worship' ||
      (building ? religionBuildings.includes(building) : false) ||
      Boolean(religion)
    )
  ) {
    return 'religion'
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
  if (category === 'religion') {
    return (
      tags.name ||
      tags['name:pt'] ||
      tags.denomination ||
      tags.religion ||
      'Instituicao religiosa'
    )
  }

  return (
    tags.name ||
    tags['name:pt'] ||
    tags.brand ||
    tags.operator ||
    tags['official_name'] ||
    poiCategoryLabels[category]
  )
}

function createEmptyCategoryCounts(): Record<PoiCategory, number> {
  return allPoiCategories.reduce((counts, category) => {
    counts[category] = 0
    return counts
  }, {} as Record<PoiCategory, number>)
}

function getPoiCategoryCounts(pois: Poi[]) {
  const categoryCounts = createEmptyCategoryCounts()

  for (const poi of pois) {
    categoryCounts[poi.category] += 1
  }

  return categoryCounts
}

function comparePoisForDistribution(first: Poi, second: Poi) {
  const priorityA = poiCategoryPriority[first.category] ?? 99
  const priorityB = poiCategoryPriority[second.category] ?? 99
  if (priorityA !== priorityB) return priorityA - priorityB

  const nameA = first.name.trim().toLowerCase()
  const nameB = second.name.trim().toLowerCase()
  const hasNameA = nameA.length > 0
  const hasNameB = nameB.length > 0
  if (hasNameA !== hasNameB) return hasNameA ? -1 : 1

  const distanceA = first.distanceMeters ?? Number.POSITIVE_INFINITY
  const distanceB = second.distanceMeters ?? Number.POSITIVE_INFINITY
  if (distanceA !== distanceB) return distanceA - distanceB

  if (first.id === second.id) return 0
  return first.id < second.id ? -1 : 1
}

function getDistributionGrid(limit: number) {
  if (limit <= 180) return { cols: 10, rows: 8 }
  if (limit <= 260) return { cols: 12, rows: 10 }
  return { cols: 16, rows: 12 }
}

function limitPoisByBoundsDistribution(pois: Poi[], bounds: PoiSearchBounds, limit = DEFAULT_POI_LIMIT) {
  if (pois.length <= limit) return pois

  const grid = getDistributionGrid(limit)
  const north = bounds.north
  const south = bounds.south
  const east = bounds.east
  const west = bounds.west
  const latSpan = Math.max(0.000001, north - south)
  const lngSpan = Math.max(0.000001, east - west)
  const latStep = latSpan / grid.rows
  const lngStep = lngSpan / grid.cols
  const buckets = new Map<string, Poi[]>()

  for (const poi of pois) {
    const row = Math.min(
      grid.rows - 1,
      Math.max(0, Math.floor((poi.latitude - south) / latStep)),
    )
    const col = Math.min(
      grid.cols - 1,
      Math.max(0, Math.floor((poi.longitude - west) / lngStep)),
    )
    const key = `${row}:${col}`
    const bucket = buckets.get(key)

    if (bucket) {
      bucket.push(poi)
    } else {
      buckets.set(key, [poi])
    }
  }

  const bucketGroups = Array.from(buckets.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([, bucket]) => bucket.sort(comparePoisForDistribution))
  const distributed: Poi[] = []

  for (let index = 0; distributed.length < limit; index += 1) {
    let addedInLayer = false

    for (const bucket of bucketGroups) {
      const poi = bucket[index]
      if (!poi) continue

      distributed.push(poi)
      addedInLayer = true

      if (distributed.length >= limit) break
    }

    if (!addedInLayer) break
  }

  return distributed
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
}

export async function searchPoisByBounds(
  params: PoiBoundsSearchParams,
  signal?: AbortSignal,
): Promise<Poi[]> {
  if (!params.categories.length) return []
  if (isBoundsTooLarge(params.bounds)) {
    const { latitudeSpan, longitudeSpan } = getBoundsSpan(params.bounds)

    if (import.meta.env.DEV) {
      console.warn('[POI_DEBUG] bounds too large', {
        bounds: params.bounds,
        latSpan: latitudeSpan,
        lngSpan: longitudeSpan,
        maxLatSpan: MAX_BOUNDS_LAT_SPAN,
        maxLngSpan: MAX_BOUNDS_LNG_SPAN,
      })
    }

    return []
  }

  const query = buildOverpassQuery(params)
  const normalizedBounds = normalizeBounds(params.bounds)
  const bbox = `${normalizedBounds.south},${normalizedBounds.west},${normalizedBounds.north},${normalizedBounds.east}`
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
  const rawElements = Array.isArray(payload.elements) ? payload.elements : []
  const normalizedPois = normalizeOverpassElements(payload, params)
  const pois = limitPoisByBoundsDistribution(
    normalizedPois,
    params.bounds,
    params.limit ?? DEFAULT_POI_LIMIT,
  )

  if (import.meta.env.DEV) {
    const categoryCounts = getPoiCategoryCounts(normalizedPois)

    console.info('[POI_DEBUG] overpass result', {
      bbox,
      categoryCounts,
      limit: params.limit ?? DEFAULT_POI_LIMIT,
      normalizedCount: normalizedPois.length,
      rawCount: rawElements.length,
      returnedCategoryCounts: getPoiCategoryCounts(pois),
      returnedCount: pois.length,
    })

    for (const category of params.categories) {
      if (categoryCounts[category] > 0) continue

      console.info('[POI_DEBUG] selected category returned no POIs', {
        bbox,
        category,
        label: poiCategoryLabels[category],
      })
    }
  }

  return pois
}
