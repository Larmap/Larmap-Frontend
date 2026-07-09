import {
  AtSign,
  Building2,
  Check,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Star,
  UserRound,
} from 'lucide-react'
import { divIcon } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, professionalsApi } from '../api/client'
import { MapResizeHandler } from '../components/map/MapResizeHandler'
import { PropertyCarousel } from '../components/PropertyCarousel'
import { PublicFooter } from '../components/PublicFooter'
import { PublicMapFrame } from '../components/PublicMapFrame'
import { PublicNavbar } from '../components/PublicNavbar'
import { SEO } from '../components/SEO'
import { StatusBadge } from '../components/StatusBadge'
import { publicDetailedMapTileLayerUrl, publicMapAttribution } from '../constants/publicMap'
import type {
  Property,
  PropertyStatus,
  PublicProfessionalArea,
  PublicProfessionalProfile,
  PublicProfessionalPropertyType,
  PublicProfessionalReview,
} from '../types/api'
import {
  getCompactLocationLabel,
  getPriceLabel,
  getPropertySlug,
  getPropertyTypeLabel,
  getTransactionLabel,
  parseNumber,
} from '../utils/properties'

const profileMapZoom = 12

function cleanPhone(value?: string | null) {
  return value?.replace(/\D/g, '') ?? ''
}

function normalizeSiteUrl(value: string) {
  if (!value) return ''
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function toNumber(value: unknown) {
  return parseNumber(value)
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatRating(value: number) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })
}

function pluralize(value: number, singular: string, plural: string) {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`
}

function getRoleLabel(role?: string | null) {
  const normalizedRole = role?.trim().toLowerCase()

  if (!normalizedRole) return 'Profissional imobiliário'
  if (['agent', 'broker', 'corretor'].includes(normalizedRole)) return 'Corretor Imobiliário'
  if (['real_estate', 'company', 'agency', 'imobiliaria', 'imobiliária'].includes(normalizedRole)) return 'Imobiliária'
  if (['autonomo', 'autônomo', 'independent'].includes(normalizedRole)) return 'Autônomo'
  if (['consultant', 'consultor'].includes(normalizedRole)) return 'Consultor Imobiliário'

  return role
}

function getProfileImage(profile: PublicProfessionalProfile) {
  return profile.photoUrl || profile.photo || profile.avatarUrl || profile.logoUrl || profile.company?.logoUrl || ''
}

function getProfileContact(profile: PublicProfessionalProfile) {
  return {
    email: profile.contact?.email || profile.email || '',
    instagram: profile.contact?.instagram || '',
    phone: profile.contact?.phone || profile.phone || profile.company?.phone || '',
    site: profile.contact?.site || '',
    whatsapp: profile.contact?.whatsapp || profile.whatsapp || profile.company?.whatsapp || '',
  }
}

function getMemberSince(profile: PublicProfessionalProfile) {
  if (profile.memberSince) return profile.memberSince
  if (!profile.createdAt) return ''

  const timestamp = Date.parse(profile.createdAt)
  if (Number.isNaN(timestamp)) return ''

  return `Desde ${new Date(timestamp).getFullYear()}`
}

function getAverageRating(profile: PublicProfessionalProfile) {
  const explicitRating = toNumber(profile.stats?.averageRating)
  if (explicitRating !== null) return explicitRating

  const ratings = (profile.reviews ?? [])
    .map((review) => toNumber(review.rating))
    .filter((rating): rating is number => rating !== null)

  if (!ratings.length) return null
  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length
}

function getReviewCount(profile: PublicProfessionalProfile) {
  return toNumber(profile.stats?.reviewCount) ?? profile.reviews?.length ?? 0
}

function getActiveProperties(profile: PublicProfessionalProfile) {
  return (
    toNumber(profile.stats?.activeProperties) ??
    (profile.properties ?? []).filter((property) => property.status !== 'SOLD').length
  )
}

function getFormattedStat(value: unknown, formatter?: (value: number) => string) {
  const parsed = toNumber(value)
  if (parsed === null) return ''
  return formatter ? formatter(parsed) : formatNumber(parsed)
}

function getAreas(profile: PublicProfessionalProfile): PublicProfessionalArea[] {
  if (profile.areas?.length) return profile.areas

  const counts = (profile.properties ?? []).reduce((map, property) => {
    const neighborhood = property.neighborhood || property.district || property.bairro || 'Região não informada'
    map.set(neighborhood, (map.get(neighborhood) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  return [...counts.entries()]
    .map(([name, count]) => ({ count, name }))
    .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0) || first.name.localeCompare(second.name))
    .slice(0, 5)
}

function getPropertyTypes(profile: PublicProfessionalProfile): PublicProfessionalPropertyType[] {
  if (profile.propertyTypes?.length) return profile.propertyTypes

  const properties = profile.properties ?? []
  const counts = properties.reduce((map, property) => {
    const type = getPropertyTypeLabel(property)
    map.set(type, (map.get(type) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  return [...counts.entries()]
    .map(([name, count]) => ({
      count,
      name,
      percent: Math.round((count / Math.max(properties.length, 1)) * 100),
    }))
    .sort((first, second) => Number(second.count ?? 0) - Number(first.count ?? 0) || first.name.localeCompare(second.name))
}

function formatReviewDate(review: PublicProfessionalReview) {
  const rawDate = review.date || review.createdAt
  if (!rawDate) return ''

  const timestamp = Date.parse(rawDate)
  if (Number.isNaN(timestamp)) return rawDate

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function getReviewAuthor(review: PublicProfessionalReview) {
  return review.author || review.name || 'Cliente LarMap'
}

function getReviewPhoto(review: PublicProfessionalReview) {
  return review.photoUrl || review.photo || ''
}

function getWhatsAppHref(profile: PublicProfessionalProfile) {
  const contact = getProfileContact(profile)
  const phone = cleanPhone(contact.whatsapp || contact.phone)
  if (!phone) return ''

  const message = encodeURIComponent(`Olá! Vi seu perfil profissional no LarMap e gostaria de conversar.`)
  return `https://wa.me/${phone}?text=${message}`
}

function getMarkerIcon(status: PropertyStatus) {
  return divIcon({
    className: 'property-map-marker-shell',
    html: `
      <div class="property-map-marker property-map-marker--${status.toLowerCase()}">
        <span class="property-map-marker__core"></span>
      </div>
    `,
    iconAnchor: [19, 44],
    iconSize: [38, 44],
    popupAnchor: [0, -40],
  })
}

function ProfileMapFocus({ properties }: { properties: Property[] }) {
  const map = useMap()

  useEffect(() => {
    const coordinates = properties
      .filter((property) => Number.isFinite(property.latitude) && Number.isFinite(property.longitude))
      .map((property) => [property.latitude, property.longitude] as [number, number])

    if (!coordinates.length) return

    if (coordinates.length === 1) {
      map.flyTo(coordinates[0], profileMapZoom, { duration: 0.45 })
      return
    }

    map.fitBounds(coordinates, {
      maxZoom: 14,
      padding: [42, 42],
    })
  }, [map, properties])

  return null
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="professional-stars" aria-label={`${formatRating(rating)} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={15} />
      ))}
    </span>
  )
}

function ProfileAvatar({ profile }: { profile: PublicProfessionalProfile }) {
  const image = getProfileImage(profile)
  const isCompany = getRoleLabel(profile.role) === 'Imobiliária'

  return (
    <div className={image ? 'professional-hero__photo' : 'professional-hero__photo professional-hero__photo--empty'}>
      {image ? (
        <img alt={profile.name} src={image} />
      ) : isCompany ? (
        <Building2 size={58} />
      ) : (
        <UserRound size={58} />
      )}
    </div>
  )
}

function PropertyGridCard({ property }: { property: Property }) {
  return (
    <article className="property-card professional-property-card">
      <Link className="property-card__body" to={`/imovel/${getPropertySlug(property)}`}>
        <span className="property-card__title">{property.title}</span>
        <div className="property-card__row">
          <span className="property-card__price">{getPriceLabel(property)}</span>
          <StatusBadge value={property.status} />
        </div>
        <span className="property-card__meta">
          <MapPin size={13} />
          {getCompactLocationLabel(property)}
        </span>
        <span className="property-card__meta">
          {getPropertyTypeLabel(property)} | {getTransactionLabel(property)}
        </span>
      </Link>

      <div className="property-card__actions">
        <Link className="details-button" to={`/imovel/${getPropertySlug(property)}`}>
          <ExternalLink size={14} />
          <span>Ver imóvel</span>
        </Link>
      </div>
    </article>
  )
}

export function ProfessionalProfilePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PublicProfessionalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [shareNotice, setShareNotice] = useState('')

  useEffect(() => {
    let ignore = false
    const currentSlug = slug?.trim()

    async function loadProfile() {
      if (!currentSlug) {
        setProfile(null)
        setLoadError('URL de perfil inválida.')
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError('')

      try {
        const data = await professionalsApi.getPublic(currentSlug)
        if (!ignore) setProfile(data)
      } catch (error) {
        if (!ignore) {
          setProfile(null)
          if (error instanceof ApiError && error.status === 404) {
            setLoadError('Perfil profissional não encontrado.')
          } else {
            setLoadError('Não foi possível carregar este perfil profissional agora.')
          }
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      ignore = true
    }
  }, [slug])

  const properties = profile?.properties ?? []
  const contact = profile ? getProfileContact(profile) : null
  const profileImage = profile ? getProfileImage(profile) : ''
  const roleLabel = profile ? getRoleLabel(profile.role) : ''
  const memberSince = profile ? getMemberSince(profile) : ''
  const averageRating = profile ? getAverageRating(profile) : null
  const reviewCount = profile ? getReviewCount(profile) : 0
  const activeProperties = profile ? getActiveProperties(profile) : 0
  const areas = useMemo(() => (profile ? getAreas(profile) : []), [profile])
  const propertyTypes = useMemo(() => (profile ? getPropertyTypes(profile) : []), [profile])
  const featuredProperties = useMemo(
    () => [...properties].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)).slice(0, 10),
    [properties],
  )
  const statItems = profile
    ? [
        [formatNumber(activeProperties), 'Imóveis ativos'],
        [getFormattedStat(profile.stats?.interestedCount), 'Interessados'],
        [averageRating !== null ? formatRating(averageRating) : '', 'Avaliação média'],
        [getFormattedStat(profile.stats?.responseRate, (value) => `${value}%`), 'Taxa de resposta'],
        [getFormattedStat(profile.stats?.responseMinutes, (value) => `${value} min`), 'Tempo médio de resposta'],
        [getFormattedStat(profile.stats?.experienceYears, (value) => `${value} anos`), 'Experiência'],
      ].filter(([value]) => Boolean(value))
    : []

  async function handleShare() {
    if (!profile) return

    const profileSlug = profile.slug || slug || ''
    const url = `${window.location.origin}/profissional/${profileSlug}`
    const shareData = {
      text: `${profile.name} no LarMap`,
      title: `${profile.name} | LarMap`,
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }

      await navigator.clipboard.writeText(url)
      setShareNotice('Link copiado.')
      window.setTimeout(() => setShareNotice(''), 1800)
    } catch {
      setShareNotice('')
    }
  }

  if (loading) {
    return (
      <main className="public-site professional-profile-page">
        <SEO title="Carregando perfil profissional | LarMap" canonical={`/profissional/${slug ?? ''}`} />
        <PublicNavbar />
        <section className="property-detail-shell property-detail-shell--state">
          <Loader2 className="spin" size={24} />
          <p>Carregando perfil profissional...</p>
        </section>
        <PublicFooter />
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="public-site professional-profile-page">
        <SEO title="Perfil profissional não encontrado | LarMap" canonical={`/profissional/${slug ?? ''}`} />
        <PublicNavbar />
        <section className="property-detail-shell property-detail-shell--state">
          <UserRound size={28} />
          <h1>Perfil profissional não encontrado</h1>
          <p>{loadError || 'Este anunciante ainda não possui um perfil público disponível.'}</p>
          <Link className="secondary-button" to="/mapa">
            Ver imóveis no mapa
          </Link>
        </section>
        <PublicFooter />
      </main>
    )
  }

  const profileUrl = `/profissional/${profile.slug || slug}`
  const contactHref = getWhatsAppHref(profile) || '#contato'
  const contactTarget = contactHref.startsWith('http') ? '_blank' : undefined
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    ...(averageRating !== null && reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingCount: reviewCount,
            ratingValue: averageRating,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.city || profile.company?.headquartersCity,
      addressRegion: profile.state || profile.company?.headquartersState,
    },
    image: profileImage || undefined,
    name: profile.name,
    telephone: contact?.phone || contact?.whatsapp || undefined,
    url: `https://larmap.com.br${profileUrl}`,
  }

  return (
    <main className="public-site professional-profile-page">
      <SEO
        canonical={profileUrl}
        description={`${profile.name}, ${roleLabel}${profile.city ? ` em ${profile.city}` : ''}. Veja imóveis, avaliações, mapa de atuação e formas de contato no LarMap.`}
        image={profileImage || '/assets/Larmap-logo-casas.png'}
        title={`${profile.name} | Perfil profissional no LarMap`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <PublicNavbar />

      <div className="professional-profile-shell">
        <nav className="property-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/mapa">Anunciantes</Link>
          <span>/</span>
          <span>{profile.name}</span>
        </nav>

        <section className="professional-hero">
          <ProfileAvatar profile={profile} />

          <div className="professional-hero__copy">
            <span className="eyebrow">Perfil profissional</span>
            <h1>{profile.name}</h1>
            <p className="professional-hero__role">{roleLabel}</p>
            <div className="professional-hero__meta">
              {profile.creci ? <span>CRECI {profile.creci}</span> : null}
              {[profile.city, profile.state].filter(Boolean).length ? (
                <span>{[profile.city, profile.state].filter(Boolean).join(', ')}</span>
              ) : null}
              {memberSince ? <span>{memberSince}</span> : null}
            </div>
            <div className="professional-hero__trust">
              {averageRating !== null ? (
                <>
                  <Stars rating={averageRating} />
                  <strong>{formatRating(averageRating)}</strong>
                </>
              ) : null}
              {reviewCount ? <span>{pluralize(reviewCount, 'avaliação', 'avaliações')}</span> : null}
              <span>{pluralize(activeProperties, 'imóvel ativo', 'imóveis ativos')}</span>
              {(profile.achievements ?? []).includes('Perfil verificado') ? <span>Perfil verificado</span> : null}
            </div>
            <a className="primary-button professional-hero__button" href={contactHref} rel="noreferrer" target={contactTarget}>
              <MessageCircle size={17} />
              <span>Entrar em contato</span>
            </a>
          </div>
        </section>

        <section className="professional-profile-layout">
          <div className="professional-profile-main">
            <section className="property-section professional-section">
              <div className="property-section__heading">
                <span className="eyebrow">Sobre</span>
                <h2>Conheça o profissional</h2>
              </div>
              <p className="professional-bio">
                {profile.bio || 'Este profissional ainda não adicionou uma biografia pública.'}
              </p>
            </section>

            {(profile.specialties ?? []).length ? (
              <section className="property-section professional-section">
                <div className="property-section__heading">
                  <span className="eyebrow">Especialidades</span>
                  <h2>Onde costuma atuar</h2>
                </div>
                <div className="home-hero__tags professional-tags">
                  {(profile.specialties ?? []).map((specialty) => (
                    <span className="home-tag" key={specialty}>
                      {specialty}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {statItems.length ? (
              <section className="property-section professional-section">
                <div className="property-section__heading">
                  <span className="eyebrow">Estatísticas</span>
                  <h2>Resumo de atuação no LarMap</h2>
                </div>
                <dl className="professional-stat-grid">
                  {statItems.map(([value, label]) => (
                    <div key={label}>
                      <dt>{value}</dt>
                      <dd>{label}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {(profile.achievements ?? []).length ? (
              <section className="property-section professional-section">
                <div className="property-section__heading">
                  <span className="eyebrow">Conquistas</span>
                  <h2>Verificações e sinais de confiança</h2>
                </div>
                <div className="professional-achievements">
                  {(profile.achievements ?? []).map((achievement) => (
                    <span key={achievement}>
                      <Check size={15} />
                      {achievement}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <PropertyCarousel
              emptyMessage="Este anunciante ainda não possui imóveis em destaque."
              onPropertyClick={(property) => navigate(`/imovel/${getPropertySlug(property)}`)}
              properties={featuredProperties}
              title="Imóveis em destaque"
            />

            <section className="property-section professional-section">
              <div className="property-section__heading">
                <span className="eyebrow">Todos os imóveis</span>
                <h2>Portfólio publicado no LarMap</h2>
              </div>
              {properties.length ? (
                <div className="professional-property-grid">
                  {properties.map((property) => (
                    <PropertyGridCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <p className="empty-copy">Este profissional ainda não possui imóveis públicos.</p>
              )}
            </section>

            {(profile.reviews ?? []).length || averageRating !== null ? (
              <section className="property-section professional-section">
                <div className="professional-reviews-heading">
                  <div>
                    <span className="eyebrow">Avaliações</span>
                    <h2>O que clientes destacam</h2>
                  </div>
                  {averageRating !== null ? (
                    <div className="professional-rating-summary">
                      <Stars rating={averageRating} />
                      <strong>{formatRating(averageRating)}</strong>
                      {reviewCount ? <span>Baseado em {pluralize(reviewCount, 'avaliação', 'avaliações')}</span> : null}
                    </div>
                  ) : null}
                </div>

                {(profile.reviews ?? []).length ? (
                  <div className="professional-review-grid">
                    {(profile.reviews ?? []).map((review) => {
                      const rating = toNumber(review.rating)

                      return (
                        <article className="professional-review" key={review.id ?? `${getReviewAuthor(review)}-${formatReviewDate(review)}`}>
                          <div className="professional-review__header">
                            <div className="professional-review__avatar" aria-hidden="true">
                              {getReviewPhoto(review) ? <img alt="" src={getReviewPhoto(review)} /> : <UserRound size={18} />}
                            </div>
                            <div>
                              <strong>{getReviewAuthor(review)}</strong>
                              <span>{formatReviewDate(review)}</span>
                            </div>
                          </div>
                          {rating !== null ? <Stars rating={rating} /> : null}
                          <p>{review.comment}</p>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="property-section professional-section">
              <div className="property-section__heading">
                <span className="eyebrow">Mapa de atuação</span>
                <h2>Onde este anunciante concentra seus imóveis</h2>
              </div>
              <div className="professional-market-layout">
                {properties.length ? (
                  <PublicMapFrame className="professional-map" element="div">
                    <MapContainer
                      center={[properties[0].latitude, properties[0].longitude]}
                      className="professional-map__canvas"
                      scrollWheelZoom
                      zoom={profileMapZoom}
                    >
                      <TileLayer attribution={publicMapAttribution} url={publicDetailedMapTileLayerUrl} />
                      <MapResizeHandler dependencies={[profile.slug, properties.length]} />
                      <ProfileMapFocus properties={properties} />
                      {properties.map((property) => (
                        <Marker
                          icon={getMarkerIcon(property.status)}
                          key={property.id}
                          position={[property.latitude, property.longitude]}
                        >
                          <Popup className="clean-map-popup">
                            <div className="map-popup">
                              <strong>{property.title}</strong>
                              <span>{getPriceLabel(property)}</span>
                              <Link className="map-popup__link" to={`/imovel/${getPropertySlug(property)}`}>
                                Ver imóvel
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </PublicMapFrame>
                ) : (
                  <p className="empty-copy">O mapa será exibido quando houver imóveis públicos vinculados a este perfil.</p>
                )}

                <aside className="professional-market-panel">
                  {areas.length ? (
                    <div>
                      <h3>Mercado de atuação</h3>
                      <div className="professional-market-list">
                        {areas.map((item) => {
                          const count = toNumber(item.count) ?? 0
                          return (
                            <span key={item.name}>
                              <strong>{item.name}</strong>
                              <small>{pluralize(count, 'imóvel', 'imóveis')}</small>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {propertyTypes.length ? (
                    <div>
                      <h3>O que anuncia</h3>
                      <div className="professional-market-list">
                        {propertyTypes.map((item) => {
                          const percent = toNumber(item.percent)
                          const count = toNumber(item.count)

                          return (
                            <span key={item.name}>
                              <strong>{percent !== null ? `${percent}%` : formatNumber(count ?? 0)}</strong>
                              <small>{item.name}</small>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>
            </section>

            <section className="property-section professional-section" id="contato">
              <div className="property-section__heading">
                <span className="eyebrow">Contato</span>
                <h2>Fale com {profile.name}</h2>
              </div>
              <div className="professional-contact-list">
                {contact?.phone ? (
                  <a href={`tel:${cleanPhone(contact.phone)}`}>
                    <Phone size={16} />
                    <span>{contact.phone}</span>
                  </a>
                ) : null}
                {contact?.whatsapp ? (
                  <a href={getWhatsAppHref(profile)} rel="noreferrer" target="_blank">
                    <MessageCircle size={16} />
                    <span>{contact.whatsapp}</span>
                  </a>
                ) : null}
                {contact?.email ? (
                  <a href={`mailto:${contact.email}`}>
                    <Mail size={16} />
                    <span>{contact.email}</span>
                  </a>
                ) : null}
                {contact?.site ? (
                  <a href={normalizeSiteUrl(contact.site)} rel="noreferrer" target="_blank">
                    <Globe2 size={16} />
                    <span>{contact.site}</span>
                  </a>
                ) : null}
                {contact?.instagram ? (
                  <a href={normalizeSiteUrl(contact.instagram)} rel="noreferrer" target="_blank">
                    <AtSign size={16} />
                    <span>{contact.instagram}</span>
                  </a>
                ) : null}
              </div>

              <div className="professional-share-row">
                <button className="secondary-button" onClick={handleShare} type="button">
                  <Share2 size={16} />
                  <span>Compartilhar perfil</span>
                </button>
                {shareNotice ? <span>{shareNotice}</span> : null}
              </div>
            </section>
          </div>
        </section>
      </div>

      <PublicFooter />
    </main>
  )
}
