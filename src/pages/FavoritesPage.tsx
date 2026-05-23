import { MapPin, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { propertiesApi } from '../api/client'
import { PublicNavbar } from '../components/PublicNavbar'
import { StatusBadge } from '../components/StatusBadge'
import { getFavorites, removeFavorite, type FavoriteItem } from '../hooks/useFavorites'
import type { Property } from '../types/api'

function getPropertyNeighborhood(property: Property) {
  return property.neighborhood || property.bairro || property.district || property.city || property.cidade || ''
}

function getPriceLabel(property: Property) {
  const rawPrice = property.price || property.salePrice || property.rentPrice || property.value || property.preco
  if (!rawPrice) return 'Preço sob consulta'

  const parsed = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(parsed)) return String(rawPrice)

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(parsed)
}

function toFavoriteItem(property: Property, fallback?: FavoriteItem): FavoriteItem {
  return {
    city: property.city || property.cidade || fallback?.city,
    contactPhone: property.contactPhone ?? fallback?.contactPhone,
    contactWhatsApp: property.contactWhatsApp ?? fallback?.contactWhatsApp,
    id: property.id,
    neighborhood: getPropertyNeighborhood(property) || fallback?.neighborhood,
    priceLabel: getPriceLabel(property),
    savedAt: fallback?.savedAt ?? Date.now(),
    status: property.status,
    title: property.title,
  }
}

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => getFavorites())
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    let ignore = false

    async function loadProperties() {
      try {
        const data = await propertiesApi.list()
        if (!ignore) setProperties(data)
      } catch {
        if (!ignore) setProperties([])
      }
    }

    void loadProperties()
    return () => {
      ignore = true
    }
  }, [])

  const items = useMemo(() => {
    const propertyById = new Map(properties.map((property) => [property.id, property]))

    return favorites.map((favorite) => {
      const property = propertyById.get(favorite.id)
      return property ? toFavoriteItem(property, favorite) : favorite
    })
  }, [favorites, properties])

  function handleRemove(id: string) {
    setFavorites(removeFavorite(id))
  }

  return (
    <main className="favorites-page">
      <PublicNavbar />

      <section className="favorites-content">
        <div className="favorites-heading">
          <span className="eyebrow">Favoritos</span>
          <h1>Imóveis salvos</h1>
        </div>

        {items.length ? (
          <div className="favorites-grid">
            {items.map((item) => (
              <article className="favorite-card" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    <MapPin size={14} />
                    {item.neighborhood || item.city || 'Localização salva'}
                  </span>
                </div>
                <div className="favorite-card__meta">
                  <small>{item.priceLabel || 'Preço sob consulta'}</small>
                  <StatusBadge value={item.status} />
                </div>
                <div className="favorite-card__actions">
                  <Link className="secondary-button" to="/mapa">
                    Ver no mapa
                  </Link>
                  <button className="icon-button icon-button--danger" onClick={() => handleRemove(item.id)} title="Remover favorito" type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty favorites-empty">
            <strong>Nenhum favorito salvo</strong>
            <p>Use o coração nos cards de imóveis para montar sua lista.</p>
          </div>
        )}
      </section>
    </main>
  )
}
