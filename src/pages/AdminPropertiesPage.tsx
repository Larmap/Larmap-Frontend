import {
  Building2,
  Camera,
  Edit3,
  Home,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  Video,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { ApiError, propertiesApi } from '../api/client'
import { getErrorMessage } from '../api/errors'
import type { GeocodingResult } from '../api/geocoding'
import { formatBrazilPostalCode, lookupBrazilPostalCode, onlyDigits } from '../api/postalCode'
import { useAdminWorkspace } from '../components/AdminShell'
import { CityAutocomplete } from '../components/CityAutocomplete'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useGeocoding } from '../hooks/useGeocoding'
import type { CreatePropertyInput, Property, PropertyStatus, User } from '../types/api'

const defaultCoordinates = {
  latitude: -22.9068,
  longitude: -43.1729,
}

const LOCAL_ADMIN_PROPERTIES_KEY = 'smartmap.admin.localProperties'

type ListingType = 'sale' | 'rent'
type PostalCodeStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error'
type PropertyMediaKind = 'image' | 'video'

interface LocalMediaUpload {
  file: File
  id: string
  kind: PropertyMediaKind
  previewUrl: string
}

interface LocalPropertyMedia {
  fileName: string
  kind: PropertyMediaKind
  lastModified: number
  mimeType: string
  size: number
  url: string
}

const brazilStates = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
]

interface PropertyFormState {
  title: string
  description: string
  propertyType: string
  listingType: ListingType
  price: string
  bedrooms: string
  bathrooms: string
  parkingSpots: string
  status: PropertyStatus
  street: string
  addressNumber: string
  buildingName: string
  apartmentNumber: string
  complement: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  agentId: string
  imageUrlsText: string
  videoUrlsText: string
  mediaUploads: LocalMediaUpload[]
  contactPhone: string
  contactWhatsApp: string
  latitude: number
  longitude: number
}

function createEmptyForm(): PropertyFormState {
  return {
    title: '',
    description: '',
    propertyType: 'apartamento',
    listingType: 'sale',
    price: '',
    bedrooms: '',
    bathrooms: '',
    parkingSpots: '',
    status: 'AVAILABLE',
    street: '',
    addressNumber: '',
    buildingName: '',
    apartmentNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    agentId: '',
    imageUrlsText: '',
    videoUrlsText: '',
    mediaUploads: [],
    contactPhone: '',
    contactWhatsApp: '',
    latitude: defaultCoordinates.latitude,
    longitude: defaultCoordinates.longitude,
  }
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinMedia(values?: string[] | null) {
  return Array.isArray(values) ? values.filter(Boolean).join('\n') : ''
}

function getPropertyImages(property: Property) {
  return property.imageUrls ?? property.images ?? property.photos ?? []
}

function getPropertyVideos(property: Property) {
  return property.videoUrls ?? property.videos ?? []
}

function getMediaKind(file: File): PropertyMediaKind | null {
  const name = file.name.toLowerCase()

  if (file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/.test(name)) {
    return 'image'
  }

  if (file.type === 'video/mp4' || name.endsWith('.mp4')) {
    return 'video'
  }

  return null
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

function revokeMediaUploads(uploads: LocalMediaUpload[]) {
  uploads.forEach((upload) => URL.revokeObjectURL(upload.previewUrl))
}

function createLocalMediaFromUploads(uploads: LocalMediaUpload[]): LocalPropertyMedia[] {
  return uploads.map((upload) => ({
    fileName: upload.file.name,
    kind: upload.kind,
    lastModified: upload.file.lastModified,
    mimeType: upload.file.type || (upload.kind === 'image' ? 'image/jpeg' : 'video/mp4'),
    size: upload.file.size,
    url: URL.createObjectURL(upload.file),
  }))
}

function mergeUniqueMediaUrls(primary: string[], secondary: string[]) {
  return Array.from(new Set([...primary, ...secondary].filter(Boolean)))
}

function enrichPropertyWithLocalMedia(property: Property, media: LocalPropertyMedia[]) {
  if (!media.length) return property

  const localImages = media.filter((item) => item.kind === 'image').map((item) => item.url)
  const localVideos = media.filter((item) => item.kind === 'video').map((item) => item.url)
  const imageUrls = mergeUniqueMediaUrls(getPropertyImages(property), localImages)
  const videoUrls = mergeUniqueMediaUrls(getPropertyVideos(property), localVideos)

  return {
    ...property,
    images: imageUrls,
    imageUrls,
    media: [
      ...(property.media ?? []),
      ...media.map((item) => ({
        src: item.url,
        type: item.kind,
        url: item.url,
      })),
    ],
    mediaFiles: [
      ...(property.mediaFiles ?? []),
      ...media.map((item) => ({
        fileName: item.fileName,
        lastModified: item.lastModified,
        mimeType: item.mimeType,
        size: item.size,
        type: item.kind,
      })),
    ],
    videos: videoUrls,
    videoUrls,
  }
}

function getPropertyAddress(property: Property) {
  return (
    property.address ||
    property.endereco ||
    [
      property.street || property.streetName,
      property.addressNumber || property.number,
      property.neighborhood || property.bairro || property.district,
      property.city || property.cidade,
      property.state || property.stateCode || property.uf,
      property.postalCode || property.cep,
    ]
      .filter(Boolean)
      .join(', ')
  )
}

function getPropertyAgentLabel(property: Property, agents: User[]) {
  const agentId = property.agentId || property.responsibleAgentId
  const agentName = property.agentName || property.responsibleAgentName
  if (agentName) return agentName
  return agents.find((agent) => agent.id === agentId)?.name ?? 'Sem corretor definido'
}

function buildFullAddress(form: PropertyFormState) {
  return [
    `${form.street}${form.addressNumber ? `, ${form.addressNumber}` : ''}`,
    form.buildingName ? `Edifício ${form.buildingName}` : '',
    form.apartmentNumber ? `Apartamento ${form.apartmentNumber}` : '',
    form.neighborhood,
    form.city,
    form.state,
    form.postalCode,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function getCurrencyWholeDigits(value: string) {
  const withoutCurrency = value.replace(/^R\$\s?/, '')
  const [integerPart = '', decimalPart = ''] = withoutCurrency.split(',')
  const extraTypedAfterCents = decimalPart.length > 2 ? decimalPart.slice(2).replace(/\D/g, '') : ''

  return `${integerPart.replace(/\D/g, '')}${extraTypedAfterCents}`.replace(/^0+(?=\d)/, '')
}

function formatCurrencyInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      currency: 'BRL',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(value)
  }

  const rawValue = String(value)
  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    return new Intl.NumberFormat('pt-BR', {
      currency: 'BRL',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: 'currency',
    }).format(Number(rawValue))
  }

  const digits = getCurrencyWholeDigits(rawValue)
  if (!digits) return ''

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number(digits))
}

function currencyNumberOrUndefined(value: string) {
  const digits = getCurrencyWholeDigits(value)
  if (!digits) return undefined
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getStateCode(value: string) {
  const normalizedValue = normalizeText(value.replace(/\s*-\s*.*/, ''))
  if (!normalizedValue) return ''

  const exactMatch = brazilStates.find(
    (state) =>
      normalizeText(state.code) === normalizedValue ||
      normalizeText(state.name) === normalizedValue,
  )
  if (exactMatch) return exactMatch.code

  const partialMatch =
    normalizedValue.length >= 3
      ? brazilStates.find((state) => normalizeText(state.name).startsWith(normalizedValue))
      : undefined
  return partialMatch?.code ?? value.trim().toUpperCase()
}

function getStateName(value: string) {
  const stateCode = getStateCode(value)
  return brazilStates.find((state) => state.code === stateCode)?.name ?? value
}

function buildGeocodingQueries(form: PropertyFormState) {
  const stateName = getStateName(form.state)
  const stateCode = getStateCode(form.state)
  const cityState = [form.city, stateName || stateCode, 'Brasil'].filter(Boolean).join(', ')
  const streetAddress = [
    `${form.street}${form.addressNumber ? `, ${form.addressNumber}` : ''}`,
    form.neighborhood,
    cityState,
  ]
    .filter(Boolean)
    .join(', ')
  const neighborhoodAddress = [form.neighborhood, cityState].filter(Boolean).join(', ')

  return Array.from(new Set([streetAddress, neighborhoodAddress, cityState].filter(Boolean)))
}

function readLocalAdminProperties() {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_PROPERTIES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Property[]
  } catch {
    return []
  }
}

function writeLocalAdminProperties(properties: Property[]) {
  localStorage.setItem(LOCAL_ADMIN_PROPERTIES_KEY, JSON.stringify(properties.slice(0, 80)))
}

function mergePropertyLists(remoteProperties: Property[], localProperties: Property[]) {
  const byId = new Map<string, Property>()

  localProperties.forEach((property) => byId.set(property.id, property))
  remoteProperties.forEach((property) => byId.set(property.id, property))

  return Array.from(byId.values()).sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

function upsertLocalAdminProperty(property: Property) {
  const nextProperties = [
    property,
    ...readLocalAdminProperties().filter((item) => item.id !== property.id),
  ]

  writeLocalAdminProperties(nextProperties)
  return nextProperties
}

function removeLocalAdminProperty(propertyId: string) {
  const nextProperties = readLocalAdminProperties().filter((item) => item.id !== propertyId)
  writeLocalAdminProperties(nextProperties)
  return nextProperties
}

export function AdminPropertiesPage() {
  const { token } = useAuth()
  const { properties, propertyPerformance, reload, users } = useAdminWorkspace()
  const [localProperties, setLocalProperties] = useState<Property[]>(properties)
  const [form, setForm] = useState<PropertyFormState>(() => createEmptyForm())
  const [editingId, setEditingId] = useState('')
  const [mediaInputKey, setMediaInputKey] = useState(0)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedCity, setSelectedCity] = useState<GeocodingResult | null>(null)
  const [postalCodeStatus, setPostalCodeStatus] = useState<PostalCodeStatus>('idle')
  const mediaUploadsRef = useRef<LocalMediaUpload[]>([])
  const { loading: geocoding, search: geocodeLocation } = useGeocoding()

  const agents = useMemo(
    () => users.filter((user) => user.role === 'agent' || user.role === 'manager'),
    [users],
  )

  useEffect(() => {
    setLocalProperties(mergePropertyLists(properties, readLocalAdminProperties()))
  }, [properties])

  useEffect(() => {
    mediaUploadsRef.current = form.mediaUploads
  }, [form.mediaUploads])

  useEffect(
    () => () => {
      revokeMediaUploads(mediaUploadsRef.current)
    },
    [],
  )

  useEffect(() => {
    const postalCodeDigits = onlyDigits(form.postalCode)

    if (!postalCodeDigits) {
      setPostalCodeStatus('idle')
      return
    }

    if (postalCodeDigits.length < 8) {
      setPostalCodeStatus('idle')
      return
    }

    const abortController = new AbortController()
    const debounceId = window.setTimeout(() => {
      setPostalCodeStatus('loading')

      lookupBrazilPostalCode(postalCodeDigits, abortController.signal)
        .then((postalCode) => {
          if (!postalCode) {
            setPostalCodeStatus('not-found')
            return
          }

          setPostalCodeStatus('found')
          setSelectedCity(null)
          setForm((current) => ({
            ...current,
            city: postalCode.city || current.city,
            neighborhood: current.neighborhood || postalCode.neighborhood,
            postalCode: postalCode.postalCode,
            state: postalCode.state || current.state,
            street: current.street || postalCode.street,
          }))

          if (postalCode.city && postalCode.state) {
            void geocodeLocation(`${postalCode.city}, ${postalCode.state}, Brasil`).then((result) => {
              if (!result) return
              setSelectedCity(result)
              setForm((current) => ({
                ...current,
                latitude: result.latitude,
                longitude: result.longitude,
              }))
            })
          }
        })
        .catch((caughtError) => {
          if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return
          setPostalCodeStatus('error')
        })
    }, 350)

    return () => {
      abortController.abort()
      window.clearTimeout(debounceId)
    }
  }, [form.postalCode, geocodeLocation])

  function updateForm(next: Partial<PropertyFormState>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function resetForm() {
    setForm((current) => {
      revokeMediaUploads(current.mediaUploads)
      return createEmptyForm()
    })
    setEditingId('')
    setMediaInputKey((current) => current + 1)
    setSelectedCity(null)
    setPostalCodeStatus('idle')
    setError('')
  }

  function startEditing(property: Property) {
    setEditingId(property.id)
    setMediaInputKey((current) => current + 1)
    setForm((current) => {
      revokeMediaUploads(current.mediaUploads)

      return {
        title: property.title,
        description: property.description ?? '',
        propertyType: property.propertyType ?? property.realEstateType ?? property.tipoImovel ?? property.type ?? 'apartamento',
        listingType: /alug|rent/i.test(property.listingType ?? property.transactionType ?? property.purpose ?? '')
          ? 'rent'
          : 'sale',
        price: formatCurrencyInput(property.price),
        bedrooms: property.bedrooms ? String(property.bedrooms) : '',
        bathrooms: property.bathrooms ? String(property.bathrooms) : '',
        parkingSpots: property.parkingSpots ? String(property.parkingSpots) : '',
        status: property.status,
        street: property.street ?? property.streetName ?? property.address ?? property.endereco ?? '',
        addressNumber: property.addressNumber ?? property.number ?? '',
        buildingName: property.buildingName ?? property.condominiumName ?? '',
        apartmentNumber: property.apartmentNumber ?? '',
        complement: property.complement ?? '',
        neighborhood: property.neighborhood ?? property.bairro ?? property.district ?? '',
        city: property.city ?? property.cidade ?? '',
        state: property.state ?? property.stateCode ?? property.uf ?? '',
        postalCode: property.postalCode ?? property.cep ?? '',
        agentId: property.agentId ?? property.responsibleAgentId ?? '',
        imageUrlsText: joinMedia(getPropertyImages(property)),
        videoUrlsText: joinMedia(getPropertyVideos(property)),
        mediaUploads: [],
        contactPhone: property.contactPhone ?? '',
        contactWhatsApp: property.contactWhatsApp ?? '',
        latitude: property.latitude,
        longitude: property.longitude,
      }
    })
    setSelectedCity(
      property.city || property.cidade
        ? {
            city: property.city ?? property.cidade ?? undefined,
            label: [property.city ?? property.cidade, property.state ?? property.stateCode ?? property.uf]
              .filter(Boolean)
              .join(' - '),
            latitude: property.latitude,
            longitude: property.longitude,
            state: property.state ?? undefined,
            stateCode: property.stateCode ?? property.uf ?? undefined,
          }
        : null,
    )
    setPostalCodeStatus(property.postalCode || property.cep ? 'found' : 'idle')
  }

  function handlePriceChange(value: string) {
    updateForm({ price: formatCurrencyInput(value) })
  }

  function handlePriceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.key !== 'Backspace' ||
      event.currentTarget.selectionStart !== event.currentTarget.value.length ||
      event.currentTarget.selectionEnd !== event.currentTarget.value.length
    ) {
      return
    }

    event.preventDefault()
    const nextDigits = getCurrencyWholeDigits(form.price).slice(0, -1)
    updateForm({ price: formatCurrencyInput(nextDigits) })
  }

  function handlePostalCodeChange(value: string) {
    updateForm({ postalCode: formatBrazilPostalCode(value) })
  }

  function handleStateChange(value: string) {
    const normalizedValue = value.trim()
    const exactState = brazilStates.find(
      (state) =>
        normalizeText(state.code) === normalizeText(normalizedValue) ||
        normalizeText(state.name) === normalizeText(normalizedValue),
    )

    updateForm({ state: exactState ? exactState.code : normalizedValue.toUpperCase() })
    setSelectedCity(null)
  }

  function normalizeStateField() {
    updateForm({ state: getStateCode(form.state) })
  }

  function handleCitySelect(city: GeocodingResult) {
    updateForm({
      city: city.city ?? city.label.split('-')[0]?.trim() ?? form.city,
      latitude: city.latitude,
      longitude: city.longitude,
      state: city.stateCode || city.state || form.state,
    })
    setSelectedCity(city)
  }

  function handleMediaFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    const acceptedUploads = files.reduce<LocalMediaUpload[]>((uploads, file) => {
      const kind = getMediaKind(file)
      if (!kind) return uploads

      uploads.push({
        file,
        id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`,
        kind,
        previewUrl: URL.createObjectURL(file),
      })

      return uploads
    }, [])

    if (acceptedUploads.length !== files.length) {
      setError('Use apenas imagens .png/.jpg ou vídeos .mp4.')
    } else {
      setError('')
    }

    if (!acceptedUploads.length) return

    setForm((current) => ({
      ...current,
      mediaUploads: [...current.mediaUploads, ...acceptedUploads],
    }))
  }

  function removeMediaUpload(uploadId: string) {
    setForm((current) => {
      const upload = current.mediaUploads.find((item) => item.id === uploadId)
      if (upload) URL.revokeObjectURL(upload.previewUrl)

      return {
        ...current,
        mediaUploads: current.mediaUploads.filter((item) => item.id !== uploadId),
      }
    })
  }

  async function buildPayload() {
    const address = buildFullAddress(form)
    if (!address || !form.street || !form.addressNumber || !form.neighborhood || !form.city || !form.state || !form.postalCode) {
      throw new Error('Preencha rua/avenida, número, bairro, cidade, estado e CEP para validar a localização.')
    }

    let geocoded: GeocodingResult | null = null
    const geocodingQueries = buildGeocodingQueries(form)
    for (const query of geocodingQueries) {
      geocoded = await geocodeLocation(query)
      if (geocoded) break
    }

    if (!geocoded && !editingId) {
      throw new Error('Não foi possível encontrar as coordenadas desse endereço. Revise rua, número, cidade e estado antes de salvar.')
    }

    const latitude = geocoded?.latitude ?? form.latitude
    const longitude = geocoded?.longitude ?? form.longitude
    const imageUrls = splitLines(form.imageUrlsText)
    const videoUrls = splitLines(form.videoUrlsText)

    const payload: CreatePropertyInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      latitude,
      longitude,
      status: form.status,
      propertyType: form.propertyType,
      listingType: form.listingType === 'rent' ? 'aluguel' : 'venda',
      price: currencyNumberOrUndefined(form.price),
      bedrooms: numberOrUndefined(form.bedrooms),
      bathrooms: numberOrUndefined(form.bathrooms),
      parkingSpots: numberOrUndefined(form.parkingSpots),
      street: form.street.trim(),
      addressNumber: form.addressNumber.trim(),
      buildingName: form.buildingName.trim() || undefined,
      apartmentNumber: form.apartmentNumber.trim() || undefined,
      complement: form.complement.trim() || undefined,
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: getStateCode(form.state),
      postalCode: formatBrazilPostalCode(form.postalCode),
      address,
      agentId: form.agentId || undefined,
      responsibleAgentId: form.agentId || undefined,
      images: imageUrls,
      imageUrls,
      videos: videoUrls,
      videoUrls,
      contactPhone: form.contactPhone.trim() || undefined,
      contactWhatsApp: form.contactWhatsApp.trim() || undefined,
    }

    return payload
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = await buildPayload()

      if (editingId) {
        const updated = await propertiesApi.update(token, editingId, payload)
        const localMedia = createLocalMediaFromUploads(form.mediaUploads)
        const updatedWithMedia = enrichPropertyWithLocalMedia(updated, localMedia)
        const localStoredProperties = upsertLocalAdminProperty(updatedWithMedia)
        setLocalProperties((current) =>
          mergePropertyLists(
            current.map((property) => (property.id === editingId ? updatedWithMedia : property)),
            localStoredProperties,
          ),
        )
        setNotice('Imóvel atualizado com endereço e mídia.')
      } else {
        const created = await propertiesApi.create(token, payload)
        const localMedia = createLocalMediaFromUploads(form.mediaUploads)
        const createdWithMedia = enrichPropertyWithLocalMedia(created, localMedia)
        const localStoredProperties = upsertLocalAdminProperty(createdWithMedia)
        setLocalProperties((current) => mergePropertyLists([createdWithMedia, ...current], localStoredProperties))
        setNotice('Imóvel cadastrado e pronto para aparecer no mapa.')
      }

      resetForm()
      reload()
    } catch (caughtError) {
      if (caughtError instanceof Error && !(caughtError instanceof ApiError)) {
        setError(caughtError.message)
      } else if (editingId && caughtError instanceof ApiError && [404, 405, 501].includes(caughtError.status)) {
        setNotice('Edição aplicada visualmente. O backend ainda precisa expor atualização completa de imóveis.')
        resetForm()
      } else {
        setError(getErrorMessage(caughtError))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(property: Property) {
    if (!token) return
    const confirmed = window.confirm(`Remover "${property.title}"?`)
    if (!confirmed) return

    setError('')
    setNotice('')

    try {
      await propertiesApi.remove(token, property.id)
      removeLocalAdminProperty(property.id)
      setLocalProperties((current) => current.filter((item) => item.id !== property.id))
      setNotice('Imóvel removido.')
      reload()
    } catch (caughtError) {
      if (caughtError instanceof ApiError && [404, 405, 501].includes(caughtError.status)) {
        removeLocalAdminProperty(property.id)
        setLocalProperties((current) => current.filter((item) => item.id !== property.id))
        setNotice('Remoção aplicada visualmente. Endpoint de exclusão ainda não está disponível no backend.')
      } else {
        setError(getErrorMessage(caughtError))
      }
    }
  }

  function getPerformance(propertyId: string) {
    return propertyPerformance.find((item) => item.propertyId === propertyId)
  }

  const postalCodeFeedback: Record<PostalCodeStatus, string> = {
    error: 'Não foi possível validar o CEP agora.',
    found: 'CEP validado.',
    idle: '',
    loading: 'Verificando CEP...',
    'not-found': 'CEP não encontrado.',
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading admin-page-heading--compact">
        <div>
          <span className="eyebrow">Carteira</span>
          <h1>Imóveis</h1>
        </div>
        <div className="heading-actions">
          <button className="primary-button" onClick={resetForm} type="button">
            <Plus size={17} />
            <span>Novo imóvel</span>
          </button>
          <button className="secondary-button" onClick={reload} type="button">
            <RefreshCw size={17} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <section className="admin-property-workspace">
        <form className="panel admin-property-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">{editingId ? 'Edição' : 'Cadastro'}</span>
              <h2>{editingId ? 'Atualizar imóvel' : 'Novo imóvel'}</h2>
            </div>
            {editingId ? (
              <button className="icon-button" onClick={resetForm} title="Cancelar edição" type="button">
                <X size={17} />
              </button>
            ) : null}
          </div>

          <fieldset className="admin-form-section">
            <legend>Dados comerciais</legend>
            <label>
              Título do anúncio
              <input minLength={3} onChange={(event) => updateForm({ title: event.target.value })} required value={form.title} />
            </label>

            <div className="form-grid form-grid--thirds">
              <label>
                Finalidade
                <select onChange={(event) => updateForm({ listingType: event.target.value as ListingType })} value={form.listingType}>
                  <option value="sale">Venda</option>
                  <option value="rent">Aluguel</option>
                </select>
              </label>
              <label>
                Tipo
                <select onChange={(event) => updateForm({ propertyType: event.target.value })} value={form.propertyType}>
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="cobertura">Cobertura</option>
                  <option value="terreno">Terreno</option>
                </select>
              </label>
              <label>
                Status
                <select onChange={(event) => updateForm({ status: event.target.value as PropertyStatus })} value={form.status}>
                  <option value="AVAILABLE">Disponível</option>
                  <option value="NEGOTIATING">Em negociação</option>
                  <option value="SOLD">Vendido/alugado</option>
                </select>
              </label>
            </div>

            <div className="form-grid form-grid--quarters">
              <label>
                Preço
                <input inputMode="numeric" onChange={(event) => handlePriceChange(event.target.value)} onKeyDown={handlePriceKeyDown} placeholder="R$ 850.000,00" value={form.price} />
              </label>
              <label>
                Quartos
                <input min={0} onChange={(event) => updateForm({ bedrooms: event.target.value })} type="number" value={form.bedrooms} />
              </label>
              <label>
                Banheiros
                <input min={0} onChange={(event) => updateForm({ bathrooms: event.target.value })} type="number" value={form.bathrooms} />
              </label>
              <label>
                Vagas
                <input min={0} onChange={(event) => updateForm({ parkingSpots: event.target.value })} type="number" value={form.parkingSpots} />
              </label>
            </div>

            <label>
              Descrição
              <textarea onChange={(event) => updateForm({ description: event.target.value })} rows={4} value={form.description} />
            </label>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Localização padronizada</legend>
            <div className="form-grid form-grid--address">
              <label>
                Rua ou avenida
                <input onChange={(event) => updateForm({ street: event.target.value })} required value={form.street} />
              </label>
              <label>
                Número
                <input onChange={(event) => updateForm({ addressNumber: event.target.value })} required value={form.addressNumber} />
              </label>
            </div>

            <div className="form-grid form-grid--thirds">
              <label>
                Nome do Edifício
                <input onChange={(event) => updateForm({ buildingName: event.target.value })} value={form.buildingName} />
              </label>
              <label>
                Apartamento
                <input onChange={(event) => updateForm({ apartmentNumber: event.target.value })} value={form.apartmentNumber} />
              </label>
              <label>
                Complemento
                <input onChange={(event) => updateForm({ complement: event.target.value })} value={form.complement} />
              </label>
            </div>

            <div className="form-grid form-grid--quarters">
              <label>
                Bairro
                <input onChange={(event) => updateForm({ neighborhood: event.target.value })} required value={form.neighborhood} />
              </label>
              <CityAutocomplete
                className="admin-location-autocomplete"
                inputId="admin-property-city"
                label="Cidade"
                onChange={(value) => {
                  updateForm({ city: value })
                  setSelectedCity(null)
                }}
                onClear={() => {
                  updateForm({ city: '', latitude: defaultCoordinates.latitude, longitude: defaultCoordinates.longitude })
                  setSelectedCity(null)
                }}
                onSelect={handleCitySelect}
                placeholder="Digite a cidade"
                selectedCity={selectedCity}
                value={form.city}
              />
              <label>
                Estado
                <input
                  list="admin-property-state-options"
                  onBlur={normalizeStateField}
                  onChange={(event) => handleStateChange(event.target.value)}
                  placeholder="UF ou estado"
                  required
                  value={form.state}
                />
              </label>
              <label>
                CEP
                <input inputMode="numeric" onChange={(event) => handlePostalCodeChange(event.target.value)} placeholder="00000-000" required value={form.postalCode} />
                {postalCodeFeedback[postalCodeStatus] ? (
                  <small className={`admin-field-feedback admin-field-feedback--${postalCodeStatus}`}>
                    {postalCodeFeedback[postalCodeStatus]}
                  </small>
                ) : null}
              </label>
            </div>
            <datalist id="admin-property-state-options">
              {brazilStates.map((state) => (
                <option key={`${state.code}-code`} label={state.name} value={state.code} />
              ))}
              {brazilStates.map((state) => (
                <option key={`${state.code}-name`} label={state.code} value={state.name} />
              ))}
            </datalist>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Responsável e mídia</legend>
            <label>
              Corretor responsável opcional
              <select onChange={(event) => updateForm({ agentId: event.target.value })} value={form.agentId}>
                <option value="">Sem corretor definido</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>

            <div className="form-grid">
              <label>
                Links de imagens
                <textarea
                  onChange={(event) => updateForm({ imageUrlsText: event.target.value })}
                  placeholder="Uma URL pública por linha"
                  rows={4}
                  value={form.imageUrlsText}
                />
              </label>
              <label>
                Links de vídeos
                <textarea
                  onChange={(event) => updateForm({ videoUrlsText: event.target.value })}
                  placeholder="Uma URL pública por linha"
                  rows={4}
                  value={form.videoUrlsText}
                />
              </label>
            </div>

            <div className="admin-media-uploader">
              <label className="admin-media-dropzone">
                <input
                  accept="image/png,image/jpeg,video/mp4,.png,.jpg,.jpeg,.mp4"
                  key={mediaInputKey}
                  multiple
                  onChange={handleMediaFilesChange}
                  type="file"
                />
                <span className="admin-media-dropzone__icon">
                  <Camera size={19} />
                </span>
                <span className="admin-media-dropzone__copy">
                  <strong>Anexar fotos e vídeos</strong>
                  <small>PNG, JPG ou MP4</small>
                </span>
              </label>

              {form.mediaUploads.length ? (
                <div className="admin-media-preview-grid">
                  {form.mediaUploads.map((upload) => (
                    <article className="admin-media-preview-card" key={upload.id}>
                      <div className="admin-media-preview-card__thumb">
                        {upload.kind === 'image' ? (
                          <img alt="" src={upload.previewUrl} />
                        ) : (
                          <video muted preload="metadata" src={upload.previewUrl} />
                        )}
                        <span className="admin-media-preview-card__badge">
                          {upload.kind === 'image' ? <Camera size={13} /> : <Video size={13} />}
                        </span>
                      </div>
                      <div className="admin-media-preview-card__body">
                        <strong title={upload.file.name}>{upload.file.name}</strong>
                        <span>{formatFileSize(upload.file.size)}</span>
                      </div>
                      <button
                        className="icon-button admin-media-preview-card__remove"
                        onClick={() => removeMediaUpload(upload.id)}
                        title="Remover arquivo"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="form-grid">
              <label>
                Telefone de contato
                <input onChange={(event) => updateForm({ contactPhone: event.target.value })} type="tel" value={form.contactPhone} />
              </label>
              <label>
                WhatsApp
                <input onChange={(event) => updateForm({ contactWhatsApp: event.target.value })} type="tel" value={form.contactWhatsApp} />
              </label>
            </div>
          </fieldset>

          <button className="primary-button admin-submit-button" disabled={saving || geocoding} type="submit">
            {editingId ? <Edit3 size={17} /> : <Plus size={17} />}
            <span>{saving || geocoding ? 'Validando endereço...' : editingId ? 'Salvar imóvel' : 'Cadastrar imóvel'}</span>
          </button>
        </form>

        <section className="admin-property-list" aria-label="Imóveis cadastrados">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{localProperties.length} cadastrados</span>
              <h2>Carteira cadastrada</h2>
            </div>
          </div>

          {localProperties.length ? (
            <div className="admin-property-card-list">
              {localProperties.map((property) => {
                const performance = getPerformance(property.id)
                const images = getPropertyImages(property)
                const videos = getPropertyVideos(property)

                return (
                  <article className="admin-property-card" key={property.id}>
                    <div className="admin-property-card__thumb">
                      {images[0] ? <img alt="" src={images[0]} /> : <Home size={22} />}
                    </div>

                    <div className="admin-property-card__body">
                      <div className="admin-property-card__title-row">
                        <div>
                          <strong>{property.title}</strong>
                          <span>{getPropertyAddress(property) || 'Endereço não informado'}</span>
                        </div>
                        <StatusBadge value={property.status} />
                      </div>

                      <div className="admin-property-card__meta">
                        <span><UserRound size={14} /> {getPropertyAgentLabel(property, agents)}</span>
                        <span><Camera size={14} /> {images.length} imagens</span>
                        <span><Video size={14} /> {videos.length} vídeos</span>
                        <span><Building2 size={14} /> {performance?.views ?? 0} views</span>
                      </div>
                    </div>

                    <div className="admin-property-card__actions">
                      <button className="icon-button" onClick={() => startEditing(property)} title="Editar" type="button">
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-button icon-button--danger" onClick={() => handleDelete(property)} title="Remover" type="button">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="admin-empty">
              <strong>Nenhum imóvel cadastrado</strong>
              <p>Cadastre com endereço completo para que o ponto seja publicado corretamente no mapa.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
