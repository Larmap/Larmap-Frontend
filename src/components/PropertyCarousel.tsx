import { Bath, BedDouble, Building2, Car, ChevronLeft, ChevronRight, MapPin, MapPinned } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import type { Property } from '../types/api'
import { StatusBadge } from './StatusBadge'

interface PropertyCarouselProps {
  title: string
  properties: Property[]
  emptyMessage?: string
  onPropertyClick?: (property: Property) => void
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

function getFirstString(property: Property, keys: Array<keyof Property>) {
  for (const key of keys) {
    const value = property[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  return ''
}

function getFirstNumber(property: Property, keys: Array<keyof Property>) {
  for (const key of keys) {
    const parsed = parseNumber(property[key])
    if (parsed !== null) return parsed
  }

  return null
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

function getPropertyImages(property: Property) {
  return property.imageUrls ?? property.images ?? property.photos ?? []
}

function getLocationLabel(property: Property) {
  const neighborhood = getFirstString(property, ['neighborhood', 'bairro', 'district'])
  const city = getFirstString(property, ['city', 'cidade'])
  const state = getFirstString(property, ['stateCode', 'state', 'uf'])

  return [neighborhood, city, state].filter(Boolean).join(', ') || 'Localização não informada'
}

function getTransactionLabel(property: Property) {
  const text = getFirstString(property, ['listingType', 'transactionType', 'purpose', 'operation']).toLowerCase()
  if (/alug|rent|loca/.test(text)) return 'Aluguel'
  if (/vend|compra|sale/.test(text)) return 'Venda'
  return 'Imóvel'
}

function formatSpecs(property: Property) {
  const bedrooms = getFirstNumber(property, ['bedrooms', 'rooms', 'quartos'])
  const bathrooms = getFirstNumber(property, ['bathrooms', 'banheiros'])
  const parking = getFirstNumber(property, ['parkingSpots', 'garageSpots', 'vagas'])

  return [
    bedrooms !== null ? { icon: BedDouble, label: `${bedrooms} quarto${bedrooms === 1 ? '' : 's'}` } : null,
    bathrooms !== null ? { icon: Bath, label: `${bathrooms} banheiro${bathrooms === 1 ? '' : 's'}` } : null,
    parking !== null ? { icon: Car, label: `${parking} vaga${parking === 1 ? '' : 's'}` } : null,
  ].filter((item): item is { icon: typeof BedDouble; label: string } => item !== null)
}

export function PropertyCarousel({
  title,
  properties,
  emptyMessage = 'Sem imóveis a exibir',
  onPropertyClick,
}: PropertyCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateScrollState() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [properties.length])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 316 + 16
    el.scrollBy({
      left: direction === 'left' ? -cardWidth * 2 : cardWidth * 2,
      behavior: 'smooth',
    })
  }

  return (
    <section className="carousel-section">
      <div className="carousel-header">
        <h2 className="carousel-title">{title}</h2>
        {properties.length > 0 && (
          <div className="carousel-nav">
            <button
              className="carousel-arrow"
              disabled={!canScrollLeft}
              onClick={() => scroll('left')}
              type="button"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="carousel-arrow"
              disabled={!canScrollRight}
              onClick={() => scroll('right')}
              type="button"
              aria-label="Próximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="carousel-empty">
          <MapPinned size={22} />
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <div className="carousel-track" ref={scrollRef}>
          {properties.map((property) => {
            const image = getPropertyImages(property)[0]
            const specs = formatSpecs(property)

            return (
              <button
                className="carousel-card"
                key={property.id}
                onClick={() => onPropertyClick?.(property)}
                type="button"
              >
                <div className="carousel-card__media">
                  {image ? (
                    <img alt="" src={image} />
                  ) : (
                    <div className="carousel-card__media-fallback">
                      <Building2 size={28} />
                    </div>
                  )}
                  <span className="carousel-card__badge">{getTransactionLabel(property)}</span>
                  <span className="carousel-card__status"><StatusBadge value={property.status} /></span>
                </div>
                <div className="carousel-card__info">
                  <div className="carousel-card__price-row">
                    <strong>{getPriceLabel(property)}</strong>
                    <span>Ver no mapa</span>
                  </div>
                  <span className="carousel-card__title">{property.title}</span>
                  <span className="carousel-card__location">
                    <MapPin size={13} />
                    {getLocationLabel(property)}
                  </span>
                  {specs.length ? (
                    <div className="carousel-card__specs">
                      {specs.map(({ icon: Icon, label }) => (
                        <span key={label}>
                          <Icon size={13} />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="carousel-card__detail">Detalhes do imóvel no mapa</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
