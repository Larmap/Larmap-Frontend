import { useCallback, useEffect, useMemo, useState } from 'react'
import { PoiApiError, searchPoisByCenter } from '../api/pois'
import type { Poi, PoiCategory, PoiSearchState } from '../types/pois'

const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_DEBOUNCE_MS = 1200
const COOLDOWN_MS = 3 * 60 * 1000

let cooldownUntil = 0

interface UseNearbyPoisInput {
  enabled: boolean
  center: {
    latitude: number
    longitude: number
  } | null
  radiusMeters: number
  categories: PoiCategory[]
  debounceMs?: number
  limit?: number
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
  if (!input.center) return ''

  return [
    categoriesKey,
    roundCoordinate(input.center.latitude),
    roundCoordinate(input.center.longitude),
    Math.round(input.radiusMeters),
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
    [categoriesKey, input.center, input.limit, input.radiusMeters],
  )

  useEffect(() => {
    if (!input.enabled || !input.center || !input.categories.length) {
      setState(emptyState)
      return
    }

    if (isCooldownActive()) {
      const cachedPois = getCachedPois(cacheKey)
      setState({
        empty: cachedPois ? cachedPois.length === 0 : true,
        error: 'Locais indisponiveis no momento.',
        loading: false,
        pois: cachedPois ?? [],
      })
      return
    }

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

      searchPoisByCenter(
        {
          categories: input.categories,
          center: searchCenter,
          limit: input.limit,
          radiusMeters: input.radiusMeters,
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
            empty: cached ? cached.length === 0 : true,
            error: isCooldownActive()
              ? 'Locais indisponiveis no momento.'
              : 'Pontos de interesse indisponiveis agora.',
            loading: false,
            pois: cached ?? [],
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
    input.center,
    input.debounceMs,
    input.enabled,
    input.limit,
    input.radiusMeters,
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
