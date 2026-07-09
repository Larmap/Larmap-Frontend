import type { Property } from '../types/api'
import { readStorageValue } from './storage'

const LOCAL_ADMIN_PROPERTIES_KEY = 'larmap.admin.localProperties'
const LEGACY_LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'

type PropertyWithSeo = Property & {
  area?: number | string | null
  builtArea?: number | string | null
  code?: string | null
  privateArea?: number | string | null
  reference?: string | null
  seoSlug?: string | null
  slug?: string | null
  totalArea?: number | string | null
  usableArea?: number | string | null
}

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function createSlug(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getPropertySlug(property: Property) {
  const candidate = property as PropertyWithSeo
  const explicitSlug = candidate.slug ?? candidate.seoSlug
  if (explicitSlug?.trim()) return createSlug(explicitSlug)

  const titleSlug = property.title ? createSlug(property.title) : ''
  return [titleSlug, property.id].filter(Boolean).join('-')
}

export function findPropertyBySlug(properties: Property[], slug = '') {
  const normalizedSlug = createSlug(slug)

  return properties.find((property) => {
    if (property.id === slug || property.id === normalizedSlug) return true
    return getPropertySlug(property) === normalizedSlug
  })
}

export function readLocalAdminProperties() {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw = readStorageValue(LOCAL_ADMIN_PROPERTIES_KEY, LEGACY_LOCAL_ADMIN_PROPERTIES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Property[]
  } catch {
    return []
  }
}

export function mergePropertyLists(remoteProperties: Property[], localProperties: Property[]) {
  const byId = new Map<string, Property>()

  localProperties.forEach((property) => byId.set(property.id, property))
  remoteProperties.forEach((property) => byId.set(property.id, property))

  return Array.from(byId.values())
}

export function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.replace(/,/g, '')
  const match = normalized.match(/\d+(\.\d+)?/)
  if (!match) return null

  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function getFirstString(property: Property, keys: string[]) {
  const source = property as unknown as Record<string, unknown>

  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

export function getFirstNumber(property: Property, keys: string[]) {
  const source = property as unknown as Record<string, unknown>

  for (const key of keys) {
    const parsed = parseNumber(source[key])
    if (parsed !== null) return parsed
  }

  return null
}

export function getPropertyImages(property: Property) {
  const candidates = [
    ...(property.imageUrls ?? []),
    ...(property.images ?? []),
    ...(property.photos ?? []),
    ...(property.media ?? [])
      .filter((item) => item.type === 'image' || item.url || item.src)
      .map((item) => item.url || item.src || ''),
  ]

  return Array.from(new Set(candidates.filter((image) => typeof image === 'string' && image.trim())))
}

export function getPriceLabel(property: Property) {
  const rawPrice = getFirstString(property, [
    'price',
    'rentPrice',
    'salePrice',
    'value',
    'amount',
    'preco',
    'valorAluguel',
    'valorVenda',
  ])

  if (!rawPrice) return 'Preço sob consulta'

  const parsedPrice = parseNumber(rawPrice)
  if (parsedPrice === null) return rawPrice

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(parsedPrice)
}

export function getPropertyCity(property: Property) {
  return getFirstString(property, ['city', 'cidade'])
}

export function getPropertyNeighborhood(property: Property) {
  const explicitNeighborhood = getFirstString(property, ['neighborhood', 'district', 'bairro'])
  if (explicitNeighborhood) return explicitNeighborhood

  const address = getFirstString(property, ['address', 'endereco'])
  const addressParts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (addressParts.length >= 3) return addressParts[addressParts.length - 2]
  return ''
}

export function getPropertyAddress(property: Property) {
  const street = getFirstString(property, ['street', 'streetName'])
  const number = getFirstString(property, ['addressNumber', 'number'])
  const buildingName = getFirstString(property, ['buildingName', 'condominiumName'])
  const fullAddress = getFirstString(property, ['address', 'endereco'])

  return [
    street ? `${street}${number ? `, ${number}` : ''}` : '',
    buildingName ? `Edifício ${buildingName}` : '',
  ]
    .filter(Boolean)
    .join(' | ') || fullAddress
}

export function getPropertyLocationLabel(property: Property) {
  const address = getPropertyAddress(property)
  const neighborhood = getPropertyNeighborhood(property)
  const city = getPropertyCity(property)
  const state = getFirstString(property, ['stateCode', 'state', 'uf'])
  const postalCode = getFirstString(property, ['postalCode', 'cep'])
  const secondary = [neighborhood, city, state, postalCode].filter(Boolean).join(', ')

  return [address, secondary].filter(Boolean).join(' - ') || 'Localização não informada'
}

export function getCompactLocationLabel(property: Property) {
  const neighborhood = getPropertyNeighborhood(property)
  const city = getPropertyCity(property)
  const state = getFirstString(property, ['stateCode', 'state', 'uf'])

  return [neighborhood, city, state].filter(Boolean).join(', ') || 'Localização não informada'
}

export function getTransactionLabel(property: Property) {
  const text = normalizeText(getFirstString(property, ['listingType', 'transactionType', 'purpose', 'operation']))

  if (/\b(aluguel|alugar|locacao|locar|rent|rental)\b/.test(text)) return 'Aluguel'
  if (/\b(compra|comprar|venda|vender|sale|sell)\b/.test(text)) return 'Venda'
  return 'Imóvel'
}

export function getPropertyTypeLabel(property: Property) {
  const type = getFirstString(property, ['propertyType', 'realEstateType', 'tipoImovel', 'type'])
  const normalizedType = normalizeText(type)
  const searchableText = normalizeText([type, property.title, property.description].filter(Boolean).join(' '))

  if (/\b(cobertura|penthouse)\b/.test(`${normalizedType} ${searchableText}`)) return 'Cobertura'
  if (/\b(terreno|lote|loteamento)\b/.test(`${normalizedType} ${searchableText}`)) return 'Terreno'
  if (/\b(casa|sobrado|residencia)\b/.test(`${normalizedType} ${searchableText}`)) return 'Casa'
  if (/\b(apartamento|apto|flat|studio|loft)\b/.test(`${normalizedType} ${searchableText}`)) return 'Apartamento'

  return type || 'Imóvel'
}

export function getPropertyAreaLabel(property: Property) {
  const area = getFirstNumber(property, [
    'area',
    'usableArea',
    'privateArea',
    'builtArea',
    'totalArea',
    'metragem',
    'metrosQuadrados',
  ])

  if (area === null) return ''

  return `${area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`
}

export function getPropertyCode(property: Property) {
  const explicitCode = getFirstString(property, ['code', 'reference'])
  if (explicitCode) return explicitCode

  const fallback = property.id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase()
  return `LM-${fallback || property.id.slice(0, 5).toUpperCase()}`
}

export function getContactName(property: Property) {
  return (
    property.agentName ||
    property.responsibleAgentName ||
    getFirstString(property, ['companyName', 'realEstateName', 'brokerName']) ||
    'Responsável pelo anúncio'
  )
}
