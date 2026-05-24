import { MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import { Link, useNavigate } from 'react-router-dom'
import { propertiesApi } from '../api/client'
import { BrandLogo } from '../components/BrandLogo'
import { PoiCategoryControl } from '../components/map/PoiCategoryControl'
import { PoiLayer } from '../components/map/PoiLayer'
import { PublicMapFrame } from '../components/PublicMapFrame'
import { PublicNavbar } from '../components/PublicNavbar'
import { PropertyCarousel } from '../components/PropertyCarousel'
import { allPoiCategories } from '../constants/pois'
import { publicDetailedMapTileLayerUrl, publicMapAttribution } from '../constants/publicMap'
import { useNearbyPois } from '../hooks/useNearbyPois'
import { getRecentlyViewed, addRecentlyViewed } from '../hooks/useRecentlyViewed'
import type { Property } from '../types/api'
import type { PoiCategory } from '../types/pois'
import { readStorageValue } from '../utils/storage'

const homeMapCenter: [number, number] = [-22.9068, -43.1729]
const homePoiCenter = {
  latitude: homeMapCenter[0],
  longitude: homeMapCenter[1],
}
const LOCAL_ADMIN_PROPERTIES_KEY = 'larmap.admin.localProperties'
const LEGACY_LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'

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

export function HomePage() {
  const [locationQuery, setLocationQuery] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [poiCategories, setPoiCategories] = useState<PoiCategory[]>(allPoiCategories)
  const navigate = useNavigate()
  const nearbyPois = useNearbyPois({
    categories: poiCategories,
    center: homePoiCenter,
    enabled: true,
    limit: 110,
    radiusMeters: 2200,
  })

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const data = await propertiesApi.list()
        if (!ignore) setProperties(mergePropertyLists(data, readLocalAdminProperties()))
      } catch {
        if (!ignore) setProperties(readLocalAdminProperties())
      }
    }
    load()
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

            <form className="home-search" onSubmit={handleLocationSubmit}>
              <div className="home-search__bar">
                <Search size={18} />
                <input
                  id="home-location-search"
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Cidade, bairro ou endereço"
                  value={locationQuery}
                />
                <button className="home-search__btn" type="submit">
                  <Search size={16} />
                  Buscar
                </button>
              </div>
            </form>

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
            <PoiCategoryControl
              categories={poiCategories}
              className="home-poi-control"
              compact
              empty={nearbyPois.empty}
              error={nearbyPois.error}
              loading={nearbyPois.loading}
              onCategoriesChange={setPoiCategories}
              onRefresh={nearbyPois.refresh}
            />
            <MapContainer
              center={homeMapCenter}
              className="home-hero__map-container"
              dragging
              doubleClickZoom
              scrollWheelZoom={false}
              zoom={12}
              zoomControl
            >
              <TileLayer attribution={publicMapAttribution} url={publicDetailedMapTileLayerUrl} />
              <PoiLayer pois={nearbyPois.pois} />
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
          </PublicMapFrame>
        </div>
      </section>

      {/* ─── CAROUSELS ─── */}
      <section className="home-listings">
        <div className="home-listings__inner">
          <PropertyCarousel
            title="Últimos vistos"
            properties={recentlyViewed}
            emptyMessage="Você ainda não visualizou nenhum imóvel"
            onPropertyClick={handlePropertyClick}
          />

          <PropertyCarousel
            title="Destaques"
            properties={highlights}
            emptyMessage="Sem imóveis a exibir"
            onPropertyClick={handlePropertyClick}
          />
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="home-footer">
        <div className="home-footer__inner">
          <BrandLogo />
          <span>© {new Date().getFullYear()} LarMap. Todos os direitos reservados.</span>
        </div>
      </footer>
    </main>
  )
}
