import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PoiApiError, searchPoisByBounds } from '../api/pois'
import { MIN_POI_ZOOM as DEFAULT_MIN_POI_ZOOM } from '../constants/pois'
import type { Poi, PoiCategory, PoiSearchBounds, PoiSearchCenter, PoiSearchState } from '../types/pois'

const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_DEBOUNCE_MS = 1200
const COOLDOWN_MS = 3 * 60 * 1000

let cooldownUntil = 0

interface UseNearbyPoisInput {
  enabled: boolean
  bounds: PoiSearchBounds | null
  paddedBounds?: PoiSearchBounds | null
  center: PoiSearchCenter | null
  categories: PoiCategory[]
  debounceMs?: number
  limit?: number
  minZoom?: number
  poisVisible?: boolean
  shouldSearchPois?: boolean
  shouldUsePois?: boolean
  zoom: number
}

interface PoiCacheEntry {
  boundsKey: string
  expiresAt: number
  pois: Poi[]
}

const poiCache = new Map<string, PoiCacheEntry>()

function roundCoordinate(value: number) {
  return value.toFixed(4)
}

function getSearchBounds(input: UseNearbyPoisInput) {
  return input.paddedBounds ?? input.bounds
}

function createBoundsKey(bounds: PoiSearchBounds) {
  return [
    roundCoordinate(bounds.south),
    roundCoordinate(bounds.west),
    roundCoordinate(bounds.north),
    roundCoordinate(bounds.east),
  ].join(',')
}

function createCacheKey(input: UseNearbyPoisInput, categoriesKey: string) {
  const bounds = getSearchBounds(input)
  if (!bounds) return ''

  return [
    categoriesKey,
    Math.round(input.zoom),
    createBoundsKey(bounds),
    input.limit ?? '',
  ].join('|')
}

function getCachedPois(cacheKey: string, boundsKey?: string) {
  const cached = poiCache.get(cacheKey)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    poiCache.delete(cacheKey)
    return null
  }

  if (boundsKey && cached.boundsKey !== boundsKey) {
    return null
  }

  return cached.pois
}

function setCachedPois(cacheKey: string, boundsKey: string, pois: Poi[]) {
  poiCache.set(cacheKey, {
    boundsKey,
    expiresAt: Date.now() + CACHE_TTL_MS,
    pois,
  })
}

function isCooldownActive() {
  return Date.now() < cooldownUntil
}

const emptyState: PoiSearchState = {
  empty: false,
  error: '',
  loading: false,
  pois: [],
}

function getDisabledReason(
  input: UseNearbyPoisInput,
  minZoom: number,
  searchBounds: PoiSearchBounds | null | undefined,
) {
  if (!input.enabled) {
    if (input.shouldUsePois === false) return 'pois-disabled-for-route'
    if (input.poisVisible === false) return 'pois-hidden'
    if (input.zoom < minZoom) return 'zoom-below-minimum'
    if (input.shouldSearchPois === false) return 'should-search-false'
    return 'enabled-flag-false'
  }

  if (input.zoom < minZoom) return 'zoom-below-minimum'
  if (!input.bounds) return 'missing-bounds'
  if (!searchBounds) return 'missing-search-bounds'
  if (!input.center) return 'missing-center'
  if (!input.categories.length) return 'no-categories'

  return ''
}

export function useNearbyPois(input: UseNearbyPoisInput): PoiSearchState & { refresh: () => void } {
  const [state, setState] = useState<PoiSearchState>(emptyState)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const lastResultBoundsKeyRef = useRef('')
  const categoriesKey = useMemo(
    () => [...input.categories].sort().join(','),
    [input.categories],
  )
  const cacheKey = useMemo(
    () => createCacheKey(input, categoriesKey),
    [categoriesKey, input.bounds, input.limit, input.paddedBounds, input.zoom],
  )

  useEffect(() => {
    const minZoom = input.minZoom ?? DEFAULT_MIN_POI_ZOOM
    const searchBounds = getSearchBounds(input)
    const disabledReason = getDisabledReason(input, minZoom, searchBounds)
    const searchBoundsKey = searchBounds ? createBoundsKey(searchBounds) : ''

    if (import.meta.env.DEV) {
      console.info('[POI_DEBUG] search input', {
        bounds: input.bounds,
        cacheKey,
        categories: input.categories,
        disabledReason,
        enabled: input.enabled,
        limit: input.limit,
        minZoom,
        paddedBounds: input.paddedBounds ?? null,
        zoom: input.zoom,
      })

      if (disabledReason) {
        console.info('[POI_DEBUG] search disabled', {
          enabled: input.enabled,
          hasBounds: Boolean(input.bounds),
          hasCategories: input.categories.length > 0,
          minZoom,
          poisVisible: input.poisVisible,
          reason: disabledReason,
          shouldSearchPois: input.shouldSearchPois,
          shouldUsePois: input.shouldUsePois,
          zoom: input.zoom,
        })
      }
    }

    if (disabledReason || !searchBounds || !input.center) {
      lastResultBoundsKeyRef.current = ''
      setState(emptyState)
      return
    }

    if (isCooldownActive()) {
      const cachedPois = getCachedPois(cacheKey, searchBoundsKey)
      setState((current) => ({
        empty: cachedPois
          ? cachedPois.length === 0
          : lastResultBoundsKeyRef.current === searchBoundsKey
            ? current.pois.length === 0
            : true,
        error: 'Locais indisponiveis no momento.',
        loading: false,
        pois: cachedPois ?? (lastResultBoundsKeyRef.current === searchBoundsKey ? current.pois : []),
      }))
      return
    }

    const searchCenter = input.center
    const cachedPois = getCachedPois(cacheKey, searchBoundsKey)
    if (cachedPois) {
      lastResultBoundsKeyRef.current = searchBoundsKey
      setState({
        empty: cachedPois.length === 0,
        error: '',
        loading: false,
        pois: cachedPois,
      })
      return
    }

    const abortController = new AbortController()
    const debounceMs = Math.max(input.debounceMs ?? DEFAULT_DEBOUNCE_MS, DEFAULT_DEBOUNCE_MS)
    const debounceId = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        error: '',
        loading: true,
      }))

      searchPoisByBounds(
        {
          bounds: searchBounds,
          categories: input.categories,
          center: searchCenter,
          limit: input.limit,
        },
        abortController.signal,
      )
        .then((pois) => {
          lastResultBoundsKeyRef.current = searchBoundsKey
          setCachedPois(cacheKey, searchBoundsKey, pois)
          setState({
            empty: pois.length === 0,
            error: '',
            loading: false,
            pois,
          })
        })
        .catch((caughtError) => {
          if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return

          if (caughtError instanceof PoiApiError && caughtError.status === 429) {
            cooldownUntil = Date.now() + COOLDOWN_MS
          }

          const cached = getCachedPois(cacheKey, searchBoundsKey)

          setState((current) => ({
            ...current,
            empty: cached
              ? cached.length === 0
              : lastResultBoundsKeyRef.current === searchBoundsKey
                ? current.pois.length === 0
                : true,
            error: isCooldownActive()
              ? 'Locais indisponiveis no momento.'
              : 'Pontos de interesse indisponiveis agora.',
            loading: false,
            pois: cached ?? (lastResultBoundsKeyRef.current === searchBoundsKey ? current.pois : []),
          }))
        })
    }, debounceMs)

    return () => {
      abortController.abort()
      window.clearTimeout(debounceId)
    }
  }, [
    cacheKey,
    categoriesKey,
    input.categories,
    input.bounds,
    input.center,
    input.debounceMs,
    input.enabled,
    input.limit,
    input.minZoom,
    input.paddedBounds,
    input.poisVisible,
    input.shouldSearchPois,
    input.shouldUsePois,
    input.zoom,
    refreshNonce,
  ])

  const refresh = useCallback(() => {
    if (cacheKey) {
      poiCache.delete(cacheKey)
    }

    setRefreshNonce((current) => current + 1)
  }, [cacheKey])

  return {
    ...state,
    refresh,
  }
}
