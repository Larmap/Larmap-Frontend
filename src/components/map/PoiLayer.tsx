import { divIcon, type DivIcon, type LatLngBounds, type Map as LeafletMap } from 'leaflet'
import { Church, Dumbbell, Fuel, GraduationCap, Hospital, Pill, ShoppingBasket, Trees, Utensils } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Pane, Popup, useMap, useMapEvents } from 'react-leaflet'
import {
  allPoiCategories,
  POI_BOUNDS_PADDING,
  poiCategoryLabels,
  poiCategoryPriority,
} from '../../constants/pois'
import type { Poi, PoiCategory } from '../../types/pois'

const poiIconCache = new Map<PoiCategory, DivIcon>()
const POI_PANE_NAME = 'poi-pane'
const MOBILE_MEDIA_QUERY = '(max-width: 900px)'

const POI_ICON_SVGS: Record<PoiCategory, string> = {
  market: renderToStaticMarkup(
    <ShoppingBasket aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  fuel: renderToStaticMarkup(
    <Fuel aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  health: renderToStaticMarkup(
    <Hospital aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  pharmacy: renderToStaticMarkup(
    <Pill aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  food: renderToStaticMarkup(
    <Utensils aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  education: renderToStaticMarkup(
    <GraduationCap aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  fitness: renderToStaticMarkup(
    <Dumbbell aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  leisure: renderToStaticMarkup(
    <Trees aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
  ),
  religion: renderToStaticMarkup(
    <Church aria-hidden="true" className="poi-map-marker__svg" size={15} strokeWidth={2.2} />,
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

interface PoiFilterResult {
  afterBoundsFilter: number
  afterDedupe: number
  afterGrid: number
  pois: Poi[]
}

interface MapPixelSize {
  x: number
  y: number
}

const POI_DENSITY_PRESETS: Array<{
  maxZoom: number
  desktop: PoiRenderConfig
  mobile: PoiRenderConfig
}> = [
  {
    maxZoom: 13,
    desktop: {
      grid: { rows: 8, cols: 10 },
      maxPerCell: 3,
      maxTotal: 120,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 6, cols: 7 },
      maxPerCell: 3,
      maxTotal: 80,
      requireName: false,
      dedupePrecision: 5,
    },
  },
  {
    maxZoom: 14,
    desktop: {
      grid: { rows: 10, cols: 12 },
      maxPerCell: 4,
      maxTotal: 190,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 8, cols: 8 },
      maxPerCell: 4,
      maxTotal: 115,
      requireName: false,
      dedupePrecision: 5,
    },
  },
  {
    maxZoom: 15,
    desktop: {
      grid: { rows: 12, cols: 16 },
      maxPerCell: 5,
      maxTotal: 300,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 10, cols: 10 },
      maxPerCell: 4,
      maxTotal: 170,
      requireName: false,
      dedupePrecision: 5,
    },
  },
  {
    maxZoom: 16,
    desktop: {
      grid: { rows: 14, cols: 18 },
      maxPerCell: 5,
      maxTotal: 360,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 11, cols: 11 },
      maxPerCell: 5,
      maxTotal: 220,
      requireName: false,
      dedupePrecision: 5,
    },
  },
  {
    maxZoom: Number.POSITIVE_INFINITY,
    desktop: {
      grid: { rows: 16, cols: 20 },
      maxPerCell: 6,
      maxTotal: 420,
      requireName: false,
      dedupePrecision: 5,
    },
    mobile: {
      grid: { rows: 12, cols: 12 },
      maxPerCell: 5,
      maxTotal: 260,
      requireName: false,
      dedupePrecision: 5,
    },
  },
]

const POI_HOME_LIMITS = {
  desktop: {
    grid: { rows: 8, cols: 10 },
    maxPerCell: 3,
    maxTotal: 56,
  },
  mobile: {
    grid: { rows: 7, cols: 7 },
    maxPerCell: 3,
    maxTotal: 44,
  },
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
    iconAnchor: [13, 13],
    iconSize: [26, 26],
    popupAnchor: [0, -12],
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
    grid: limits.grid,
    maxPerCell: limits.maxPerCell,
    maxTotal: limits.maxTotal,
    requireName: false,
    dedupePrecision: 5,
  }
}

function scaleRenderConfigForMapSize(
  config: PoiRenderConfig,
  densityMode: PoiDensityMode,
  isMobile: boolean,
  mapSize: MapPixelSize,
): PoiRenderConfig {
  if (densityMode === 'home' || !config.grid) return config

  const mapArea = Math.max(1, mapSize.x * mapSize.y)
  const baseArea = isMobile ? 390 * 560 : 1100 * 720
  const densityScale = Math.min(1.8, Math.max(1, mapArea / baseArea))
  const axisScale = Math.sqrt(densityScale)

  return {
    ...config,
    grid: {
      cols: Math.max(config.grid.cols, Math.round(config.grid.cols * axisScale)),
      rows: Math.max(config.grid.rows, Math.round(config.grid.rows * axisScale)),
    },
    maxPerCell: densityScale > 1.35 ? config.maxPerCell + 1 : config.maxPerCell,
    maxTotal: Math.round(config.maxTotal * densityScale),
  }
}

function getPoiRenderConfig(
  zoom: number,
  isMobile: boolean,
  densityMode: PoiDensityMode,
  mapSize: MapPixelSize,
): PoiRenderConfig {
  const safeZoom = Number.isFinite(zoom) ? zoom : 15
  const preset = POI_DENSITY_PRESETS.find((item) => safeZoom <= item.maxZoom) ?? POI_DENSITY_PRESETS[0]
  const baseConfig = isMobile ? preset.mobile : preset.desktop
  return scaleRenderConfigForMapSize(
    applyDensityMode(baseConfig, densityMode, isMobile),
    densityMode,
    isMobile,
    mapSize,
  )
}

function roundCoordinate(value: number, precision: number) {
  return value.toFixed(precision)
}

function pickPoisFromCell(bucket: Poi[], maxPerCell: number) {
  const picked: Poi[] = []
  const pickedIds = new Set<string>()
  const pickedCategories = new Set<PoiCategory>()

  for (const poi of bucket) {
    if (picked.length >= maxPerCell) break
    if (pickedCategories.has(poi.category)) continue

    picked.push(poi)
    pickedIds.add(poi.id)
    pickedCategories.add(poi.category)
  }

  for (const poi of bucket) {
    if (picked.length >= maxPerCell) break
    if (pickedIds.has(poi.id)) continue

    picked.push(poi)
    pickedIds.add(poi.id)
  }

  return picked
}

function getPoiCategoryCounts(pois: Poi[]) {
  const categoryCounts = allPoiCategories.reduce((counts, category) => {
    counts[category] = 0
    return counts
  }, {} as Record<PoiCategory, number>)

  for (const poi of pois) {
    categoryCounts[poi.category] += 1
  }

  return categoryCounts
}

function getLatLngBoundsSnapshot(bounds: LatLngBounds | null) {
  if (!bounds) return null

  return {
    east: bounds.getEast(),
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    west: bounds.getWest(),
  }
}

function filterPoisByGrid(pois: Poi[], config: PoiRenderConfig, bounds: LatLngBounds | null): PoiFilterResult {
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

  if (!normalized.length) {
    return {
      afterBoundsFilter: 0,
      afterDedupe: 0,
      afterGrid: 0,
      pois: normalized,
    }
  }

  if (!bounds || !config.grid) {
    const ordered = [...normalized].sort(comparePois)
    const visiblePois = ordered.slice(0, config.maxTotal)

    return {
      afterBoundsFilter: normalized.length,
      afterDedupe: normalized.length,
      afterGrid: visiblePois.length,
      pois: visiblePois,
    }
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
  let afterBoundsFilter = 0

  for (const poi of normalized) {
    if (poi.latitude < south || poi.latitude > north || poi.longitude < west || poi.longitude > east) {
      continue
    }

    afterBoundsFilter += 1

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

  const bucketGroups = Array.from(buckets.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([, bucket]) => bucket.sort(comparePois))

  const cellSelections = bucketGroups.map((bucket) => pickPoisFromCell(bucket, config.maxPerCell))
  const distributed: Poi[] = []
  for (let index = 0; index < config.maxPerCell && distributed.length < config.maxTotal; index += 1) {
    const layer = cellSelections
      .map((selection) => selection[index])
      .filter((poi): poi is Poi => Boolean(poi))

    distributed.push(...layer.slice(0, config.maxTotal - distributed.length))
  }

  return {
    afterBoundsFilter,
    afterDedupe: normalized.length,
    afterGrid: distributed.length,
    pois: distributed,
  }
}

function getInitialMobileState() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function getMapSizeSnapshot(map: LeafletMap): MapPixelSize {
  const size = map.getSize()

  return {
    x: size.x,
    y: size.y,
  }
}

function getMapStateSnapshot(map: LeafletMap) {
  const bounds = map.getBounds()

  return {
    bounds,
    paddedBounds: bounds.pad(POI_BOUNDS_PADDING),
    size: getMapSizeSnapshot(map),
    zoom: map.getZoom(),
  }
}

export function PoiLayer({ pois, densityMode = 'map', onVisibleCountChange }: PoiLayerProps) {
  const map = useMap()
  const getCurrentMapState = useCallback(() => getMapStateSnapshot(map), [map])
  const [mapState, setMapState] = useState(() => getMapStateSnapshot(map))
  const [isMobile, setIsMobile] = useState(getInitialMobileState)
  const lastCountRef = useRef<number | null>(null)

  useMapEvents({
    moveend: () => {
      setMapState(getCurrentMapState())
    },
    resize: () => {
      setMapState(getCurrentMapState())
    },
    zoomend: () => {
      setMapState(getCurrentMapState())
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
    () => getPoiRenderConfig(mapState.zoom, isMobile, densityMode, mapState.size),
    [densityMode, isMobile, mapState.size, mapState.zoom],
  )
  const filterResult = useMemo(
    () => filterPoisByGrid(pois, renderConfig, mapState.paddedBounds),
    [mapState.paddedBounds, pois, renderConfig],
  )
  const visiblePois = filterResult.pois
  const visibleCategoryCounts = useMemo(() => getPoiCategoryCounts(visiblePois), [visiblePois])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    console.info('[POI_DEBUG] poi render pipeline', {
      afterBoundsFilter: filterResult.afterBoundsFilter,
      afterDedupe: filterResult.afterDedupe,
      afterGrid: filterResult.afterGrid,
      bounds: getLatLngBoundsSnapshot(mapState.bounds),
      categoryCounts: visibleCategoryCounts,
      gridRemoved: Math.max(0, filterResult.afterBoundsFilter - filterResult.afterGrid),
      mapSize: mapState.size,
      paddedBounds: getLatLngBoundsSnapshot(mapState.paddedBounds),
      received: pois.length,
      renderConfig,
      visible: visiblePois.length,
      zoom: mapState.zoom,
    })

    console.info('[POI_DEBUG] rendered category counts', {
      categoryCounts: visibleCategoryCounts,
      total: visiblePois.length,
    })
  }, [
    filterResult,
    mapState.bounds,
    mapState.paddedBounds,
    mapState.size,
    mapState.zoom,
    pois.length,
    renderConfig,
    visibleCategoryCounts,
    visiblePois.length,
  ])

  useEffect(() => {
    if (!onVisibleCountChange) return
    if (lastCountRef.current === visiblePois.length) return
    lastCountRef.current = visiblePois.length
    onVisibleCountChange(visiblePois.length)
  }, [onVisibleCountChange, visiblePois.length])

  if (!visiblePois.length) return null

  return (
    <Pane className="poi-pane" name={POI_PANE_NAME} style={{ zIndex: 390 }}>
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
