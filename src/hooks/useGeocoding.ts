import { useCallback, useRef, useState } from 'react'
import { searchCityLocations, searchLocation, type GeocodingResult } from '../api/geocoding'

export function useGeocoding() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GeocodingResult | null>(null)
  const [citySuggestions, setCitySuggestions] = useState<GeocodingResult[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [cityError, setCityError] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const cityAbortControllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (query: string) => {
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      setError('Digite uma cidade, bairro ou endereço.')
      setResult(null)
      return null
    }

    abortControllerRef.current?.abort()

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setLoading(true)
    setError('')

    try {
      const nextResult = await searchLocation(normalizedQuery, abortController.signal)

      if (!nextResult) {
        setResult(null)
        setError('Não encontramos esse local. Tente uma cidade, bairro ou endereço mais específico.')
        return null
      }

      setResult(nextResult)
      return nextResult
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        return null
      }

      setResult(null)
      setError('Não foi possível buscar esse local agora. Tente novamente.')
      return null
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
        setLoading(false)
      }
    }
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const searchCities = useCallback(async (query: string, limit = 6) => {
    const normalizedQuery = query.trim()

    cityAbortControllerRef.current?.abort()

    if (!normalizedQuery) {
      setCitySuggestions([])
      setCityError('')
      setCityLoading(false)
      return []
    }

    const abortController = new AbortController()
    cityAbortControllerRef.current = abortController
    setCityLoading(true)
    setCityError('')

    try {
      const nextSuggestions = await searchCityLocations(
        normalizedQuery,
        abortController.signal,
        limit,
      )

      setCitySuggestions(nextSuggestions)
      return nextSuggestions
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
        return []
      }

      setCitySuggestions([])
      setCityError('Não foi possível buscar cidades agora.')
      return []
    } finally {
      if (cityAbortControllerRef.current === abortController) {
        cityAbortControllerRef.current = null
        setCityLoading(false)
      }
    }
  }, [])

  const clearCitySuggestions = useCallback(() => {
    cityAbortControllerRef.current?.abort()
    cityAbortControllerRef.current = null
    setCitySuggestions([])
    setCityError('')
    setCityLoading(false)
  }, [])

  return {
    cityError,
    cityLoading,
    citySuggestions,
    clearCitySuggestions,
    clearError,
    error,
    loading,
    result,
    search,
    searchCities,
  }
}
