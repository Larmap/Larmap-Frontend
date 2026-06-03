import {
  Bath,
  BedDouble,
  Building2,
  Car,
  ExternalLink,
  Heart,
  Home,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import { divIcon } from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ApiError, leadsApi, propertiesApi } from '../api/client'
import type { GeocodingResult } from '../api/geocoding'
import { CityAutocomplete } from '../components/CityAutocomplete'
import { MapResizeHandler } from '../components/map/MapResizeHandler'
import { PoiCategoryControl } from '../components/map/PoiCategoryControl'
import { PoiLayer } from '../components/map/PoiLayer'
import { PoiViewportTracker, type PoiViewport } from '../components/map/PoiViewportTracker'
import { PublicMapFrame } from '../components/PublicMapFrame'
import { PublicNavbar } from '../components/PublicNavbar'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { allPoiCategories, getPoiSearchLimit, MIN_POI_ZOOM } from '../constants/pois'
import {
  publicDetailedMapTileLayerUrl,
  publicMapAttribution,
  PUBLIC_MAP_DEFAULT_ZOOM,
  PUBLIC_MAP_INITIAL_ZOOM,
} from '../constants/publicMap'
import { getFavorites, toggleFavorite } from '../hooks/useFavorites'
import { useGeocoding } from '../hooks/useGeocoding'
import { useNearbyPois } from '../hooks/useNearbyPois'
import type { CreateLeadInput, Property, PropertyStatus } from '../types/api'
import type { PoiCategory } from '../types/pois'
import { canUsePublicFavorites } from '../utils/userAccess'
import { buildLocalLead, upsertLocalLead } from '../utils/localLeads'
import { readStorageValue } from '../utils/storage'

const defaultCoordinates = {
  latitude: -22.9068,
  longitude: -43.1729,
}

const LOCAL_ADMIN_PROPERTIES_KEY = 'larmap.admin.localProperties'
const LEGACY_LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'

const defaultCenter: [number, number] = [
  defaultCoordinates.latitude,
  defaultCoordinates.longitude,
]

const defaultCity = 'Rio de Janeiro'
const cityRadiusKm = 55
const neighborhoodRadiusKm = 8

const statusOptions: Array<{ value: PropertyStatus; label: string }> = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'NEGOTIATING', label: 'Em negociação' },
  { value: 'SOLD', label: 'Vendido/alugado' },
]

type PropertyTypeFilter = 'apartamento' | 'casa' | 'cobertura' | 'terreno'
type ListingIntent = 'rent' | 'sale' | null
type PageMode = 'map' | 'news'

interface PropertyFilters {
  propertyTypes: PropertyTypeFilter[]
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  city: string
  neighborhoods: string[]
  statuses: PropertyStatus[]
  locationCenter: [number, number] | null
  locationRadiusKm: number | null
}

interface BaseLocationFilter {
  city: string
  center: [number, number]
  radiusKm: number
}

interface NeighborhoodSummary {
  name: string
  count: number
}

interface MapViewState {
  center: [number, number]
  zoom: number
  version: number
}

interface PropertyResult {
  property: Property
  propertyType: PropertyTypeFilter | null
  bedrooms: number | null
  bathrooms: number | null
  parking: number | null
  city: string
  neighborhood: string
  priceLabel: string
  transactionType: ListingIntent
  searchableText: string
}

interface LeadFormState {
  name: string
  whatsapp: string
  email: string
}

const defaultFilters: PropertyFilters = {
  propertyTypes: [],
  bedrooms: null,
  bathrooms: null,
  parking: null,
  city: defaultCity,
  neighborhoods: [],
  statuses: ['AVAILABLE', 'NEGOTIATING', 'SOLD'],
  locationCenter: defaultCenter,
  locationRadiusKm: cityRadiusKm,
}

const defaultBaseLocation: BaseLocationFilter = {
  city: defaultCity,
  center: defaultCenter,
  radiusKm: cityRadiusKm,
}

const defaultCityResult: GeocodingResult = {
  label: 'Rio de Janeiro - RJ',
  latitude: defaultCoordinates.latitude,
  longitude: defaultCoordinates.longitude,
  city: defaultCity,
  state: 'Rio de Janeiro',
  stateCode: 'RJ',
}

const propertyTypeOptions: Array<{ value: PropertyTypeFilter; label: string }> = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'cobertura', label: 'Cobertura' },
  { value: 'terreno', label: 'Terreno' },
]

const bedroomOptions = [1, 2, 3, 4]
const bathroomOptions = [1, 2, 3]
const parkingOptions = [0, 1, 2, 3]

const emptyLeadForm: LeadFormState = {
  email: '',
  name: '',
  whatsapp: '',
}

function cleanPhone(value?: string | null) {
  return value?.replace(/\D/g, '') ?? ''
}

function formatWhatsAppInput(value: string) {
  const digits = cleanPhone(value).slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function getWhatsAppHref(property: Property) {
  const phone = cleanPhone(property.contactWhatsApp || property.contactPhone)
  if (!phone) return ''

  const message = encodeURIComponent(`Olá! Tenho interesse no imóvel "${property.title}" pelo LarMap.`)
  return `https://wa.me/${phone}?text=${message}`
}

function getContactLabel(property: Property) {
  return property.contactWhatsApp || property.contactPhone || 'Contato a confirmar'
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getFirstString(property: Property, keys: Array<keyof Property>) {
  for (const key of keys) {
    const value = property[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

function parseNumber(value: unknown) {
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

function getFirstNumber(property: Property, keys: Array<keyof Property>) {
  for (const key of keys) {
    const parsed = parseNumber(property[key])
    if (parsed !== null) return parsed
  }

  return null
}

function getNumberFromText(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match?.[1]) continue

    const parsed = Number.parseInt(match[1], 10)
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function buildSearchableText(property: Property) {
  return normalizeText(
    [
      property.title,
      property.description,
      property.type,
      property.propertyType,
      property.realEstateType,
      property.tipoImovel,
      property.city,
      property.cidade,
      property.state,
      property.stateCode,
      property.uf,
      property.neighborhood,
      property.district,
      property.bairro,
      property.address,
      property.endereco,
      property.street,
      property.streetName,
      property.addressNumber,
      property.number,
      property.buildingName,
      property.condominiumName,
      property.apartmentNumber,
      property.complement,
      property.postalCode,
      property.cep,
      property.listingType,
      property.transactionType,
      property.purpose,
      property.operation,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function getPropertyType(property: Property, searchableText: string): PropertyTypeFilter | null {
  const explicitType = normalizeText(
    getFirstString(property, ['propertyType', 'realEstateType', 'tipoImovel', 'type']),
  )
  const text = `${explicitType} ${searchableText}`.trim()

  if (/\b(cobertura|penthouse)\b/.test(text)) return 'cobertura'
  if (/\b(terreno|lote|loteamento)\b/.test(text)) return 'terreno'
  if (/\b(casa|sobrado|residencia)\b/.test(text)) return 'casa'
  if (/\b(apartamento|apto|flat|studio|loft)\b/.test(text)) return 'apartamento'

  return null
}

function readLocalAdminProperties() {
  try {
    const raw = readStorageValue(LOCAL_ADMIN_PROPERTIES_KEY, LEGACY_LOCAL_ADMIN_PROPERTIES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Property[]
  } catch {
    return []
  }
}

function mergePropertyLists(remoteProperties: Property[], localProperties: Property[]) {
  const byId = new Map<string, Property>()

  localProperties.forEach((property) => byId.set(property.id, property))
  remoteProperties.forEach((property) => byId.set(property.id, property))

  return Array.from(byId.values())
}

function getBedrooms(property: Property, searchableText: string) {
  return (
    getFirstNumber(property, ['bedrooms', 'rooms', 'quartos']) ??
    getNumberFromText(searchableText, [
      /(\d+)\s*(quartos?|dormitorios?|dorms?|suites?)\b/,
      /(\d+)\s*qts?\b/,
    ])
  )
}

function getBathrooms(property: Property, searchableText: string) {
  return (
    getFirstNumber(property, ['bathrooms', 'banheiros']) ??
    getNumberFromText(searchableText, [
      /(\d+)\s*(banheiros?|banhos?|lavabos?|wcs?)\b/,
      /(\d+)\s*bhs?\b/,
    ])
  )
}

function getParking(property: Property, searchableText: string) {
  const explicitParking = getFirstNumber(property, ['parkingSpots', 'garageSpots', 'vagas'])
  if (explicitParking !== null) return explicitParking
  if (/\b(sem vaga|0 vagas?|sem garagem)\b/.test(searchableText)) return 0

  return getNumberFromText(searchableText, [
    /(\d+)\s*(vagas?|garagens?)\b/,
    /(\d+)\s*vg\b/,
  ])
}

function getPriceLabel(property: Property) {
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

function getCity(property: Property) {
  return getFirstString(property, ['city', 'cidade'])
}

function getLocationLabel(result: PropertyResult) {
  const { property } = result
  const street = getFirstString(property, ['street', 'streetName'])
  const number = getFirstString(property, ['addressNumber', 'number'])
  const buildingName = getFirstString(property, ['buildingName', 'condominiumName'])
  const neighborhood = result.neighborhood
  const city = result.city
  const state = getFirstString(property, ['stateCode', 'state', 'uf'])
  const postalCode = getFirstString(property, ['postalCode', 'cep'])

  const primary = [
    street ? `${street}${number ? `, ${number}` : ''}` : '',
    buildingName ? `Edifício ${buildingName}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
  const secondary = [neighborhood, city, state, postalCode].filter(Boolean).join(', ')
  const fullAddress = getFirstString(property, ['address', 'endereco'])

  return [primary, secondary].filter(Boolean).join(' - ') || fullAddress || 'Localização não informada'
}

function inferNeighborhoodFromText(text: string) {
  const normalized = text.trim()
  if (!normalized) return ''

  const taggedNeighborhood = normalized.match(
    /\b(?:bairro|bairros|neighborhood|district)\s*[:\-]?\s*([^,;|]+)/i,
  )
  if (taggedNeighborhood?.[1]) return taggedNeighborhood[1].trim()

  const commaParts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (commaParts.length >= 3) {
    return commaParts[commaParts.length - 2]
  }

  return ''
}

function getNeighborhood(property: Property) {
  const explicitNeighborhood = getFirstString(property, ['neighborhood', 'district', 'bairro'])
  if (explicitNeighborhood) return explicitNeighborhood

  for (const candidate of [property.address, property.endereco, property.description, property.title]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue

    const inferredNeighborhood = inferNeighborhoodFromText(candidate)
    if (inferredNeighborhood) return inferredNeighborhood
  }

  return ''
}

function getBooleanLikeValue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'sim', 'destaque', 'featured'].includes(normalizeText(value))
  }

  return false
}

function isFeaturedProperty(property: Property) {
  const candidate = property as Property & {
    featured?: unknown
    isFeatured?: unknown
    destaque?: unknown
    highlighted?: unknown
    isHighlight?: unknown
  }

  return [
    candidate.featured,
    candidate.isFeatured,
    candidate.destaque,
    candidate.highlighted,
    candidate.isHighlight,
  ].some(getBooleanLikeValue)
}

function isRecentProperty(property: Property, maxAgeDays: number) {
  const createdAt = Date.parse(property.createdAt)
  if (Number.isNaN(createdAt)) return false

  const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
  return ageInDays <= maxAgeDays
}

function isNewsProperty(property: Property) {
  return isFeaturedProperty(property) || isRecentProperty(property, 15)
}

function getTransactionType(property: Property, searchableText: string): ListingIntent {
  const explicitTransaction = normalizeText(
    getFirstString(property, ['listingType', 'transactionType', 'purpose', 'operation']),
  )
  if (explicitTransaction) {
    if (/\b(aluguel|alugar|locacao|locar|rent|rental)\b/.test(explicitTransaction)) return 'rent'
    if (/\b(compra|comprar|venda|vender|sale|sell)\b/.test(explicitTransaction)) return 'sale'
  }

  const text = searchableText.trim()

  if (/\b(aluguel|alugar|locacao|locar|rent|rental)\b/.test(text)) return 'rent'
  if (/\b(compra|comprar|venda|vender|sale|sell)\b/.test(text)) return 'sale'

  return null
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function formatSpecs(result: PropertyResult) {
  const specs = [
    result.bedrooms !== null ? pluralize(result.bedrooms, 'quarto', 'quartos') : '',
    result.bathrooms !== null ? pluralize(result.bathrooms, 'banheiro', 'banheiros') : '',
    result.parking !== null ? pluralize(result.parking, 'vaga', 'vagas') : '',
  ].filter(Boolean)

  return specs.length ? specs.join(' | ') : 'Detalhes não informados'
}

function enrichProperty(property: Property): PropertyResult {
  const searchableText = buildSearchableText(property)

  return {
    property,
    propertyType: getPropertyType(property, searchableText),
    bedrooms: getBedrooms(property, searchableText),
    bathrooms: getBathrooms(property, searchableText),
    parking: getParking(property, searchableText),
    city: getCity(property),
    neighborhood: getNeighborhood(property),
    priceLabel: getPriceLabel(property),
    transactionType: getTransactionType(property, searchableText),
    searchableText,
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceKm(from: [number, number], to: [number, number]) {
  const earthRadiusKm = 6371
  const latitudeDistance = toRadians(to[0] - from[0])
  const longitudeDistance = toRadians(to[1] - from[1])
  const fromLatitude = toRadians(from[0])
  const toLatitude = toRadians(to[0])

  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDistance / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function matchesCity(result: PropertyResult, filters: PropertyFilters) {
  const cityFilter = normalizeText(filters.city)
  if (!cityFilter) return true

  const normalizedCity = normalizeText(result.city)
  if (normalizedCity.includes(cityFilter) || result.searchableText.includes(cityFilter)) {
    return true
  }

  if (filters.locationCenter && filters.locationRadiusKm) {
    const propertyCenter: [number, number] = [
      result.property.latitude,
      result.property.longitude,
    ]
    return getDistanceKm(filters.locationCenter, propertyCenter) <= filters.locationRadiusKm
  }

  return false
}

function matchesNeighborhood(result: PropertyResult, filters: PropertyFilters) {
  if (!filters.neighborhoods.length) return true

  const selectedNeighborhoods = filters.neighborhoods.map(normalizeText)
  const normalizedNeighborhood = normalizeText(result.neighborhood)

  if (
    selectedNeighborhoods.some(
      (neighborhood) =>
        normalizedNeighborhood.includes(neighborhood) ||
        result.searchableText.includes(neighborhood),
    )
  ) {
    return true
  }

  if (filters.locationCenter && filters.locationRadiusKm === neighborhoodRadiusKm) {
    const propertyCenter: [number, number] = [
      result.property.latitude,
      result.property.longitude,
    ]
    return getDistanceKm(filters.locationCenter, propertyCenter) <= filters.locationRadiusKm
  }

  return false
}

function getListingIntent(value: string | null): ListingIntent {
  if (value === 'aluguel') return 'rent'
  if (value === 'compra' || value === 'venda') return 'sale'
  return null
}

function getListingIntentFromPath(pathname: string): ListingIntent {
  if (pathname === '/aluguel') return 'rent'
  if (pathname === '/compra') return 'sale'
  return null
}

function matchesListingIntent(result: PropertyResult, listingIntent: ListingIntent) {
  if (!listingIntent) return true
  return result.transactionType === listingIntent
}

function getCityFromLocationLabel(label: string) {
  return label.split(',')[0]?.trim() || defaultCity
}

function MapViewport({ view }: { view: MapViewState }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(view.center, view.zoom, { duration: 0.65 })
  }, [map, view])

  return null
}

function getMarkerIcon(result: PropertyResult, isSelected: boolean) {
  const markerClasses = [
    'property-map-marker',
    `property-map-marker--${result.property.status.toLowerCase()}`,
    isSelected ? 'property-map-marker--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return divIcon({
    className: 'property-map-marker-shell',
    html: `
      <div class="${markerClasses}">
        <span class="property-map-marker__core"></span>
      </div>
    `,
    iconAnchor: [19, 44],
    iconSize: [38, 44],
    popupAnchor: [0, -40],
  })
}

export function PublicMapPage() {
  const { isAuthenticated, token, user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const routeListingIntent = getListingIntentFromPath(location.pathname)
  const queryListingIntent = getListingIntent(searchParams.get('type'))
  const listingIntent = routeListingIntent ?? queryListingIntent
  const initialInteractiveMap =
    location.pathname === '/mapa' &&
    !listingIntent &&
    !searchParams.get('q')?.trim()
  const initialMapZoom =
    location.pathname === '/mapa' && !listingIntent ? PUBLIC_MAP_INITIAL_ZOOM : PUBLIC_MAP_DEFAULT_ZOOM
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [citySearchValue, setCitySearchValue] = useState(
    () => searchParams.get('q') ?? defaultCityResult.label,
  )
  const [selectedCity, setSelectedCity] = useState<GeocodingResult | null>(defaultCityResult)
  const [baseCityResult, setBaseCityResult] = useState(defaultCityResult)
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters)
  const [baseLocationFilter, setBaseLocationFilter] = useState(defaultBaseLocation)
  const [neighborhoodQuery, setNeighborhoodQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [mapView, setMapView] = useState<MapViewState>({
    center: defaultCenter,
    zoom: initialMapZoom,
    version: 0,
  })
  const [poisVisible, setPoisVisible] = useState(true)
  const [poiCategories, setPoiCategories] = useState<PoiCategory[]>(allPoiCategories)
  const [poiZoom, setPoiZoom] = useState(initialMapZoom)
  const [poiViewport, setPoiViewport] = useState<PoiViewport | null>(null)
  const [visiblePoiCount, setVisiblePoiCount] = useState(0)
  const [filtersPanelCollapsed, setFiltersPanelCollapsed] = useState(() => initialInteractiveMap)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(getFavorites().map((favorite) => favorite.id)),
  )
  const [leadProperty, setLeadProperty] = useState<PropertyResult | null>(null)
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm)
  const [leadNotice, setLeadNotice] = useState('')
  const [leadError, setLeadError] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const initialSearchHandledRef = useRef(false)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const { error: geocodingError, loading: geocoding, search: geocodeLocation } = useGeocoding()
  const showFavoritesButton = canUsePublicFavorites(isAuthenticated, user)
  const pageMode: PageMode = location.pathname === '/novidades' ? 'news' : 'map'
  const listingLabel =
    listingIntent === 'rent'
      ? 'Aluguel'
      : listingIntent === 'sale'
        ? 'Compra'
        : searchParams.get('q')?.trim()
          ? 'Busca'
          : 'Mapa interativo'
  const pageTheme =
    pageMode === 'news'
      ? 'news'
      : listingIntent === 'rent'
        ? 'rent'
        : listingIntent === 'sale'
          ? 'sale'
          : 'map'
  const isInteractiveMap = pageTheme === 'map'
  const shouldUsePois = location.pathname === '/mapa' && !listingIntent
  const isPoiZoomReady = poiZoom >= MIN_POI_ZOOM
  const shouldSearchPois = shouldUsePois && poisVisible && isPoiZoomReady
  const nearbyPois = useNearbyPois({
    bounds: poiViewport?.bounds ?? null,
    categories: poiCategories,
    center: poiViewport?.center ?? null,
    debounceMs: 1200,
    enabled: shouldSearchPois,
    limit: getPoiSearchLimit(poiZoom, 'map'),
    minZoom: MIN_POI_ZOOM,
    paddedBounds: poiViewport?.paddedBounds ?? null,
    poisVisible,
    shouldSearchPois,
    shouldUsePois,
    zoom: poiZoom,
  })
  const showPoiZoomHint = shouldUsePois && poisVisible && !isPoiZoomReady
  const showPoiErrorHint = shouldUsePois && poisVisible && isPoiZoomReady && Boolean(nearbyPois.error)
  const poiStatusLabel = showPoiZoomHint
    ? 'aproxime para ver locais'
    : shouldSearchPois
      ? nearbyPois.loading
        ? 'carregando'
        : nearbyPois.error
          ? 'indisponivel'
          : ''
      : ''
  const pageClasses = [
    'public-map-page',
    `public-map-page--${pageTheme}`,
    isInteractiveMap && filtersPanelCollapsed ? 'public-map-page--filters-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const mapResizeDependencies = useMemo(
    () => [filtersPanelCollapsed, isInteractiveMap, listingIntent, pageMode],
    [filtersPanelCollapsed, isInteractiveMap, listingIntent, pageMode],
  )
  const handlePoiViewportChange = useCallback((viewport: PoiViewport) => {
    setPoiZoom((current) => (Math.abs(current - viewport.zoom) < 0.05 ? current : viewport.zoom))
    setPoiViewport(viewport)
  }, [])
  const handlePoiVisibleCountChange = useCallback((count: number) => {
    setVisiblePoiCount((current) => (current === count ? current : count))
  }, [])
  function handleFavoriteToggle(result: PropertyResult) {
    const nextFavorites = toggleFavorite({
      city: result.city,
      contactPhone: result.property.contactPhone,
      contactWhatsApp: result.property.contactWhatsApp,
      id: result.property.id,
      neighborhood: result.neighborhood,
      priceLabel: result.priceLabel,
      status: result.property.status,
      title: result.property.title,
    })
    setFavoriteIds(new Set(nextFavorites.map((favorite) => favorite.id)))
  }

  function openLeadForm(result: PropertyResult) {
    setLeadProperty(result)
    setLeadForm(emptyLeadForm)
    setLeadError('')
    setLeadNotice('')
  }

  function closeLeadForm() {
    if (leadSubmitting) return
    setLeadProperty(null)
    setLeadForm(emptyLeadForm)
    setLeadError('')
    setLeadNotice('')
  }

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!leadProperty) return

    const interestedName = leadForm.name.trim()
    const email = leadForm.email.trim().toLowerCase()
    const whatsapp = formatWhatsAppInput(leadForm.whatsapp)
    const whatsappDigits = cleanPhone(whatsapp)

    if (interestedName.length < 2) {
      setLeadError('Informe seu nome para o corretor saber com quem falar.')
      return
    }

    if (whatsappDigits.length < 10) {
      setLeadError('Informe um WhatsApp válido com DDD.')
      return
    }

    if (!isValidEmail(email)) {
      setLeadError('Informe um email válido para comunicação.')
      return
    }

    const input: CreateLeadInput = {
      agentId: leadProperty.property.agentId || leadProperty.property.responsibleAgentId || null,
      agentName: leadProperty.property.agentName || leadProperty.property.responsibleAgentName || null,
      email,
      interestedName,
      phone: whatsapp,
      propertyId: leadProperty.property.id,
      propertyTitle: leadProperty.property.title,
      source: 'INTEREST',
      whatsapp,
    }

    setLeadSubmitting(true)
    setLeadError('')
    setLeadNotice('')

    try {
      const createdLead = await leadsApi.create(input)
      upsertLocalLead(buildLocalLead(input, createdLead))
      setLeadNotice('Interesse enviado. A imobiliária recebeu seus dados para contato.')
      setLeadForm(emptyLeadForm)
      window.setTimeout(() => {
        setLeadProperty(null)
        setLeadNotice('')
      }, 1600)
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 404, 405, 501].includes(error.status)) {
        upsertLocalLead(buildLocalLead(input))
        setLeadNotice('Interesse registrado. A imobiliária verá este lead no painel administrativo.')
        setLeadForm(emptyLeadForm)
        window.setTimeout(() => {
          setLeadProperty(null)
          setLeadNotice('')
        }, 1600)
      } else {
        setLeadError('Não foi possível enviar seu interesse agora. Tente novamente em instantes.')
      }
    } finally {
      setLeadSubmitting(false)
    }
  }

  useEffect(() => {
    let ignore = false

    async function loadPublicProperties() {
      setLoading(true)

      try {
        const data = await propertiesApi.list(token)
        if (!ignore) {
          setProperties(mergePropertyLists(data, readLocalAdminProperties()))
        }
      } catch {
        if (!ignore) {
          setProperties(readLocalAdminProperties())
          setSelectedPropertyId('')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadPublicProperties()

    return () => {
      ignore = true
    }
  }, [reloadKey, token])

  useEffect(() => {
    if (initialSearchHandledRef.current) return

    const initialQuery = searchParams.get('q')?.trim()
    if (!initialQuery) return

    initialSearchHandledRef.current = true
    setCitySearchValue(initialQuery)
    void runCityTextSearch(initialQuery, false)
  }, [searchParams])

  const enrichedProperties = useMemo(
    () => properties.map((property) => enrichProperty(property)),
    [properties],
  )

  const catalogResults = useMemo(
    () =>
      pageMode === 'news'
        ? enrichedProperties.filter((result) => isNewsProperty(result.property))
        : enrichedProperties,
    [enrichedProperties, pageMode],
  )

  const filteredResults = useMemo(
    () =>
      catalogResults.filter((result) => {
        const shouldApplyCityFilter =
          !isInteractiveMap ||
          (Boolean(filters.city.trim()) &&
            normalizeText(filters.city) !== normalizeText(defaultCity))
        const matchesStatus = filters.statuses.includes(result.property.status)
        const matchesType =
          !filters.propertyTypes.length ||
          (result.propertyType !== null && filters.propertyTypes.includes(result.propertyType))
        const matchesBedrooms =
          filters.bedrooms === null ||
          (result.bedrooms !== null && result.bedrooms >= filters.bedrooms)
        const matchesBathrooms =
          filters.bathrooms === null ||
          (result.bathrooms !== null && result.bathrooms >= filters.bathrooms)
        const matchesParking =
          filters.parking === null ||
          (filters.parking === 0
            ? result.parking === 0
            : result.parking !== null && result.parking >= filters.parking)

        return (
          matchesStatus &&
          matchesType &&
          matchesBedrooms &&
          matchesBathrooms &&
          matchesParking &&
          (!shouldApplyCityFilter || matchesCity(result, filters)) &&
          (!filters.neighborhoods.length || matchesNeighborhood(result, filters)) &&
          matchesListingIntent(result, listingIntent)
        )
      }),
    [catalogResults, filters, isInteractiveMap, listingIntent],
  )

  const availableNeighborhoods = useMemo<NeighborhoodSummary[]>(() => {
    const neighborhoodCounts = new Map<string, NeighborhoodSummary>()
    const shouldApplyCityFilter =
      !isInteractiveMap ||
      (Boolean(filters.city.trim()) &&
        normalizeText(filters.city) !== normalizeText(defaultCity))

    for (const result of catalogResults) {
      const matchesStatus = filters.statuses.includes(result.property.status)
      const matchesType =
        !filters.propertyTypes.length ||
        (result.propertyType !== null && filters.propertyTypes.includes(result.propertyType))
      const matchesBedrooms =
        filters.bedrooms === null ||
        (result.bedrooms !== null && result.bedrooms >= filters.bedrooms)
      const matchesBathrooms =
        filters.bathrooms === null ||
        (result.bathrooms !== null && result.bathrooms >= filters.bathrooms)
      const matchesParking =
        filters.parking === null ||
        (filters.parking === 0
          ? result.parking === 0
          : result.parking !== null && result.parking >= filters.parking)

      if (
        result.neighborhood &&
        matchesStatus &&
        matchesType &&
        matchesBedrooms &&
        matchesBathrooms &&
        matchesParking &&
        (!shouldApplyCityFilter || matchesCity(result, filters)) &&
        matchesListingIntent(result, listingIntent)
      ) {
        const key = normalizeText(result.neighborhood)
        const existing = neighborhoodCounts.get(key)

        if (existing) {
          existing.count += 1
        } else {
          neighborhoodCounts.set(key, { name: result.neighborhood.trim(), count: 1 })
        }
      }
    }

    for (const selectedNeighborhood of filters.neighborhoods) {
      const key = normalizeText(selectedNeighborhood)
      if (!neighborhoodCounts.has(key)) {
        neighborhoodCounts.set(key, { name: selectedNeighborhood.trim(), count: 0 })
      }
    }

    const query = normalizeText(neighborhoodQuery)
    return Array.from(neighborhoodCounts.values())
      .filter((item) => !query || normalizeText(item.name).includes(query))
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
  }, [catalogResults, filters, isInteractiveMap, listingIntent, neighborhoodQuery])

  const activeFilterCount =
    filters.propertyTypes.length +
    (filters.bedrooms !== null ? 1 : 0) +
    (filters.bathrooms !== null ? 1 : 0) +
    (filters.parking !== null ? 1 : 0) +
    filters.neighborhoods.length +
    (filters.statuses.length !== statusOptions.length ? 1 : 0) +
    (normalizeText(filters.city) !== normalizeText(baseLocationFilter.city) ? 1 : 0)
  const pageTitle = pageMode === 'news' ? 'Novidades' : listingLabel

  useEffect(() => {
    if (shouldUsePois) {
      setPoisVisible(true)
    }

    if (isInteractiveMap) {
      setFiltersPanelCollapsed(true)
    }
  }, [isInteractiveMap, pageTheme, shouldUsePois])
  useEffect(() => {
    if (!selectedPropertyId) return
    const selectedStillVisible = filteredResults.some(
      (result) => result.property.id === selectedPropertyId,
    )

    if (!selectedStillVisible) {
      setSelectedPropertyId('')
    }
  }, [filteredResults, selectedPropertyId])

  useEffect(() => {
    if (!selectedPropertyId) return
    cardRefs.current[selectedPropertyId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [filteredResults.length, selectedPropertyId])

  function moveMap(center: [number, number], zoom: number) {
    setMapView({
      center,
      zoom,
      version: Date.now(),
    })
  }

  function handleCitySearchValueChange(value: string) {
    setCitySearchValue(value)

    if (selectedCity && value.trim() !== selectedCity.label) {
      setSelectedCity(null)
    }
  }

  function focusProperty(result: PropertyResult) {
    setSelectedPropertyId(result.property.id)
    moveMap([result.property.latitude, result.property.longitude], PUBLIC_MAP_INITIAL_ZOOM)
  }

  function togglePropertyType(propertyType: PropertyTypeFilter) {
    setFilters((current) => ({
      ...current,
      propertyTypes: current.propertyTypes.includes(propertyType)
        ? current.propertyTypes.filter((item) => item !== propertyType)
        : [...current.propertyTypes, propertyType],
    }))
  }

  function setMinimumFilter(key: 'bedrooms' | 'bathrooms' | 'parking', value: number) {
    setFilters((current) => ({
      ...current,
      [key]: current[key] === value ? null : value,
    }))
  }

  function toggleStatus(status: PropertyStatus) {
    setFilters((current) => ({
      ...current,
      statuses: current.statuses.includes(status)
        ? current.statuses.filter((item) => item !== status)
        : [...current.statuses, status],
    }))
  }

  function toggleNeighborhood(neighborhood: string) {
    setFilters((current) => ({
      ...current,
      neighborhoods: current.neighborhoods.includes(neighborhood)
        ? current.neighborhoods.filter((item) => item !== neighborhood)
        : [...current.neighborhoods, neighborhood],
    }))
  }

  function resetFilters() {
    setFilters({
      ...defaultFilters,
      city: baseLocationFilter.city,
      locationCenter: baseLocationFilter.center,
      locationRadiusKm: baseLocationFilter.radiusKm,
    })
    setNeighborhoodQuery('')
    setSelectedCity(baseCityResult)
    setCitySearchValue(baseCityResult.label)
  }

  function applyCitySelection(
    cityResult: GeocodingResult,
    {
      markAsBase = false,
      silent = false,
      updateUrl = true,
    }: {
      markAsBase?: boolean
      silent?: boolean
      updateUrl?: boolean
    } = {},
  ) {
    const city = cityResult.city || getCityFromLocationLabel(cityResult.label)
    const selectedResult: GeocodingResult = {
      ...cityResult,
      city,
      label: cityResult.label || city,
    }
    const center: [number, number] = [selectedResult.latitude, selectedResult.longitude]

    setSelectedCity(selectedResult)
    setCitySearchValue(selectedResult.label)
    setSelectedPropertyId('')
    setNeighborhoodQuery('')
    setFilters((current) => ({
      ...current,
      city,
      neighborhoods: [],
      locationCenter: center,
      locationRadiusKm: cityRadiusKm,
    }))
    moveMap(center, PUBLIC_MAP_INITIAL_ZOOM)

    if (markAsBase) {
      setBaseLocationFilter({
        city,
        center,
        radiusKm: cityRadiusKm,
      })
      setBaseCityResult(selectedResult)
    }

    if (!silent) {
    }

    if (updateUrl) {
      initialSearchHandledRef.current = true
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('q', selectedResult.label)
      setSearchParams(nextSearchParams)
    }
  }

  function clearCitySelection() {
    setSelectedCity(null)
    setCitySearchValue('')
    setSelectedPropertyId('')
    setNeighborhoodQuery('')
    setFilters((current) => ({
      ...current,
      city: '',
      neighborhoods: [],
      locationCenter: null,
      locationRadiusKm: null,
    }))
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('q')
    setSearchParams(nextSearchParams)
  }

  async function runCityTextSearch(query: string, updateUrl: boolean) {
    const result = await geocodeLocation(query)

    if (!result) return

    applyCitySelection(result, { updateUrl })
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedCity && citySearchValue.trim() === selectedCity.label) {
      applyCitySelection(selectedCity)
      return
    }

    void runCityTextSearch(citySearchValue, true)
  }

  return (
    <main className={pageClasses}>
      <PublicNavbar />

      <section className="public-map-layout">
        <aside className="property-results-panel">
          <div className="map-sidebar__header">
            <div>
              <span className="eyebrow">{pageTitle}</span>
              <h1>{filteredResults.length} imóveis encontrados</h1>
            </div>

            <div className="map-sidebar__actions">
              <button
                className="icon-button"
                disabled={loading}
                onClick={() => setReloadKey((current) => current + 1)}
                title="Atualizar imóveis"
                type="button"
              >
                <RefreshCw size={17} />
              </button>
              {isInteractiveMap ? (
                <button
                  className="icon-button"
                  onClick={() => setFiltersPanelCollapsed(true)}
                  title="Ocultar filtros"
                  type="button"
                >
                  <PanelLeftClose size={17} />
                </button>
              ) : null}
            </div>
          </div>

          <section className="map-filter-panel" aria-label="Filtros de busca">
            <div className="map-filter-panel__title">
              <div>
                <span className="eyebrow">Filtros</span>
                <strong>{activeFilterCount ? `${activeFilterCount} ativos` : 'Busca ampla'}</strong>
              </div>
              <button className="map-filter-clear" onClick={resetFilters} type="button">
                <X size={14} />
                <span>Limpar</span>
              </button>
            </div>

            {shouldUsePois ? (
              <div className="map-filter-group">
                <span className="map-filter-label">
                  <Layers size={15} />
                  Pontos de interesse
                </span>
                <button
                  aria-pressed={poisVisible}
                  className={poisVisible ? 'map-detail-toggle map-detail-toggle--active' : 'map-detail-toggle'}
                  onClick={() => setPoisVisible((current) => !current)}
                  type="button"
                >
                  <span className="map-detail-toggle__switch" aria-hidden="true">
                    <span />
                  </span>
                  <span className="map-detail-toggle__label">
                    <span>{poisVisible ? 'Locais visiveis' : 'Locais ocultos'}</span>
                    {poisVisible && isPoiZoomReady ? (
                      <span className="map-detail-toggle__count">({visiblePoiCount})</span>
                    ) : null}
                    {poiStatusLabel ? (
                      <span
                        className={
                          nearbyPois.error
                            ? 'map-detail-toggle__status map-detail-toggle__status--error'
                            : 'map-detail-toggle__status'
                        }
                      >
                        {poiStatusLabel}
                      </span>
                    ) : null}
                  </span>
                </button>
                <PoiCategoryControl
                  categories={poiCategories}
                  disabled={!poisVisible}
                  empty={nearbyPois.empty}
                  error={nearbyPois.error}
                  loading={nearbyPois.loading}
                  onCategoriesChange={setPoiCategories}
                  onRefresh={nearbyPois.refresh}
                />
              </div>
            ) : null}

            <div className="map-filter-group">
              <span className="map-filter-label">
                <Building2 size={15} />
                Tipo de imóvel
              </span>
              <div className="filter-chip-grid filter-chip-grid--two">
                {propertyTypeOptions.map((option) => (
                  <button
                    aria-pressed={filters.propertyTypes.includes(option.value)}
                    className={
                      filters.propertyTypes.includes(option.value)
                        ? 'filter-chip filter-chip--active'
                        : 'filter-chip'
                    }
                    key={option.value}
                    onClick={() => togglePropertyType(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="map-filter-group">
              <span className="map-filter-label">
                <BedDouble size={15} />
                Quartos
              </span>
              <div className="filter-chip-grid">
                {bedroomOptions.map((option) => (
                  <button
                    aria-pressed={filters.bedrooms === option}
                    className={filters.bedrooms === option ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    key={option}
                    onClick={() => setMinimumFilter('bedrooms', option)}
                    type="button"
                  >
                    {option}+
                  </button>
                ))}
              </div>
            </div>

            <div className="map-filter-group">
              <span className="map-filter-label">
                <Bath size={15} />
                Banheiros
              </span>
              <div className="filter-chip-grid">
                {bathroomOptions.map((option) => (
                  <button
                    aria-pressed={filters.bathrooms === option}
                    className={filters.bathrooms === option ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    key={option}
                    onClick={() => setMinimumFilter('bathrooms', option)}
                    type="button"
                  >
                    {option}+
                  </button>
                ))}
              </div>
            </div>

            <div className="map-filter-group">
              <span className="map-filter-label">
                <Car size={15} />
                Vagas
              </span>
              <div className="filter-chip-grid">
                {parkingOptions.map((option) => (
                  <button
                    aria-pressed={filters.parking === option}
                    className={filters.parking === option ? 'filter-chip filter-chip--active' : 'filter-chip'}
                    key={option}
                    onClick={() => setMinimumFilter('parking', option)}
                    type="button"
                  >
                    {option === 0 ? '0' : `${option}+`}
                  </button>
                ))}
              </div>
            </div>

            <CityAutocomplete
              className="city-autocomplete--sidebar"
              inputId="sidebar-city-search"
              label="Cidade"
              onChange={handleCitySearchValueChange}
              onClear={clearCitySelection}
              onSelect={(city) => applyCitySelection(city)}
              placeholder="Digite a cidade"
              selectedCity={selectedCity}
              value={citySearchValue}
            />

            <div className="map-filter-group">
              <span className="map-filter-label">
                <MapPin size={15} />
                Bairros
              </span>
              <input
                aria-label="Buscar bairro"
                className="neighborhood-search"
                onChange={(event) => setNeighborhoodQuery(event.target.value)}
                placeholder="Filtrar bairros"
                value={neighborhoodQuery}
              />
              <div className="neighborhood-picker">
                {availableNeighborhoods.map((neighborhood) => (
                  <button
                    aria-pressed={filters.neighborhoods.includes(neighborhood.name)}
                    className={
                      filters.neighborhoods.includes(neighborhood.name)
                        ? 'neighborhood-chip neighborhood-chip--active'
                        : 'neighborhood-chip'
                    }
                    key={neighborhood.name}
                    onClick={() => toggleNeighborhood(neighborhood.name)}
                    type="button"
                  >
                    <span>{neighborhood.name}</span>
                    <small>{neighborhood.count}</small>
                  </button>
                ))}
              </div>
              {!availableNeighborhoods.length ? (
                <span className="neighborhood-empty">Nenhum bairro disponível para a cidade selecionada.</span>
              ) : null}
            </div>

            <div className="map-filter-group">
              <span className="map-filter-label">
                <SlidersHorizontal size={15} />
                Status
              </span>
              <div className="map-filter-row map-filter-row--panel" aria-label="Filtros de status">
                {statusOptions.map((option) => (
                  <button
                    aria-pressed={filters.statuses.includes(option.value)}
                    className={
                      filters.statuses.includes(option.value)
                        ? 'status-filter status-filter--active'
                        : 'status-filter'
                    }
                    key={option.value}
                    onClick={() => toggleStatus(option.value)}
                    type="button"
                  >
                    <span className={`status-dot status-dot--${option.value.toLowerCase()}`} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {geocodingError ? (
            <div className="map-message-stack">
              {geocodingError ? <p className="notice notice--compact">{geocodingError}</p> : null}
            </div>
          ) : null}

          <section className="map-results-section" aria-label="Lista de imóveis compatíveis">
            <div className="map-results-section__header">
              <strong>Imóveis compatíveis</strong>
              <span>
                {filteredResults.length} de {pageMode === 'news' ? catalogResults.length : properties.length}
              </span>
            </div>

            {loading ? (
              <p className="empty-copy">Carregando imóveis...</p>
            ) : filteredResults.length ? (
              <div className="property-card-list">
                {filteredResults.map((result) => {
                  const { property } = result
                  const whatsAppHref = getWhatsAppHref(property)
                  const isSelected = property.id === selectedPropertyId
                  const isFavorite = favoriteIds.has(property.id)
                  const neighborhood = result.neighborhood || 'Bairro não informado'

                  return (
                    <article
                      className={isSelected ? 'property-card property-card--selected' : 'property-card'}
                      key={property.id}
                      ref={(node) => {
                        cardRefs.current[property.id] = node
                      }}
                    >
                      <button
                        className="property-card__body"
                        onClick={() => focusProperty(result)}
                        type="button"
                      >
                        <span className="property-card__title">{property.title}</span>
                        <div className="property-card__row">
                          <span className="property-card__price">{result.priceLabel}</span>
                          <StatusBadge value={property.status} />
                        </div>
                        <span className="property-card__meta">
                          <MapPin size={13} />
                          {neighborhood}
                        </span>
                        <span className="property-card__meta">{formatSpecs(result)}</span>
                      </button>

                      <div className="property-card__actions">
                        {showFavoritesButton ? (
                          <button
                            aria-pressed={isFavorite}
                            className={isFavorite ? 'favorite-toggle favorite-toggle--active' : 'favorite-toggle'}
                            onClick={() => handleFavoriteToggle(result)}
                            title={isFavorite ? 'Remover dos favoritos' : 'Salvar favorito'}
                            type="button"
                          >
                            <Heart size={14} />
                          </button>
                        ) : null}
                        <button className="interest-button" onClick={() => openLeadForm(result)} type="button">
                          <Send size={14} />
                          <span>Tenho interesse</span>
                        </button>
                        {whatsAppHref ? (
                          <a className="whatsapp-button" href={whatsAppHref} rel="noreferrer" target="_blank">
                            <MessageCircle size={14} />
                            <span>Contato</span>
                          </a>
                        ) : (
                          <button className="whatsapp-button whatsapp-button--disabled" disabled type="button">
                            <MessageCircle size={14} />
                            <span>Contato indisponível</span>
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </section>
        </aside>

        <PublicMapFrame className="public-map-panel" ariaLabel="Mapa de imóveis">
          {isInteractiveMap && filtersPanelCollapsed ? (
            <button
              className="map-filter-restore"
              onClick={() => setFiltersPanelCollapsed(false)}
              type="button"
            >
              <PanelLeftOpen size={16} />
              <span>Filtros</span>
            </button>
          ) : null}

          <div className="map-search-toolbar" aria-label="Busca de localização">
            <div className="map-search-toolbar__inner">
              <form className="map-location-search" onSubmit={handleLocationSubmit}>
                <CityAutocomplete
                  className="city-autocomplete--toolbar"
                  inputId="toolbar-city-search"
                  onChange={handleCitySearchValueChange}
                  onClear={clearCitySelection}
                  onSelect={(city) => applyCitySelection(city)}
                  placeholder="Buscar cidade"
                  selectedCity={selectedCity}
                  value={citySearchValue}
                />
                <button className="primary-button map-search-button" disabled={geocoding} type="submit">
                  {geocoding ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                  <span>{geocoding ? 'Buscando' : 'Buscar'}</span>
                </button>
              </form>

            </div>
          </div>

          <MapContainer center={defaultCenter} className="public-smart-map" scrollWheelZoom zoom={initialMapZoom}>
            <TileLayer attribution={publicMapAttribution} url={publicDetailedMapTileLayerUrl} />
            <MapResizeHandler dependencies={mapResizeDependencies} />
            <MapViewport view={mapView} />
            <PoiViewportTracker enabled={shouldUsePois} onViewportChange={handlePoiViewportChange} />
            <PoiLayer
              densityMode="map"
              onVisibleCountChange={handlePoiVisibleCountChange}
              pois={shouldSearchPois ? nearbyPois.pois : []}
            />

            {filteredResults.map((result) => {
              const { property } = result
              const isSelected = property.id === selectedPropertyId

              return (
                <Marker
                  eventHandlers={{
                    click: () => setSelectedPropertyId(property.id),
                  }}
                  icon={getMarkerIcon(result, isSelected)}
                  key={property.id}
                  position={[property.latitude, property.longitude]}
                >
                  <Popup className="clean-map-popup">
                    <div className="map-popup">
                      <strong>{property.title}</strong>
                      <span>{result.priceLabel}</span>
                      <StatusBadge value={property.status} />
                      <span>{getLocationLabel(result)}</span>
                      <span>{getContactLabel(property)}</span>
                      <button className="map-popup__interest" onClick={() => openLeadForm(result)} type="button">
                        Tenho interesse
                      </button>
                      {getWhatsAppHref(property) ? (
                        <a
                          className="map-popup__link"
                          href={getWhatsAppHref(property)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          WhatsApp
                          <ExternalLink size={13} />
                        </a>
                      ) : null}
                    </div>
                  </Popup>
                </Marker>
              )
            })}

          </MapContainer>

          {showPoiZoomHint ? (
            <div className="poi-zoom-hint">Aproxime o mapa para ver locais proximos.</div>
          ) : showPoiErrorHint ? (
            <div className="poi-zoom-hint poi-zoom-hint--error">Locais indisponiveis no momento.</div>
          ) : null}

          <div className="map-corner-summary" aria-hidden="true">
            <Home size={14} />
            <span>{filteredResults.length} imóveis</span>
          </div>
        </PublicMapFrame>
      </section>

      {leadProperty ? (
        <div className="lead-modal-backdrop" role="presentation">
          <section aria-modal="true" className="lead-modal" role="dialog" aria-labelledby="lead-modal-title">
            <button className="lead-modal__close" onClick={closeLeadForm} type="button" aria-label="Fechar formulário">
              <X size={17} />
            </button>

            <div className="lead-modal__header">
              <span className="eyebrow">Tenho interesse</span>
              <h2 id="lead-modal-title">{leadProperty.property.title}</h2>
              <p className="lead-modal__location">{getLocationLabel(leadProperty)}</p>
              <strong className="lead-modal__price">{leadProperty.priceLabel}</strong>
            </div>

            <form className="lead-form" onSubmit={handleLeadSubmit}>
              <label>
                Nome
                <div className="lead-form__field">
                  <UserRound size={16} />
                  <input
                    autoComplete="name"
                    onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Seu nome"
                    required
                    value={leadForm.name}
                  />
                </div>
              </label>

              <label>
                WhatsApp
                <div className="lead-form__field">
                  <Phone size={16} />
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    onChange={(event) => setLeadForm((current) => ({ ...current, whatsapp: formatWhatsAppInput(event.target.value) }))}
                    placeholder="(21) 99999-9999"
                    required
                    value={leadForm.whatsapp}
                  />
                </div>
              </label>

              <label>
                Email
                <div className="lead-form__field">
                  <Mail size={16} />
                  <input
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="voce@email.com"
                    required
                    type="email"
                    value={leadForm.email}
                  />
                </div>
              </label>

              {leadError ? <p className="form-error">{leadError}</p> : null}
              {leadNotice ? <p className="notice notice--compact">{leadNotice}</p> : null}

              <button className="primary-button lead-form__submit" disabled={leadSubmitting} type="submit">
                {leadSubmitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                <span>{leadSubmitting ? 'Enviando...' : 'Enviar interesse'}</span>
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
