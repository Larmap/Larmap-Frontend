import type {
  ApiFailure,
  ApiResponse,
  AuthMeData,
  Company,
  CreateLeadInput,
  CreatePartnershipInput,
  CreatePropertyInput,
  CreateUserInput,
  Lead,
  ListUsersData,
  LoginData,
  LoginInput,
  Negotiation,
  PerformanceMetric,
  PropertyPerformance,
  Property,
  PublicProfessionalProfile,
  RegisterCompanyInput,
  UpdateCompanyInput,
  UpdateUserInput,
  User,
} from '../types/api'
import { normalizeApiBaseUrl, PUBLIC_PROFESSIONAL_ENDPOINTS, PUBLIC_PROPERTY_ENDPOINTS } from './publicEndpoints'
import { AUTH_UNAUTHORIZED_EVENT } from '../auth/events'

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  '/api',
)

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string | null
  timeoutMs?: number
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('Resposta inválida da API.', response.status)
  }
}

async function request<T>(
  endpoint: string,
  { method = 'GET', body, token, timeoutMs }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const abortController = timeoutMs ? new AbortController() : null
  const timeoutId = timeoutMs
    ? globalThis.setTimeout(() => abortController?.abort(), timeoutMs)
    : null
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortController?.signal,
    })
  } catch (error) {
    if (abortController?.signal.aborted) {
      throw new ApiError('Request timeout', 408, 'REQUEST_TIMEOUT')
    }
    throw error
  } finally {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId)
  }

  if (token && response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
  }

  const payload = (await parseJson(response)) as ApiResponse<T> | ApiFailure | null

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.success === false
        ? payload.error.message
        : 'Não foi possível completar a requisição.'
    const code = payload?.success === false ? payload.error.code : undefined
    throw new ApiError(message, response.status, code)
  }

  if (payload && 'data' in payload) {
    return payload.data
  }

  if (payload !== null && payload !== undefined) {
    return payload as T
  }

  return undefined as T
}

export const healthApi = {
  check: () => request<{ message: string; timestamp: string }>('/health'),
}

export const authApi = {
  register: (input: RegisterCompanyInput) =>
    request<Company>('/auth/register', {
      method: 'POST',
      body: input,
    }),
  login: (input: LoginInput) =>
    request<LoginData>('/auth/login', {
      method: 'POST',
      body: input,
      timeoutMs: 15_000,
    }),
  me: (token: string) => request<AuthMeData>('/auth/me', { token }),
}

function normalizePropertyList(payload: unknown): Property[] {
  if (Array.isArray(payload)) return payload as Property[]

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      properties?: unknown
      items?: unknown
      results?: unknown
      data?: unknown
    }

    for (const value of [candidate.properties, candidate.items, candidate.results, candidate.data]) {
      if (Array.isArray(value)) return value as Property[]
    }
  }

  return []
}

async function requestFirstAvailableProperties(token?: string | null) {
  const endpoint = token ? '/properties' : PUBLIC_PROPERTY_ENDPOINTS[0]
  const payload = await request<unknown>(endpoint, { token })
  return normalizePropertyList(payload)
}

async function requestFirstAvailableProfessional(slug: string) {
  let lastError: unknown
  const encodedSlug = encodeURIComponent(slug)

  for (const endpoint of PUBLIC_PROFESSIONAL_ENDPOINTS) {
    try {
      return await request<PublicProfessionalProfile>(`${endpoint}/${encodedSlug}`)
    } catch (error) {
      lastError = error
      if (!(error instanceof ApiError) || ![404, 405, 501].includes(error.status)) {
        throw error
      }
    }
  }

  if (lastError) throw lastError
  throw new ApiError('Perfil profissional indisponível.', 404)
}

function normalizePublicProfessionalProfile(profile: PublicProfessionalProfile): PublicProfessionalProfile {
  const details = profile.profile
  return {
    ...profile,
    slug: profile.publicSlug,
    avatarUrl: details?.avatarUrl ?? profile.avatarUrl,
    bio: details?.bio ?? profile.bio,
    creci: details?.creci ?? profile.creci,
    specialties: details?.specialties ?? profile.specialties,
    contact: {
      email: details?.publicEmail ?? profile.contact?.email,
      instagram: details?.instagram ?? profile.contact?.instagram,
      phone: details?.publicPhone ?? profile.phone,
      site: details?.website ?? profile.contact?.site,
      whatsapp: details?.publicWhatsapp ?? profile.company?.whatsapp ?? profile.contact?.whatsapp,
    },
    areas: profile.stats?.neighborhoods ?? profile.areas,
    propertyTypes: profile.stats?.byType?.map(({ type, count }) => ({ name: type, count })) ?? profile.propertyTypes,
  }
}

export const usersApi = {
  list: (token: string, limit = 10, offset = 0, role?: string) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })

    if (role) {
      params.set('role', role)
    }

    return request<ListUsersData>(`/users?${params.toString()}`, { token })
  },
  create: (token: string, input: CreateUserInput) =>
    request<User>('/users', {
      method: 'POST',
      token,
      body: input,
    }),
  update: (token: string, userId: string, input: UpdateUserInput) =>
    request<User>(`/users/${userId}`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  remove: (token: string, userId: string) =>
    request<void>(`/users/${userId}`, {
      method: 'DELETE',
      token,
    }),
}

export const propertiesApi = {
  list: (token?: string | null) => requestFirstAvailableProperties(token),
  create: (token: string, input: CreatePropertyInput) =>
    request<Property>('/properties', {
      method: 'POST',
      token,
      body: input,
    }),
  update: (token: string, propertyId: string, input: Partial<CreatePropertyInput>) =>
    request<Property>(`/properties/${propertyId}`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  remove: (token: string, propertyId: string) =>
    request<void>(`/properties/${propertyId}`, {
      method: 'DELETE',
      token,
    }),
}

export const professionalsApi = {
  getPublic: async (slug: string) => normalizePublicProfessionalProfile(await requestFirstAvailableProfessional(slug)),
}

export const companyApi = {
  update: (token: string, input: UpdateCompanyInput) =>
    request<Company>('/companies/me', { method: 'PATCH', token, body: input }),
}

export const leadsApi = {
  list: (token: string) => request<Lead[]>('/leads', { token }),
  create: async (input: CreateLeadInput) => {
    const endpoints = ['/leads', '/public/leads', '/leads/public', '/map/leads', '/interests']
    let lastError: unknown

    for (const endpoint of endpoints) {
      try {
        return await request<Lead>(endpoint, {
          method: 'POST',
          body: input,
        })
      } catch (error) {
        lastError = error
        if (!(error instanceof ApiError) || ![404, 405, 501].includes(error.status)) {
          throw error
        }
      }
    }

    if (lastError) throw lastError
    throw new ApiError('Endpoint de leads indisponível.', 404)
  },
  update: (token: string, leadId: string, input: Partial<Lead>) =>
    request<Lead>(`/leads/${leadId}`, {
      method: 'PATCH',
      token,
      body: input,
    }),
}

export const partnershipsApi = {
  create: (input: CreatePartnershipInput) =>
    request<void>('/partnerships', {
      method: 'POST',
      body: input,
    }),
}

export const negotiationsApi = {
  list: (token: string) => request<Negotiation[]>('/negotiations', { token }),
}

export const performanceApi = {
  listAgents: (token: string) => request<PerformanceMetric[]>('/performance/agents', { token }),
  listProperties: (token: string) =>
    request<PropertyPerformance[]>('/performance/properties', { token }),
}
