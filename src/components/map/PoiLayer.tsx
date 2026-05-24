import { divIcon, type DivIcon, type LatLngBounds } from 'leaflet'
import { Fuel, GraduationCap, Hospital, Store, Trees, Utensils } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Pane, Popup, useMap, useMapEvents } from 'react-leaflet'
import { poiCategoryLabels, poiCategoryPriority } from '../../constants/pois'
import type { Poi, PoiCategory } from '../../types/pois'

const poiIconCache = new Map<PoiCategory, DivIcon>()
const POI_PANE_NAME = 'poi-pane'
const MOBILE_MEDIA_QUERY = '(max-width: 900px)'

const POI_ICON_SVGS: Record<PoiCategory, string> = {
  market: renderToStaticMarkup(
    <Store aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
  fuel: renderToStaticMarkup(
    <Fuel aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
  health: renderToStaticMarkup(
    <Hospital aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
  food: renderToStaticMarkup(
    <Utensils aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
  education: renderToStaticMarkup(
    <GraduationCap aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
  leisure: renderToStaticMarkup(
    <Trees aria-hidden="true" className="poi-map-marker__svg" size={14} strokeWidth={2} />,
  ),
}

type PoiDensityMode = 'home' | 'map'

interface PoiLayerProps {
  pois: Poi[]
  densityMode?: PoiDensityMode
  onVisibleCountChange?: (count: number) => void
}

interface PoiGridConfig {
  rows: number
  cols: number
}

interface PoiRenderConfig {
  grid: PoiGridConfig | null
  maxPerCell: number
  maxTotal: number
  requireName: boolean
  dedupePrecision: number
}

const POI_DENSITY_PRESETS: Array<{
  maxZoom: number
  desktop: PoiRenderConfig
  mobile: PoiRenderConfig
}> = [
  {
    maxZoom: 15,
    desktop: {
      grid: { rows: 5, cols: 6 },
      maxPerCell: 2,
      maxTotal: 40,
      requireName: true,
      dedupePrecision: 4,
    },
    mobile: {
      grid: { rows: 4, cols: 4 },
      maxPerCell: 1,
      maxTotal: 24,
      requireName: true,
      dedupePrecision: 4,
    },
  },
  {
    maxZoom: 16,
    desktop: {
      grid: { rows: 6, cols: 7 },
      maxPerCell: 2,
      maxTotal: 45,
      requireName: false,
      dedupePrecision: 4,
    },
    mobile: {
      grid: { rows: 5, cols: 5 },
      maxPerCell: 2,
      maxTotal: 30,
      requireName: false,
      dedupePrecision: 4,
    },
  },
  {
    maxZoom: Number.POSITIVE_INFINITY,
    desktop: {
      grid: { rows: 7, cols: 8 },
      maxPerCell: 3,
      maxTotal: 50,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 6, cols: 6 },
      maxPerCell: 2,
      maxTotal: 34,
      requireName: false,
      dedupePrecision: 5,
    },
  },
]

const POI_HOME_LIMITS = {
  desktop: { maxPerCell: 1, maxTotal: 24 },
  mobile: { maxPerCell: 1, maxTotal: 18 },
}

function getPoiIcon(category: PoiCategory) {
  const cached = poiIconCache.get(category)
  if (cached) return cached

  const icon = divIcon({
    className: 'poi-map-marker-shell',
    html: `
      <div class="poi-map-marker poi-map-marker--${category}">
        ${POI_ICON_SVGS[category]}
      </div>
    `,
    iconAnchor: [11, 11],
    iconSize: [22, 22],
    popupAnchor: [0, -10],
  })

  poiIconCache.set(category, icon)
  return icon
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

function comparePois(a: Poi, b: Poi) {
  const nameA = normalizePoiName(a.name)
  const nameB = normalizePoiName(b.name)
  const hasNameA = nameA.length > 0
  const hasNameB = nameB.length > 0

  if (hasNameA !== hasNameB) return hasNameA ? -1 : 1

  const priorityA = poiCategoryPriority[a.category] ?? 99
  const priorityB = poiCategoryPriority[b.category] ?? 99
  if (priorityA !== priorityB) return priorityA - priorityB

  const distanceA = a.distanceMeters ?? Number.POSITIVE_INFINITY
  const distanceB = b.distanceMeters ?? Number.POSITIVE_INFINITY
  if (distanceA !== distanceB) return distanceA - distanceB

  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

function applyDensityMode(
  config: PoiRenderConfig,
  densityMode: PoiDensityMode,
  isMobile: boolean,
): PoiRenderConfig {
  if (densityMode !== 'home') return config

  const limits = isMobile ? POI_HOME_LIMITS.mobile : POI_HOME_LIMITS.desktop
  return {
    ...config,
    maxPerCell: Math.min(config.maxPerCell, limits.maxPerCell),
    maxTotal: Math.min(config.maxTotal, limits.maxTotal),
    requireName: true,
  }
}

function getPoiRenderConfig(
  zoom: number,
  isMobile: boolean,
  densityMode: PoiDensityMode,
): PoiRenderConfig {
  const safeZoom = Number.isFinite(zoom) ? zoom : 15
  const preset = POI_DENSITY_PRESETS.find((item) => safeZoom <= item.maxZoom) ?? POI_DENSITY_PRESETS[0]
  const baseConfig = isMobile ? preset.mobile : preset.desktop
  return applyDensityMode(baseConfig, densityMode, isMobile)
}

function roundCoordinate(value: number, precision: number) {
  return value.toFixed(precision)
}

function filterPoisByGrid(pois: Poi[], config: PoiRenderConfig, bounds: LatLngBounds | null) {
  const normalized: Poi[] = []
  const seen = new Set<string>()

  for (const poi of pois) {
    const nameKey = normalizePoiName(poi.name)
    if (config.requireName && !nameKey) continue

    const dedupeKey = [
      poi.category,
      roundCoordinate(poi.latitude, config.dedupePrecision),
      roundCoordinate(poi.longitude, config.dedupePrecision),
      nameKey || 'sem-nome',
    ].join('|')

    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(poi)
  }

  if (!normalized.length) return normalized

  if (!bounds || !config.grid) {
    const ordered = [...normalized].sort(comparePois)
    return ordered.slice(0, config.maxTotal)
  }

  const north = bounds.getNorth()
  const south = bounds.getSouth()
  const east = bounds.getEast()
  const west = bounds.getWest()
  const latSpan = Math.max(0.000001, north - south)
  const lngSpan = Math.max(0.000001, east - west)
  const latStep = latSpan / config.grid.rows
  const lngStep = lngSpan / config.grid.cols
  const buckets = new Map<string, Poi[]>()

  for (const poi of normalized) {
    if (poi.latitude < south || poi.latitude > north || poi.longitude < west || poi.longitude > east) {
      continue
    }
    const row = Math.min(
      config.grid.rows - 1,
      Math.max(0, Math.floor((poi.latitude - south) / latStep)),
    )
    const col = Math.min(
      config.grid.cols - 1,
      Math.max(0, Math.floor((poi.longitude - west) / lngStep)),
    )
    const key = `${row}:${col}`
    const bucket = buckets.get(key)

    if (bucket) {
      bucket.push(poi)
    } else {
      buckets.set(key, [poi])
    }
  }

  const clustered: Poi[] = []
  for (const bucket of buckets.values()) {
    bucket.sort(comparePois)
    clustered.push(...bucket.slice(0, config.maxPerCell))
  }

  clustered.sort(comparePois)
  return clustered.slice(0, config.maxTotal)
}

function getInitialMobileState() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

export function PoiLayer({ pois, densityMode = 'map', onVisibleCountChange }: PoiLayerProps) {
  const map = useMap()
  const [mapState, setMapState] = useState(() => ({
    zoom: map.getZoom(),
    bounds: map.getBounds(),
  }))
  const [isMobile, setIsMobile] = useState(getInitialMobileState)
  const lastCountRef = useRef<number | null>(null)

  useMapEvents({
    zoomend: () => {
      setMapState({
        zoom: map.getZoom(),
        bounds: map.getBounds(),
      })
    },
    moveend: () => {
      setMapState({
        zoom: map.getZoom(),
        bounds: map.getBounds(),
      })
    },
  })

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY)
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)

    if (media.addEventListener) {
      media.addEventListener('change', handler)
    } else {
      media.addListener(handler)
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler)
      } else {
        media.removeListener(handler)
      }
    }
  }, [])

  const renderConfig = useMemo(
    () => getPoiRenderConfig(mapState.zoom, isMobile, densityMode),
    [densityMode, isMobile, mapState.zoom],
  )
  const visiblePois = useMemo(
    () => filterPoisByGrid(pois, renderConfig, mapState.bounds),
    [mapState.bounds, pois, renderConfig],
  )

  useEffect(() => {
    if (!onVisibleCountChange) return
    if (lastCountRef.current === visiblePois.length) return
    lastCountRef.current = visiblePois.length
    onVisibleCountChange(visiblePois.length)
  }, [onVisibleCountChange, visiblePois.length])

  if (!visiblePois.length) return null

  return (
    <Pane className="poi-pane" name={POI_PANE_NAME} style={{ zIndex: 420 }}>
      {visiblePois.map((poi) => {
        const distanceLabel = formatDistance(poi.distanceMeters)
        const trimmedName = poi.name.trim()
        const displayName = trimmedName || poiCategoryLabels[poi.category]

        return (
          <Marker
            icon={getPoiIcon(poi.category)}
            key={poi.id}
            pane={POI_PANE_NAME}
            position={[poi.latitude, poi.longitude]}
          >
            <Popup className="clean-map-popup">
              <div className="poi-map-popup">
                <strong>{displayName}</strong>
                {trimmedName ? <span>{poiCategoryLabels[poi.category]}</span> : null}
                {distanceLabel ? <small>{distanceLabel}</small> : null}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </Pane>
  )
}
