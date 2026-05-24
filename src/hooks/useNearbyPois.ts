import { useCallback, useEffect, useMemo, useState } from 'react'
import { PoiApiError, searchPoisByBounds } from '../api/pois'
import type { Poi, PoiCategory, PoiSearchBounds, PoiSearchCenter, PoiSearchState } from '../types/pois'

const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_DEBOUNCE_MS = 1200
const COOLDOWN_MS = 3 * 60 * 1000

let cooldownUntil = 0

interface UseNearbyPoisInput {
  enabled: boolean
  bounds: PoiSearchBounds | null
  center: PoiSearchCenter | null
  categories: PoiCategory[]
  debounceMs?: number
  limit?: number
  zoom: number
}

interface PoiCacheEntry {
  expiresAt: number
  pois: Poi[]
}

const poiCache = new Map<string, PoiCacheEntry>()

function roundCoordinate(value: number) {
  return value.toFixed(3)
}

function createCacheKey(input: UseNearbyPoisInput, categoriesKey: string) {
  if (!input.bounds) return ''

  return [
    categoriesKey,
    Math.round(input.zoom),
    roundCoordinate(input.bounds.south),
    roundCoordinate(input.bounds.west),
    roundCoordinate(input.bounds.north),
    roundCoordinate(input.bounds.east),
    input.limit ?? '',
  ].join('|')
}

function getCachedPois(cacheKey: string) {
  const cached = poiCache.get(cacheKey)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    poiCache.delete(cacheKey)
    return null
  }

  return cached.pois
}

function setCachedPois(cacheKey: string, pois: Poi[]) {
  poiCache.set(cacheKey, {
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

export function useNearbyPois(input: UseNearbyPoisInput): PoiSearchState & { refresh: () => void } {
  const [state, setState] = useState<PoiSearchState>(emptyState)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const categoriesKey = useMemo(
    () => [...input.categories].sort().join(','),
    [input.categories],
  )
  const cacheKey = useMemo(
    () => createCacheKey(input, categoriesKey),
    [categoriesKey, input.bounds, input.limit, input.zoom],
  )

  useEffect(() => {
    if (!input.enabled || !input.bounds || !input.center || !input.categories.length) {
      setState(emptyState)
      return
    }

    if (isCooldownActive()) {
      const cachedPois = getCachedPois(cacheKey)
      setState((current) => ({
        empty: cachedPois ? cachedPois.length === 0 : current.pois.length === 0,
        error: 'Locais indisponiveis no momento.',
        loading: false,
        pois: cachedPois ?? current.pois,
      }))
      return
    }

    const searchBounds = input.bounds
    const searchCenter = input.center
    const cachedPois = getCachedPois(cacheKey)
    if (cachedPois) {
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
          setCachedPois(cacheKey, pois)
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

          const cached = getCachedPois(cacheKey)

          setState((current) => ({
            ...current,
            empty: cached ? cached.length === 0 : current.pois.length === 0,
            error: isCooldownActive()
              ? 'Locais indisponiveis no momento.'
              : 'Pontos de interesse indisponiveis agora.',
            loading: false,
            pois: cached ?? current.pois,
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
