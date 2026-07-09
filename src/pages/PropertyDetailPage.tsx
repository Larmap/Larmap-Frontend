import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  Church,
  Dumbbell,
  Fuel,
  GraduationCap,
  Hospital,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Pill,
  Ruler,
  Send,
  Share2,
  ShoppingBasket,
  Trees,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react'
import { divIcon } from 'leaflet'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link, useParams } from 'react-router-dom'
import { ApiError, leadsApi, propertiesApi } from '../api/client'
import { MapResizeHandler } from '../components/map/MapResizeHandler'
import { PoiLayer } from '../components/map/PoiLayer'
import { PublicFooter } from '../components/PublicFooter'
import { PublicNavbar } from '../components/PublicNavbar'
import { SEO } from '../components/SEO'
import { StatusBadge } from '../components/StatusBadge'
import { allPoiCategories, poiCategoryLabels, poiCategoryPriority } from '../constants/pois'
import { publicDetailedMapTileLayerUrl, publicMapAttribution } from '../constants/publicMap'
import { useNearbyPois } from '../hooks/useNearbyPois'
import type { CreateLeadInput, Property, PropertyStatus } from '../types/api'
import type { Poi, PoiCategory, PoiSearchBounds } from '../types/pois'
import { buildLocalLead, upsertLocalLead } from '../utils/localLeads'
import {
  findPropertyBySlug,
  getCompactLocationLabel,
  getContactName,
  getFirstNumber,
  getPriceLabel,
  getPropertyAreaLabel,
  getPropertyCode,
  getPropertyImages,
  getPropertyLocationLabel,
  getPropertySlug,
  getPropertyTypeLabel,
  getTransactionLabel,
  mergePropertyLists,
  readLocalAdminProperties,
} from '../utils/properties'

const DETAIL_POI_RADIUS_KM = 4
const DETAIL_POI_SUMMARY_RADIUS_METERS = 1000
const DETAIL_MAP_ZOOM = 15

interface LeadFormState {
  email: string
  name: string
  whatsapp: string
}

interface NearbyCategoryConfig {
  Icon: LucideIcon
  plural: string
  singular: string
  title: string
}

const emptyLeadForm: LeadFormState = {
  email: '',
  name: '',
  whatsapp: '',
}

const poiCategoryConfig: Record<PoiCategory, NearbyCategoryConfig> = {
  education: {
    Icon: GraduationCap,
    plural: 'escolas',
    singular: 'escola',
    title: 'Ensino',
  },
  fitness: {
    Icon: Dumbbell,
    plural: 'academias',
    singular: 'academia',
    title: 'Academias',
  },
  food: {
    Icon: Utensils,
    plural: 'cafeterias e restaurantes',
    singular: 'cafeteria ou restaurante',
    title: 'Cafeterias e restaurantes',
  },
  fuel: {
    Icon: Fuel,
    plural: 'postos de combustível',
    singular: 'posto de combustível',
    title: 'Postos',
  },
  health: {
    Icon: Hospital,
    plural: 'hospitais e clínicas',
    singular: 'hospital ou clínica',
    title: 'Saúde',
  },
  leisure: {
    Icon: Trees,
    plural: 'áreas de lazer',
    singular: 'área de lazer',
    title: 'Lazer',
  },
  market: {
    Icon: ShoppingBasket,
    plural: 'supermercados',
    singular: 'supermercado',
    title: 'Supermercados',
  },
  pharmacy: {
    Icon: Pill,
    plural: 'farmácias',
    singular: 'farmácia',
    title: 'Farmácias',
  },
  religion: {
    Icon: Church,
    plural: 'templos e igrejas',
    singular: 'templo ou igreja',
    title: 'Templos',
  },
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

function pluralize(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function createBoundsFromRadius(property: Property, radiusKm: number): PoiSearchBounds {
  const latitudeDelta = radiusKm / 111.32
  const longitudeBase = 111.32 * Math.cos(toRadians(property.latitude))
  const longitudeDelta = radiusKm / Math.max(0.0001, Math.abs(longitudeBase))

  return {
    east: property.longitude + longitudeDelta,
    north: property.latitude + latitudeDelta,
    south: property.latitude - latitudeDelta,
    west: property.longitude - longitudeDelta,
  }
}

function formatDistance(distanceMeters?: number) {
  if (!Number.isFinite(distanceMeters)) return ''
  const distance = distanceMeters as number

  if (distance < 1000) return `${Math.round(distance)} m`

  return `${(distance / 1000).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })} km`
}

function normalizePoiName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function comparePois(first: Poi, second: Poi) {
  const distanceA = first.distanceMeters ?? Number.POSITIVE_INFINITY
  const distanceB = second.distanceMeters ?? Number.POSITIVE_INFINITY
  if (distanceA !== distanceB) return distanceA - distanceB

  const nameA = normalizePoiName(first.name)
  const nameB = normalizePoiName(second.name)
  const hasNameA = nameA.length > 0
  const hasNameB = nameB.length > 0
  if (hasNameA !== hasNameB) return hasNameA ? -1 : 1

  if (first.id === second.id) return 0
  return first.id < second.id ? -1 : 1
}

function getPropertyMarkerIcon(status: PropertyStatus) {
  return divIcon({
    className: 'property-map-marker-shell',
    html: `
      <div class="property-map-marker property-map-marker--${status.toLowerCase()} property-map-marker--selected">
        <span class="property-map-marker__core"></span>
      </div>
    `,
    iconAnchor: [19, 44],
    iconSize: [38, 44],
    popupAnchor: [0, -40],
  })
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function getInterestCount(property: Property) {
  return getFirstNumber(property, ['interestCount', 'interestedCount', 'leadsCount', 'leadCount'])
}

function getSeoDescription(property: Property) {
  const parts = [
    getPropertyTypeLabel(property),
    getTransactionLabel(property),
    getCompactLocationLabel(property),
    getPriceLabel(property),
  ].filter(Boolean)

  return `${parts.join(' em ')}. Veja fotos, localização e estabelecimentos próximos no LarMap.`
}

function getSpecItems(property: Property) {
  const area = getPropertyAreaLabel(property)
  const bedrooms = getFirstNumber(property, ['bedrooms', 'rooms', 'quartos'])
  const bathrooms = getFirstNumber(property, ['bathrooms', 'banheiros'])
  const parking = getFirstNumber(property, ['parkingSpots', 'garageSpots', 'vagas'])

  return [
    area ? { Icon: Ruler, label: area } : null,
    bedrooms !== null ? { Icon: BedDouble, label: pluralize(bedrooms, 'quarto', 'quartos') } : null,
    bathrooms !== null ? { Icon: Bath, label: pluralize(bathrooms, 'banheiro', 'banheiros') } : null,
    parking !== null ? { Icon: Car, label: pluralize(parking, 'vaga', 'vagas') } : null,
  ].filter((item): item is { Icon: LucideIcon; label: string } => Boolean(item))
}

function PropertyMapFocus({ property, selectedPoi }: { property: Property; selectedPoi: Poi | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedPoi) {
      map.flyToBounds(
        [
          [property.latitude, property.longitude],
          [selectedPoi.latitude, selectedPoi.longitude],
        ],
        {
          duration: 0.55,
          maxZoom: DETAIL_MAP_ZOOM,
          padding: [44, 44],
        },
      )
      return
    }

    map.flyTo([property.latitude, property.longitude], DETAIL_MAP_ZOOM, { duration: 0.45 })
  }, [
    map,
    property.latitude,
    property.longitude,
    selectedPoi?.id,
    selectedPoi?.latitude,
    selectedPoi?.longitude,
  ])

  return null
}

function NearbyPlacesSection({
  error,
  loading,
  onPoiSelect,
  pois,
  selectedPoi,
}: {
  error: string
  loading: boolean
  onPoiSelect: (poi: Poi) => void
  pois: Poi[]
  selectedPoi: Poi | null
}) {
  const summaryItems = useMemo(
    () =>
      allPoiCategories
        .map((category) => {
          const count = pois.filter(
            (poi) =>
              poi.category === category &&
              (poi.distanceMeters ?? Number.POSITIVE_INFINITY) <= DETAIL_POI_SUMMARY_RADIUS_METERS,
          ).length

          return {
            category,
            count,
            config: poiCategoryConfig[category],
          }
        })
        .filter((item) => item.count > 0)
        .slice(0, 6),
    [pois],
  )
  const groupedPois = useMemo(
    () =>
      allPoiCategories
        .map((category) => ({
          category,
          config: poiCategoryConfig[category],
          pois: pois.filter((poi) => poi.category === category).sort(comparePois).slice(0, 2),
        }))
        .filter((group) => group.pois.length > 0),
    [pois],
  )
  const hasPlaces = groupedPois.length > 0

  return (
    <section className="property-section property-nearby-section panel" aria-labelledby="nearby-title">
      <div className="property-section__heading">
        <span className="eyebrow">Região</span>
        <h2 id="nearby-title">O que há por perto</h2>
      </div>

      <div className="nearby-summary">
        <strong>Resumo da região</strong>
        {loading && !summaryItems.length ? (
          <span className="nearby-muted">Buscando locais próximos...</span>
        ) : summaryItems.length ? (
          <div className="nearby-summary__grid">
            {summaryItems.map(({ category, config, count }) => {
              const Icon = config.Icon
              return (
                <span className="nearby-summary__item" key={category}>
                  <Icon size={15} />
                  {count} {count === 1 ? config.singular : config.plural} até 1 km
                </span>
              )
            })}
          </div>
        ) : (
          <span className="nearby-muted">Ainda não há dados suficientes para resumir a região.</span>
        )}
      </div>

      {error ? <p className="notice notice--compact">{error}</p> : null}

      {hasPlaces ? (
        <div className="nearby-list">
          {groupedPois.map(({ category, config, pois }) => {
            const Icon = config.Icon

            return (
              <div className="nearby-group" key={category}>
                <div className="nearby-group__title">
                  <Icon size={16} />
                  <span>{config.title}</span>
                </div>
                <div className="nearby-group__items">
                  {pois.map((poi) => {
                    const isSelected = selectedPoi?.id === poi.id
                    const name = poi.name.trim() || poiCategoryLabels[poi.category]

                    return (
                      <button
                        className={isSelected ? 'nearby-place nearby-place--selected' : 'nearby-place'}
                        key={poi.id}
                        onClick={() => onPoiSelect(poi)}
                        type="button"
                      >
                        <span className={`nearby-place__icon nearby-place__icon--${poi.category}`}>
                          <Icon size={15} />
                        </span>
                        <span className="nearby-place__text">
                          <strong>{name}</strong>
                          <small>{formatDistance(poi.distanceMeters)}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : loading ? (
        <p className="empty-copy">Buscando estabelecimentos próximos...</p>
      ) : (
        <p className="empty-copy">
          Não foram encontrados locais próximos dentro de {DETAIL_POI_RADIUS_KM} km deste imóvel.
        </p>
      )}
    </section>
  )
}

export function PropertyDetailPage() {
  const { slug } = useParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null)
  const [leadFormOpen, setLeadFormOpen] = useState(false)
  const [leadForm, setLeadForm] = useState<LeadFormState>(emptyLeadForm)
  const [leadNotice, setLeadNotice] = useState('')
  const [leadError, setLeadError] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [shareNotice, setShareNotice] = useState('')
  const property = useMemo(() => findPropertyBySlug(properties, slug), [properties, slug])

  useEffect(() => {
    let ignore = false

    async function loadPropertyList() {
      setLoading(true)
      setLoadError('')

      try {
        const data = await propertiesApi.list()
        if (!ignore) {
          setProperties(mergePropertyLists(data, readLocalAdminProperties()))
        }
      } catch {
        if (!ignore) {
          const localProperties = readLocalAdminProperties()
          setProperties(localProperties)
          if (!localProperties.length) {
            setLoadError('Não foi possível carregar os imóveis agora.')
          }
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void loadPropertyList()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    setSelectedImageIndex(0)
    setSelectedPoi(null)
  }, [property?.id])

  const poiSearchBounds = useMemo(
    () => (property ? createBoundsFromRadius(property, DETAIL_POI_RADIUS_KM) : null),
    [property?.latitude, property?.longitude],
  )
  const poiSearchCenter = useMemo(
    () =>
      property
        ? {
            latitude: property.latitude,
            longitude: property.longitude,
          }
        : null,
    [property?.latitude, property?.longitude],
  )
  const nearbyPois = useNearbyPois({
    bounds: poiSearchBounds,
    categories: allPoiCategories,
    center: poiSearchCenter,
    debounceMs: 250,
    enabled: Boolean(property && poiSearchBounds && poiSearchCenter),
    limit: 320,
    minZoom: 0,
    paddedBounds: poiSearchBounds,
    poisVisible: true,
    shouldSearchPois: Boolean(property),
    shouldUsePois: Boolean(property),
    zoom: DETAIL_MAP_ZOOM,
  })
  const relevantPois = useMemo(
    () =>
      nearbyPois.pois
        .filter((poi) => (poi.distanceMeters ?? Number.POSITIVE_INFINITY) <= DETAIL_POI_RADIUS_KM * 1000)
        .sort((first, second) => {
          const priorityA = poiCategoryPriority[first.category] ?? 99
          const priorityB = poiCategoryPriority[second.category] ?? 99
          if (priorityA !== priorityB) return priorityA - priorityB
          return comparePois(first, second)
        }),
    [nearbyPois.pois],
  )

  if (loading) {
    return (
      <main className="public-site property-detail-page">
        <SEO title="Carregando imóvel | LarMap" canonical={`/imovel/${slug ?? ''}`} />
        <PublicNavbar />
        <section className="property-detail-shell property-detail-shell--state">
          <Loader2 className="spin" size={24} />
          <p>Carregando imóvel...</p>
        </section>
        <PublicFooter />
      </main>
    )
  }

  if (!property) {
    return (
      <main className="public-site property-detail-page">
        <SEO title="Imóvel não encontrado | LarMap" canonical={`/imovel/${slug ?? ''}`} />
        <PublicNavbar />
        <section className="property-detail-shell property-detail-shell--state">
          <Building2 size={28} />
          <h1>Imóvel não encontrado</h1>
          <p>{loadError || 'Este anúncio não está disponível ou foi removido.'}</p>
          <Link className="secondary-button" to="/mapa">
            Ver imóveis no mapa
          </Link>
        </section>
        <PublicFooter />
      </main>
    )
  }

  const loadedProperty = property
  const images = getPropertyImages(loadedProperty)
  const activeImage = images[selectedImageIndex] ?? '/assets/Larmap-logo-casas.png'
  const propertySlug = getPropertySlug(loadedProperty)
  const propertyUrl = `/imovel/${propertySlug}`
  const priceLabel = getPriceLabel(loadedProperty)
  const locationLabel = getPropertyLocationLabel(loadedProperty)
  const compactLocation = getCompactLocationLabel(loadedProperty)
  const specs = getSpecItems(loadedProperty)
  const description = loadedProperty.description?.trim()
  const contactName = getContactName(loadedProperty)
  const contactPhone = loadedProperty.contactPhone || loadedProperty.contactWhatsApp || ''
  const whatsappHref = getWhatsAppHref(loadedProperty)
  const publishedAt = formatDate(loadedProperty.createdAt)
  const updatedAt = formatDate(loadedProperty.updatedAt)
  const interestCount = getInterestCount(loadedProperty)
  const seoImage = images[0] ?? '/assets/Larmap-logo-casas.png'

  function openLeadForm() {
    setLeadFormOpen(true)
    setLeadForm(emptyLeadForm)
    setLeadError('')
    setLeadNotice('')
  }

  function closeLeadForm() {
    if (leadSubmitting) return
    setLeadFormOpen(false)
    setLeadForm(emptyLeadForm)
    setLeadError('')
    setLeadNotice('')
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}${propertyUrl}`
    const shareData = {
      text: `${loadedProperty.title} no LarMap`,
      title: loadedProperty.title,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setShareNotice('Link copiado.')
      window.setTimeout(() => setShareNotice(''), 1800)
    } catch {
      setShareNotice('')
    }
  }

  async function handleLeadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

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
      agentId: loadedProperty.agentId || loadedProperty.responsibleAgentId || null,
      agentName: loadedProperty.agentName || loadedProperty.responsibleAgentName || null,
      email,
      interestedName,
      phone: whatsapp,
      propertyId: loadedProperty.id,
      propertyTitle: loadedProperty.title,
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
        setLeadFormOpen(false)
        setLeadNotice('')
      }, 1600)
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 404, 405, 501].includes(error.status)) {
        upsertLocalLead(buildLocalLead(input))
        setLeadNotice('Interesse registrado. A imobiliária verá este lead no painel administrativo.')
        setLeadForm(emptyLeadForm)
        window.setTimeout(() => {
          setLeadFormOpen(false)
          setLeadNotice('')
        }, 1600)
      } else {
        setLeadError('Não foi possível enviar seu interesse agora. Tente novamente em instantes.')
      }
    } finally {
      setLeadSubmitting(false)
    }
  }

  return (
    <main className="public-site property-detail-page">
      <SEO
        canonical={propertyUrl}
        description={getSeoDescription(property)}
        image={seoImage}
        title={`${property.title} | LarMap`}
      />
      <PublicNavbar />

      <div className="property-detail-shell">
        <nav className="property-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={getTransactionLabel(property) === 'Aluguel' ? '/aluguel' : '/compra'}>
            {getTransactionLabel(property) === 'Aluguel' ? 'Aluguel' : 'Compra'}
          </Link>
          <span>/</span>
          <span>{property.title}</span>
        </nav>

        <section className="property-detail-hero">
          <div className="property-gallery">
            <div className={images.length ? 'property-gallery__main' : 'property-gallery__main property-gallery__main--empty'}>
              <img alt={images.length ? property.title : ''} src={activeImage} />
            </div>
            {images.length > 1 ? (
              <div className="property-gallery__thumbs" aria-label="Fotos do imóvel">
                {images.map((image, index) => (
                  <button
                    aria-label={`Ver foto ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    className={
                      selectedImageIndex === index
                        ? 'property-gallery__thumb property-gallery__thumb--active'
                        : 'property-gallery__thumb'
                    }
                    key={image}
                    onClick={() => setSelectedImageIndex(index)}
                    type="button"
                  >
                    <img alt="" src={image} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="property-hero-copy">
            <span className="eyebrow">{getTransactionLabel(property)}</span>
            <h1>{property.title}</h1>
            <p>
              <MapPin size={16} />
              {compactLocation}
            </p>
            <strong>{priceLabel}</strong>
            <StatusBadge value={property.status} />
          </div>
        </section>

        <section className="property-detail-layout">
          <div className="property-detail-main">
            <section className="property-section panel">
              <div className="property-section__heading">
                <span className="eyebrow">Informações principais</span>
                <h2>Detalhes do imóvel</h2>
              </div>
              <div className="property-spec-grid">
                <span>
                  <Building2 size={16} />
                  {getPropertyTypeLabel(property)}
                </span>
                {specs.map(({ Icon, label }) => (
                  <span key={label}>
                    <Icon size={16} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="property-meta-list">
                <span>Código: {getPropertyCode(property)}</span>
                {publishedAt ? (
                  <span>
                    <CalendarDays size={14} />
                    Publicado em {publishedAt}
                  </span>
                ) : null}
                {updatedAt ? (
                  <span>
                    <CalendarDays size={14} />
                    Atualizado em {updatedAt}
                  </span>
                ) : null}
              </div>
            </section>

            <section className="property-section panel">
              <div className="property-section__heading">
                <span className="eyebrow">Descrição</span>
                <h2>Sobre este imóvel</h2>
              </div>
              <p className="property-description">
                {description || 'O anunciante ainda não adicionou uma descrição completa para este imóvel.'}
              </p>
            </section>

            <section className="property-section panel">
              <div className="property-section__heading">
                <span className="eyebrow">Localização</span>
                <h2>Explore a região ao redor deste imóvel.</h2>
              </div>
              <p className="property-location-copy">{locationLabel}</p>
              <div className="property-detail-map">
                <MapContainer
                  center={[property.latitude, property.longitude]}
                  className="property-detail-map__canvas"
                  scrollWheelZoom
                  zoom={DETAIL_MAP_ZOOM}
                >
                  <TileLayer attribution={publicMapAttribution} url={publicDetailedMapTileLayerUrl} />
                  <MapResizeHandler dependencies={[property.id]} />
                  <PropertyMapFocus property={property} selectedPoi={selectedPoi} />
                  <PoiLayer densityMode="home" pois={relevantPois} />
                  <Marker
                    icon={getPropertyMarkerIcon(property.status)}
                    position={[property.latitude, property.longitude]}
                  >
                    <Popup className="clean-map-popup">
                      <div className="map-popup">
                        <strong>{property.title}</strong>
                        <span>{priceLabel}</span>
                      </div>
                    </Popup>
                  </Marker>
                  {selectedPoi ? (
                    <CircleMarker
                      center={[selectedPoi.latitude, selectedPoi.longitude]}
                      fillColor="#57b44b"
                      fillOpacity={0.18}
                      pathOptions={{ color: '#027eca', opacity: 0.96, weight: 3 }}
                      radius={18}
                    >
                      <Popup className="clean-map-popup">
                        <div className="poi-map-popup">
                          <strong>{selectedPoi.name || poiCategoryLabels[selectedPoi.category]}</strong>
                          <span>{poiCategoryLabels[selectedPoi.category]}</span>
                          <small>{formatDistance(selectedPoi.distanceMeters)}</small>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ) : null}
                </MapContainer>
              </div>
            </section>

            <NearbyPlacesSection
              error={nearbyPois.error}
              loading={nearbyPois.loading}
              onPoiSelect={setSelectedPoi}
              pois={relevantPois}
              selectedPoi={selectedPoi}
            />
          </div>

          <aside className="property-contact-card panel">
            <span className="eyebrow">Responsável pelo anúncio</span>
            <div className="property-contact-card__person">
              <div className="property-contact-card__avatar">
                <Building2 size={22} />
              </div>
              <div>
                <strong>{contactName}</strong>
                <span>{contactPhone || 'Contato disponível pelo formulário'}</span>
              </div>
            </div>

            {interestCount !== null ? (
              <p className="property-interest-note">
                {pluralize(interestCount, 'pessoa demonstrou', 'pessoas demonstraram')} interesse neste imóvel
              </p>
            ) : null}

            <button className="primary-button property-contact-card__button" onClick={openLeadForm} type="button">
              <Send size={16} />
              <span>Tenho interesse neste imóvel</span>
            </button>
            {whatsappHref ? (
              <a className="secondary-button property-contact-card__button" href={whatsappHref} rel="noreferrer" target="_blank">
                <MessageCircle size={16} />
                <span>Mais informações do anunciante</span>
              </a>
            ) : (
              <button className="secondary-button property-contact-card__button" onClick={openLeadForm} type="button">
                <Phone size={16} />
                <span>Mais informações do anunciante</span>
              </button>
            )}
            <button className="secondary-button secondary-button--quiet property-contact-card__button" onClick={handleShare} type="button">
              <Share2 size={16} />
              <span>Compartilhar</span>
            </button>
            {shareNotice ? <span className="property-share-notice">{shareNotice}</span> : null}
          </aside>
        </section>
      </div>

      <PublicFooter />

      {leadFormOpen ? (
        <div className="lead-modal-backdrop" role="presentation">
          <section aria-modal="true" className="lead-modal" role="dialog" aria-labelledby="property-lead-modal-title">
            <button className="lead-modal__close" onClick={closeLeadForm} type="button" aria-label="Fechar formulário">
              <X size={17} />
            </button>

            <div className="lead-modal__header">
              <span className="eyebrow">Tenho interesse</span>
              <h2 id="property-lead-modal-title">{property.title}</h2>
              <p className="lead-modal__location">{locationLabel}</p>
              <strong className="lead-modal__price">{priceLabel}</strong>
            </div>

            <form className="lead-form" onSubmit={handleLeadSubmit}>
              <label>
                Nome
                <div className="lead-form__field">
                  <Building2 size={16} />
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
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, whatsapp: formatWhatsAppInput(event.target.value) }))
                    }
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
