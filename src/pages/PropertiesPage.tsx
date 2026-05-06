import { Crosshair, MapPin, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { ApiError, propertiesApi } from '../api/client'
import { getErrorMessage } from '../api/errors'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import type { CreatePropertyInput, Property, PropertyStatus } from '../types/api'

const defaultCoordinates = {
  latitude: -22.9068,
  longitude: -43.1729,
}

const statusColors: Record<PropertyStatus, string> = {
  AVAILABLE: '#57b44b',
  NEGOTIATING: '#b7791f',
  SOLD: '#d64545',
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function SelectedLocationFocus({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([latitude, longitude], 14, { duration: 0.45 })
  }, [latitude, longitude, map])

  return null
}

export function PropertiesPage() {
  const { token } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [form, setForm] = useState<CreatePropertyInput>({
    title: '',
    description: '',
    latitude: defaultCoordinates.latitude,
    longitude: defaultCoordinates.longitude,
    status: 'AVAILABLE',
    contactPhone: '',
    contactWhatsApp: '',
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let ignore = false

    async function loadProperties() {
      setLoading(true)
      setError('')
      setNotice('')

      try {
        const data = await propertiesApi.list(authToken)
        if (!ignore) setProperties(data)
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof ApiError && caughtError.status === 404) {
            setNotice('A listagem de imóveis ainda não respondeu neste backend. Os novos cadastros aparecem nesta sessão.')
          } else {
            setError(getErrorMessage(caughtError))
          }
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadProperties()

    return () => {
      ignore = true
    }
  }, [token, reloadKey])

  function updateCoordinates(latitude: number, longitude: number) {
    setForm((current) => ({
      ...current,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setSaving(true)
    setError('')

    try {
      const created = await propertiesApi.create(token, {
        ...form,
        description: form.description || undefined,
        contactPhone: form.contactPhone || undefined,
        contactWhatsApp: form.contactWhatsApp || undefined,
      })

      setProperties((current) => [created, ...current])
      setForm((current) => ({
        ...current,
        title: '',
        description: '',
      }))
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Gestão do mapa</span>
          <h1>Imóveis</h1>
        </div>
        <button className="secondary-button" type="button" onClick={() => setReloadKey((current) => current + 1)}>
          <RefreshCw size={17} />
          <span>Atualizar</span>
        </button>
      </section>

      {error ? <p className="notice notice--error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <section className="property-management-layout">
        <div className="property-side">
          <form className="panel form-panel" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Novo ponto</span>
                <h2>Cadastrar imóvel</h2>
              </div>
              <div className="metric-icon metric-icon--blue">
                <MapPin size={18} />
              </div>
            </div>

            <label>
              Título
              <input
                minLength={3}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Apartamento cobertura"
                required
                value={form.title}
              />
            </label>

            <label>
              Descrição
              <textarea
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Detalhes do imóvel"
                rows={4}
                value={form.description}
              />
            </label>

            <div className="coordinate-card">
              <div>
                <span>Latitude</span>
                <strong>{form.latitude.toFixed(6)}</strong>
              </div>
              <div>
                <span>Longitude</span>
                <strong>{form.longitude.toFixed(6)}</strong>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Latitude
                <input
                  max={90}
                  min={-90}
                  onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })}
                  required
                  step="0.000001"
                  type="number"
                  value={form.latitude}
                />
              </label>

              <label>
                Longitude
                <input
                  max={180}
                  min={-180}
                  onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })}
                  required
                  step="0.000001"
                  type="number"
                  value={form.longitude}
                />
              </label>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={() => updateCoordinates(defaultCoordinates.latitude, defaultCoordinates.longitude)}
            >
              <Crosshair size={17} />
              <span>Usar centro do Rio</span>
            </button>

            <label>
              Status
              <select
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as PropertyStatus })
                }
                value={form.status}
              >
                <option value="AVAILABLE">Disponível</option>
                <option value="NEGOTIATING">Em negociação</option>
                <option value="SOLD">Vendido/alugado</option>
              </select>
            </label>

            <div className="form-grid">
              <label>
                Telefone
                <input
                  onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                  type="tel"
                  value={form.contactPhone}
                />
              </label>

              <label>
                WhatsApp
                <input
                  onChange={(event) => setForm({ ...form, contactWhatsApp: event.target.value })}
                  type="tel"
                  value={form.contactWhatsApp}
                />
              </label>
            </div>

            <button className="primary-button" disabled={saving} type="submit">
              <Plus size={18} />
              <span>{saving ? 'Salvando...' : 'Criar imóvel'}</span>
            </button>
          </form>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">{properties.length} registros</span>
                <h2>Imóveis cadastrados</h2>
              </div>
            </div>

            {loading ? (
              <p className="empty-copy">Carregando imóveis...</p>
            ) : properties.length ? (
              <div className="compact-list property-admin-list">
                {properties.map((property) => (
                  <button
                    className="compact-row compact-row--button"
                    key={property.id}
                    onClick={() => updateCoordinates(property.latitude, property.longitude)}
                    type="button"
                  >
                    <div>
                      <strong>{property.title}</strong>
                      <span>
                        {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                      </span>
                    </div>
                    <StatusBadge value={property.status} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state empty-state--compact">
                <MapPin size={28} />
                <strong>Nenhum imóvel cadastrado</strong>
                <p>Os novos pontos criados nesta tela aparecem na lista e no mapa.</p>
              </div>
            )}
          </article>
        </div>

        <article className="panel property-map-panel property-map-card">
          <div className="panel-header property-map-heading">
            <div>
              <span className="eyebrow">Mapa interno</span>
              <h2>Localização dos imóveis</h2>
            </div>
            <StatusBadge value={form.status ?? 'AVAILABLE'} />
          </div>

          <div className="map-panel map-panel--embedded">
            <MapContainer
              center={[defaultCoordinates.latitude, defaultCoordinates.longitude]}
              className="smart-map"
              scrollWheelZoom
              zoom={12}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={updateCoordinates} />
              <SelectedLocationFocus latitude={form.latitude} longitude={form.longitude} />

              <CircleMarker
                center={[form.latitude, form.longitude]}
                fillColor="#027eca"
                fillOpacity={0.86}
                pathOptions={{ color: '#ffffff', opacity: 1, weight: 3 }}
                radius={9}
              >
                <Popup className="clean-map-popup">
                  <div className="map-popup">
                    <strong>Local selecionado</strong>
                    <span>
                      {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>

              {properties.map((property) => (
                <CircleMarker
                  center={[property.latitude, property.longitude]}
                  fillColor={statusColors[property.status]}
                  fillOpacity={0.92}
                  key={property.id}
                  pathOptions={{ color: '#ffffff', opacity: 1, weight: 2 }}
                  radius={7}
                >
                  <Popup className="clean-map-popup">
                    <div className="map-popup">
                      <strong>{property.title}</strong>
                      <StatusBadge value={property.status} />
                      <span>{property.contactPhone || property.contactWhatsApp || 'Sem contato'}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </article>
      </section>
    </div>
  )
}
