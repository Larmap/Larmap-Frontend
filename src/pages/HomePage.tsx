import { LocateFixed, MapPin } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { Link, useNavigate } from 'react-router-dom'
import { propertiesApi } from '../api/client'
import { MapResizeHandler } from '../components/map/MapResizeHandler'
import { PoiLayer } from '../components/map/PoiLayer'
import { PoiViewportTracker, type PoiViewport } from '../components/map/PoiViewportTracker'
import { PublicFooter } from '../components/PublicFooter'
import { PublicMapFrame } from '../components/PublicMapFrame'
import { PublicNavbar } from '../components/PublicNavbar'
import { MinimalLocationSearch } from '../components/MinimalLocationSearch'
import { PropertyCarousel } from '../components/PropertyCarousel'
import { allPoiCategories, getPoiSearchLimit, MIN_POI_ZOOM } from '../constants/pois'
import { HOME_MAP_INITIAL_ZOOM, publicDetailedMapTileLayerUrl, publicMapAttribution } from '../constants/publicMap'
import { useNearbyPois } from '../hooks/useNearbyPois'
import { getRecentlyViewed, addRecentlyViewed } from '../hooks/useRecentlyViewed'
import { LarMapExplainSection } from '../modules/blog/components/LarMapExplainSection'
import { blogService } from '../modules/blog/services/blog.service'
import type { BlogPost } from '../modules/blog/types'
import type { Property } from '../types/api'
import { readStorageValue } from '../utils/storage'

const homeMapCenter: [number, number] = [-22.9068, -43.1729]
const HOME_POI_CATEGORIES = allPoiCategories
const LOCAL_ADMIN_PROPERTIES_KEY = 'larmap.admin.localProperties'
const LEGACY_LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'
const HOME_LOCATION_STORAGE_KEY = 'larmap.home.lastLocation'
const HOME_GEOLOCATION_TIMEOUT_MS = 3000
const HOME_NEARBY_CAROUSEL_LIMIT = 12

interface MapCoordinates {
  latitude: number
  longitude: number
}

const previewDots = [
  { center: [-22.9519, -43.2105] as [number, number], color: '#57b44b' },
  { center: [-22.9847, -43.1986] as [number, number], color: '#b58b19' },
  { center: [-22.9068, -43.1729] as [number, number], color: '#57b44b' },
  { center: [-22.8960, -43.1800] as [number, number], color: '#57b44b' },
  { center: [-22.9300, -43.2400] as [number, number], color: '#cc4b4b' },
]

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

function getPropertyCity(property: Property) {
  return property.city || property.cidade || ''
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toMapCenter(location: MapCoordinates): [number, number] {
  return [location.latitude, location.longitude]
}

function toMapCoordinates(center: [number, number]): MapCoordinates {
  return { latitude: center[0], longitude: center[1] }
}

function areCoordinatesClose(a: MapCoordinates, b: MapCoordinates) {
  return Math.abs(a.latitude - b.latitude) < 0.00001 && Math.abs(a.longitude - b.longitude) < 0.00001
}

function readSavedHomeLocation() {
  try {
    const raw = window.localStorage.getItem(HOME_LOCATION_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<MapCoordinates>
    if (!isValidCoordinate(parsed.latitude) || !isValidCoordinate(parsed.longitude)) return null

    return { latitude: parsed.latitude, longitude: parsed.longitude }
  } catch {
    return null
  }
}

function saveHomeLocation(location: MapCoordinates) {
  try {
    window.localStorage.setItem(HOME_LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Local storage can be unavailable in private contexts; the map should keep working.
  }
}

function requestCurrentLocation() {
  return new Promise<MapCoordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      reject,
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: HOME_GEOLOCATION_TIMEOUT_MS,
      },
    )
  })
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function getDistanceKm(from: MapCoordinates, property: Property) {
  if (!isValidCoordinate(property.latitude) || !isValidCoordinate(property.longitude)) return null

  const earthRadiusKm = 6371
  const latitudeDistance = toRadians(property.latitude - from.latitude)
  const longitudeDistance = toRadians(property.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(property.latitude)
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDistance / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000)).toLocaleString('pt-BR')} m`
  }

  return `${distanceKm.toLocaleString('pt-BR', {
    maximumFractionDigits: distanceKm < 10 ? 1 : 0,
  })} km`
}

interface HomeMapLocationControllerProps {
  knownLocation: MapCoordinates | null
  locateRequestId: number
  onLocationFound: (location: MapCoordinates) => void
  onRequestingChange: (requesting: boolean) => void
}

function HomeMapLocationController({
  knownLocation,
  locateRequestId,
  onLocationFound,
  onRequestingChange,
}: HomeMapLocationControllerProps) {
  const map = useMap()
  const initialRequestRef = useRef(false)
  const latestRequestRef = useRef(0)
  const mountedRef = useRef(true)

  const requestAndFlyToLocation = useCallback(() => {
    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId
    onRequestingChange(true)

    requestCurrentLocation()
      .then((location) => {
        if (!mountedRef.current || latestRequestRef.current !== requestId) return

        saveHomeLocation(location)
        onLocationFound(location)
        map.flyTo(toMapCenter(location), map.getZoom(), { duration: 0.65 })
      })
      .catch(() => {
        // Permission denied, timeout and unsupported browsers should never block the Home.
      })
      .finally(() => {
        if (mountedRef.current && latestRequestRef.current === requestId) {
          onRequestingChange(false)
        }
      })
  }, [map, onLocationFound, onRequestingChange])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (initialRequestRef.current) return
    initialRequestRef.current = true

    requestAndFlyToLocation()
  }, [requestAndFlyToLocation])

  useEffect(() => {
    if (locateRequestId <= 0) return

    if (knownLocation) {
      map.flyTo(toMapCenter(knownLocation), map.getZoom(), { duration: 0.45 })
    }

    requestAndFlyToLocation()
  }, [knownLocation, locateRequestId, map, requestAndFlyToLocation])

  return null
}

export function HomePage() {
  const [locationQuery, setLocationQuery] = useState('')
  const [explainPosts, setExplainPosts] = useState<BlogPost[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [homePoiZoom, setHomePoiZoom] = useState(HOME_MAP_INITIAL_ZOOM)
  const [homePoiViewport, setHomePoiViewport] = useState<PoiViewport | null>(null)
  const [initialHomeLocation] = useState<MapCoordinates | null>(() => readSavedHomeLocation())
  const [userLocation, setUserLocation] = useState<MapCoordinates | null>(initialHomeLocation)
  const [nearbyReferencePoint, setNearbyReferencePoint] = useState<MapCoordinates>(
    () => initialHomeLocation ?? toMapCoordinates(homeMapCenter),
  )
  const [locateRequestId, setLocateRequestId] = useState(0)
  const [isHomeLocating, setIsHomeLocating] = useState(false)
  const navigate = useNavigate()
  const isHomePoiZoomReady = homePoiZoom >= MIN_POI_ZOOM
  const initialHomeMapCenter = useMemo(
    () => (initialHomeLocation ? toMapCenter(initialHomeLocation) : homeMapCenter),
    [initialHomeLocation],
  )
  const nearbyPois = useNearbyPois({
    bounds: homePoiViewport?.bounds ?? null,
    categories: HOME_POI_CATEGORIES,
    center: homePoiViewport?.center ?? null,
    debounceMs: 1200,
    enabled: isHomePoiZoomReady,
    limit: getPoiSearchLimit(homePoiZoom, 'home'),
    minZoom: MIN_POI_ZOOM,
    paddedBounds: homePoiViewport?.paddedBounds ?? null,
    poisVisible: true,
    shouldSearchPois: isHomePoiZoomReady,
    shouldUsePois: true,
    zoom: homePoiZoom,
  })
  const showHomePoiHint = !isHomePoiZoomReady
  const showHomePoiError = isHomePoiZoomReady && Boolean(nearbyPois.error)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const data = await propertiesApi.list()
        if (!ignore) setProperties(mergePropertyLists(data, readLocalAdminProperties()))
      } catch {
        if (!ignore) setProperties(readLocalAdminProperties())
      } finally {
        if (!ignore) setPropertiesLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadBlogPosts() {
      try {
        const posts = await blogService.getPosts({ limit: 3, status: 'published' })
        if (!ignore) setExplainPosts(posts)
      } catch {
        if (!ignore) setExplainPosts([])
      }
    }

    loadBlogPosts()
    return () => { ignore = true }
  }, [])

  const recentlyViewed = useMemo(() => {
    const stored = getRecentlyViewed()
    if (!stored.length) return [...properties]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)

    const propertyById = new Map(properties.map((property) => [property.id, property]))
    return stored
      .map((item) => propertyById.get(item.id))
      .filter((property): property is Property => Boolean(property))
  }, [properties])

  // "Destaques" = most recent properties (simulates manual picks until API supports it)
  const highlights = useMemo(() => {
    return [...properties]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
  }, [properties])

  const nearbyPropertiesWithDistance = useMemo(() => {
    return properties
      .map((property) => {
        const distanceKm = getDistanceKm(nearbyReferencePoint, property)
        return distanceKm === null ? null : { distanceKm, property }
      })
      .filter((item): item is { distanceKm: number; property: Property } => item !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, HOME_NEARBY_CAROUSEL_LIMIT)
  }, [nearbyReferencePoint, properties])

  const nearbyProperties = useMemo(
    () => nearbyPropertiesWithDistance.map((item) => item.property),
    [nearbyPropertiesWithDistance],
  )

  const nearbyDistanceLabels = useMemo(() => {
    return new Map(nearbyPropertiesWithDistance.map((item) => [item.property.id, formatDistance(item.distanceKm)]))
  }, [nearbyPropertiesWithDistance])

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = locationQuery.trim()
    navigate(q ? `/mapa?q=${encodeURIComponent(q)}` : '/mapa')
  }

  function handlePropertyClick(property: Property) {
    addRecentlyViewed({
      id: property.id,
      title: property.title,
      status: property.status,
      contactPhone: property.contactPhone,
      contactWhatsApp: property.contactWhatsApp,
    })
    const city = getPropertyCity(property)
    navigate(city ? `/mapa?q=${encodeURIComponent(city)}` : '/mapa')
  }

  const handleHomeViewportChange = useCallback((viewport: PoiViewport) => {
    setHomePoiZoom((current) => (Math.abs(current - viewport.zoom) < 0.05 ? current : viewport.zoom))
    setHomePoiViewport(viewport)
    setNearbyReferencePoint((current) => {
      const next = { latitude: viewport.center.latitude, longitude: viewport.center.longitude }
      return areCoordinatesClose(current, next) ? current : next
    })
  }, [])

  const handleHomeLocationFound = useCallback((location: MapCoordinates) => {
    setUserLocation(location)
    setNearbyReferencePoint((current) => (areCoordinatesClose(current, location) ? current : location))
  }, [])

  return (
    <main className="home-page">
      <PublicNavbar />

      {/* ─── HERO ─── */}
      <section className="home-hero">
        <div className="home-hero__content">
          <div className="home-hero__text">
            <h1 className="home-hero__headline">
              Encontre o <span className="home-hero__headline-highlight">imóvel</span> ideal para você
            </h1>
            <p>
              Busque uma região, veja os imóveis disponíveis e fale direto com a imobiliária.
            </p>

            <MinimalLocationSearch
              inputId="home-location-search"
              onChange={setLocationQuery}
              onSubmit={handleLocationSubmit}
              value={locationQuery}
            />

            <div className="home-hero__tags">
              <Link to="/aluguel" className="home-tag">
                <MapPin size={14} /> Aluguel
              </Link>
              <Link to="/compra" className="home-tag">
                <MapPin size={14} /> Compra
              </Link>
              <Link to="/mapa" className="home-tag">
                <MapPin size={14} /> Lançamentos
              </Link>
            </div>
          </div>

          <PublicMapFrame className="home-hero__map" element="div">
            <button
              aria-busy={isHomeLocating}
              aria-label="Minha localização"
              className={isHomeLocating ? 'home-map-locate home-map-locate--loading' : 'home-map-locate'}
              onClick={() => setLocateRequestId((current) => current + 1)}
              title="Minha localização"
              type="button"
            >
              <LocateFixed size={17} />
            </button>
            <MapContainer
              center={initialHomeMapCenter}
              className="home-hero__map-container"
              dragging
              doubleClickZoom
              scrollWheelZoom={false}
              zoom={HOME_MAP_INITIAL_ZOOM}
              zoomControl
            >
              <TileLayer attribution={publicMapAttribution} url={publicDetailedMapTileLayerUrl} />
              <MapResizeHandler />
              <HomeMapLocationController
                knownLocation={userLocation}
                locateRequestId={locateRequestId}
                onLocationFound={handleHomeLocationFound}
                onRequestingChange={setIsHomeLocating}
              />
              <PoiViewportTracker enabled onViewportChange={handleHomeViewportChange} />
              <PoiLayer densityMode="home" pois={isHomePoiZoomReady ? nearbyPois.pois : []} />
              {previewDots.map((dot) => (
                <CircleMarker
                  center={dot.center}
                  fillColor={dot.color}
                  fillOpacity={0.88}
                  key={`${dot.center[0]}-${dot.center[1]}`}
                  pathOptions={{ color: '#ffffff', opacity: 1, weight: 2 }}
                  radius={6}
                />
              ))}
            </MapContainer>
            {showHomePoiHint ? (
              <div className="poi-zoom-hint">Aproxime o mapa para ver locais proximos.</div>
            ) : null}
            {showHomePoiError ? (
              <div className="poi-zoom-hint poi-zoom-hint--error">Locais indisponiveis no momento.</div>
            ) : null}
          </PublicMapFrame>
        </div>
      </section>

      {/* ─── CAROUSELS ─── */}
      <section className="home-listings">
        <div className="home-listings__inner">
          <PropertyCarousel
            title="Últimos vistos"
            properties={recentlyViewed}
            emptyMessage="Nenhum imóvel encontrado"
            isLoading={propertiesLoading}
            onPropertyClick={handlePropertyClick}
          />

          <PropertyCarousel
            title="Imóveis em destaque"
            properties={highlights}
            emptyMessage="Nenhum imóvel encontrado"
            isLoading={propertiesLoading}
            onPropertyClick={handlePropertyClick}
          />

          <PropertyCarousel
            title="Imóveis perto de você"
            properties={nearbyProperties}
            distanceLabels={nearbyDistanceLabels}
            emptyMessage="Nenhum imóvel encontrado"
            isLoading={propertiesLoading}
            onPropertyClick={handlePropertyClick}
          />
        </div>
      </section>

      <LarMapExplainSection posts={explainPosts} />

      <PublicFooter />
    </main>
  )
}
