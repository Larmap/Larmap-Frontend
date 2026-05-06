import { Loader2, Search, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useGeocoding } from '../hooks/useGeocoding'
import type { GeocodingResult } from '../api/geocoding'

interface CityAutocompleteProps {
  value: string
  selectedCity: GeocodingResult | null
  onChange: (value: string) => void
  onSelect: (city: GeocodingResult) => void
  onClear: () => void
  label?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  inputId?: string
}

function getCityKey(city: GeocodingResult) {
  return [
    city.city,
    city.stateCode,
    city.state,
    city.latitude.toFixed(5),
    city.longitude.toFixed(5),
  ].join('-')
}

export function CityAutocomplete({
  value,
  selectedCity,
  onChange,
  onSelect,
  onClear,
  label,
  placeholder = 'Buscar cidade',
  className = '',
  inputClassName = '',
  inputId,
}: CityAutocompleteProps) {
  const fallbackId = useId()
  const id = inputId ?? fallbackId
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const {
    cityError,
    cityLoading,
    citySuggestions,
    clearCitySuggestions,
    searchCities,
  } = useGeocoding()

  useEffect(() => {
    if (!isActive) return

    const query = value.trim()

    if (query.length < 2) {
      clearCitySuggestions()
      setIsOpen(false)
      return
    }

    const debounceId = window.setTimeout(() => {
      void searchCities(query, 8)
      setIsOpen(true)
      setHighlightedIndex(0)
    }, 300)

    return () => window.clearTimeout(debounceId)
  }, [clearCitySuggestions, isActive, searchCities, value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsActive(false)
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    return () => clearCitySuggestions()
  }, [clearCitySuggestions])

  function selectCity(city: GeocodingResult) {
    onSelect(city)
    setIsOpen(false)
    setIsActive(false)
    setHighlightedIndex(0)
  }

  function clearSelection() {
    onClear()
    clearCitySuggestions()
    setIsOpen(false)
    setIsActive(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsActive(true)
      setIsOpen(true)
      setHighlightedIndex((current) =>
        citySuggestions.length ? (current + 1) % citySuggestions.length : 0,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsActive(true)
      setIsOpen(true)
      setHighlightedIndex((current) =>
        citySuggestions.length
          ? (current - 1 + citySuggestions.length) % citySuggestions.length
          : 0,
      )
      return
    }

    if (event.key === 'Enter' && isOpen && citySuggestions[highlightedIndex]) {
      event.preventDefault()
      selectCity(citySuggestions[highlightedIndex])
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setIsActive(false)
    }
  }

  const selectedKey = selectedCity ? getCityKey(selectedCity) : ''
  const shouldShowEmpty =
    isOpen && value.trim().length >= 2 && !cityLoading && !cityError && citySuggestions.length === 0
  const wrapperClasses = [
    'city-autocomplete',
    selectedCity && value.trim() ? 'city-autocomplete--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses} ref={wrapperRef}>
      {label ? <label htmlFor={id}>{label}</label> : null}
      <div className="city-autocomplete__control">
        <Search size={16} />
        <input
          aria-activedescendant={
            isOpen && citySuggestions[highlightedIndex]
              ? `${id}-option-${highlightedIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-expanded={isOpen}
          aria-label={label ?? 'Buscar cidade'}
          className={inputClassName}
          id={id}
          onChange={(event) => {
            setIsActive(true)
            setIsOpen(true)
            onChange(event.target.value)
          }}
          onFocus={() => {
            setIsActive(true)
            if (citySuggestions.length || cityLoading || shouldShowEmpty) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          role="combobox"
          type="text"
          value={value}
        />
        {cityLoading ? <Loader2 className="spin" size={15} /> : null}
        {value ? (
          <button
            aria-label="Limpar cidade"
            className="city-autocomplete__clear"
            onClick={clearSelection}
            type="button"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="city-autocomplete__menu" id={`${id}-listbox`} role="listbox">
          {cityError ? <div className="city-autocomplete__message">{cityError}</div> : null}
          {cityLoading ? <div className="city-autocomplete__message">Buscando cidades...</div> : null}
          {shouldShowEmpty ? (
            <div className="city-autocomplete__message">Nenhuma cidade encontrada</div>
          ) : null}
          {!cityLoading && !cityError
            ? citySuggestions.map((city, index) => {
                const optionKey = getCityKey(city)
                const isSelected = selectedKey === optionKey
                const isHighlighted = highlightedIndex === index

                return (
                  <button
                    aria-selected={isSelected || isHighlighted}
                    className={[
                      'city-autocomplete__option',
                      isSelected ? 'city-autocomplete__option--selected' : '',
                      isHighlighted ? 'city-autocomplete__option--highlighted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    id={`${id}-option-${index}`}
                    key={optionKey}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectCity(city)}
                    role="option"
                    type="button"
                  >
                    <span>{city.label}</span>
                  </button>
                )
              })
            : null}
        </div>
      ) : null}
    </div>
  )
}
