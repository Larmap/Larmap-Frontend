export interface GeocodingResult {
  label: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  stateCode?: string
  neighborhood?: string
  boundingBox?: {
    south: number
    north: number
    west: number
    east: number
  }
}

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  state_code?: string
  'ISO3166-2-lvl4'?: string
  suburb?: string
  neighbourhood?: string
  quarter?: string
  city_district?: string
  road?: string
}

interface NominatimSearchResult {
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
  boundingbox?: string[]
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

const brazilStateCodes: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getCityFromAddress(address?: NominatimAddress) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.county ||
    ''
  ).trim()
}

function getStateCodeFromAddress(address?: NominatimAddress) {
  const explicitCode = address?.state_code?.trim()
  if (explicitCode) return explicitCode.toUpperCase()

  const isoCode = address?.['ISO3166-2-lvl4']?.split('-').pop()?.trim()
  if (isoCode) return isoCode.toUpperCase()

  const state = address?.state?.trim()
  if (!state) return ''

  return brazilStateCodes[normalizeText(state)] ?? ''
}

function getNeighborhoodFromAddress(address?: NominatimAddress) {
  return (
    address?.neighbourhood ||
    address?.suburb ||
    address?.quarter ||
    address?.city_district ||
    ''
  ).trim()
}

function formatCityLabel(city: string, state?: string, stateCode?: string) {
  const stateLabel = stateCode || state
  return stateLabel ? `${city} - ${stateLabel}` : city
}

function toGeocodingResult(result: NominatimSearchResult): GeocodingResult | null {
  const latitude = Number.parseFloat(result.lat)
  const longitude = Number.parseFloat(result.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const boundingValues = result.boundingbox?.map((value) => Number.parseFloat(value))
  const hasBoundingBox = boundingValues?.length === 4 && boundingValues.every(Number.isFinite)
  const city = getCityFromAddress(result.address)
  const state = result.address?.state?.trim() || ''
  const stateCode = getStateCodeFromAddress(result.address)
  const neighborhood = getNeighborhoodFromAddress(result.address)

  return {
    label: city ? formatCityLabel(city, state, stateCode) : result.display_name,
    latitude,
    longitude,
    city: city || undefined,
    state: state || undefined,
    stateCode: stateCode || undefined,
    neighborhood: neighborhood || undefined,
    boundingBox: hasBoundingBox
      ? {
          south: boundingValues[0],
          north: boundingValues[1],
          west: boundingValues[2],
          east: boundingValues[3],
        }
      : undefined,
  }
}

function dedupeCityResults(results: GeocodingResult[]) {
  const seen = new Set<string>()

  return results.filter((result) => {
    if (!result.city) return false

    const key = normalizeText(`${result.city}-${result.stateCode || result.state || ''}`)
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

export async function searchLocation(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodingResult | null> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return null

  const params = new URLSearchParams({
    addressdetails: '1',
    countrycodes: 'br',
    format: 'jsonv2',
    limit: '1',
    q: normalizedQuery,
  })

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel buscar essa localizacao agora.')
  }

  const payload = (await response.json()) as NominatimSearchResult[]
  const firstResult = payload[0]
  if (!firstResult) return null

  return toGeocodingResult(firstResult)
}

export async function searchCityLocations(
  query: string,
  signal?: AbortSignal,
  limit = 6,
): Promise<GeocodingResult[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  const params = new URLSearchParams({
    addressdetails: '1',
    countrycodes: 'br',
    format: 'jsonv2',
    limit: String(Math.max(limit * 2, limit)),
    q: normalizedQuery,
  })

  const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel buscar cidades agora.')
  }

  const payload = (await response.json()) as NominatimSearchResult[]
  const results = payload
    .map((item) => toGeocodingResult(item))
    .filter((item): item is GeocodingResult => item !== null)

  return dedupeCityResults(results).slice(0, limit)
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    addressdetails: '1',
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '14',
  })

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel identificar essa localizacao agora.')
  }

  const payload = (await response.json()) as NominatimSearchResult
  return toGeocodingResult(payload)
}
