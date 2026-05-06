import { Heart, MapPin, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { propertiesApi } from '../api/client'
import { BrandLogo } from '../components/BrandLogo'
import { PropertyCarousel } from '../components/PropertyCarousel'
import { useAuth } from '../context/AuthContext'
import { getRecentlyViewed, addRecentlyViewed } from '../hooks/useRecentlyViewed'
import type { Property } from '../types/api'
import { canUsePublicFavorites } from '../utils/userAccess'

const homeMapCenter: [number, number] = [-22.9068, -43.1729]
const LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'

const previewDots = [
  { center: [-22.9519, -43.2105] as [number, number], color: '#57b44b' },
  { center: [-22.9847, -43.1986] as [number, number], color: '#b58b19' },
  { center: [-22.9068, -43.1729] as [number, number], color: '#57b44b' },
  { center: [-22.8960, -43.1800] as [number, number], color: '#57b44b' },
  { center: [-22.9300, -43.2400] as [number, number], color: '#cc4b4b' },
]

function readLocalAdminProperties() {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_PROPERTIES_KEY)
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
  const { isAuthenticated, user } = useAuth()
  const [locationQuery, setLocationQuery] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const showFavoritesButton = canUsePublicFavorites(isAuthenticated, user)

  function isNavItemActive(section: 'rent' | 'sale' | 'news' | 'map') {
    if (section === 'news') return location.pathname === '/novidades'
    if (section === 'map') return location.pathname === '/mapa'
    if (location.pathname !== '/mapa' && location.pathname !== '/novidades') return false

    const searchParams = new URLSearchParams(location.search)
    const listingType = searchParams.get('type')
    const searchQuery = searchParams.get('q')?.trim()

    if (section === 'rent') return listingType === 'aluguel'
    if (section === 'sale') return listingType === 'compra' || listingType === 'venda'
    if (section === 'news') return !listingType && !searchQuery
    return !listingType && Boolean(searchQuery)
  }

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
      {/* ─── NAVBAR ─── */}
      <header className="home-header">
        <div className="home-header__inner">
          <BrandLogo to="/" />
          <nav className="home-nav" aria-label="Navegação principal">
            <Link
              aria-current={isNavItemActive('rent') ? 'page' : undefined}
              className={isNavItemActive('rent') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
              to="/mapa?type=aluguel"
            >
              Aluguel
            </Link>
            <Link
              aria-current={isNavItemActive('sale') ? 'page' : undefined}
              className={isNavItemActive('sale') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
              to="/mapa?type=compra"
            >
              Compra
            </Link>
            <Link
              aria-current={isNavItemActive('news') ? 'page' : undefined}
              className={isNavItemActive('news') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
              to="/novidades"
            >
              Novidades
            </Link>
            <Link
              aria-current={isNavItemActive('map') ? 'page' : undefined}
              className={isNavItemActive('map') ? 'home-nav__link home-nav__link--active home-nav__link--featured' : 'home-nav__link home-nav__link--featured'}
              to="/mapa"
            >
              Mapa interativo
            </Link>
            {showFavoritesButton ? (
              <Link to="/favoritos" className="home-nav__icon" title="Favoritos">
                <Heart size={18} />
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

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
              <Link to="/mapa?type=aluguel" className="home-tag">
                <MapPin size={14} /> Aluguel
              </Link>
              <Link to="/mapa?type=compra" className="home-tag">
                <MapPin size={14} /> Compra
              </Link>
              <Link to="/mapa" className="home-tag">
                <MapPin size={14} /> Lançamentos
              </Link>
            </div>
          </div>

          <div className="home-hero__map">
            <MapContainer
              attributionControl={false}
              center={homeMapCenter}
              className="home-hero__map-container"
              dragging
              doubleClickZoom
              scrollWheelZoom={false}
              zoom={12}
              zoomControl
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {previewDots.map((dot, i) => (
                <CircleMarker
                  center={dot.center}
                  fillColor={dot.color}
                  fillOpacity={0.88}
                  key={i}
                  pathOptions={{ color: '#ffffff', opacity: 1, weight: 2 }}
                  radius={6}
                />
              ))}
            </MapContainer>
          </div>
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
          <span>© {new Date().getFullYear()} SmartMap. Todos os direitos reservados.</span>
        </div>
      </footer>
    </main>
  )
}
