import type {
  ApiFailure,
  ApiResponse,
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
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

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
    }),
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
  const endpoints = token ? ['/properties'] : PUBLIC_PROPERTY_ENDPOINTS

  let lastError: unknown

  for (const endpoint of endpoints) {
    try {
      const payload = await request<unknown>(endpoint, { token })
      return normalizePropertyList(payload)
    } catch (error) {
      lastError = error
      if (!(error instanceof ApiError) || ![401, 403, 404, 405, 501].includes(error.status)) {
        throw error
      }
    }
  }

  if (lastError) throw lastError
  return []
}

async function requestFirstAvailableProfessional(slug: string) {
  let lastError: unknown
  const encodedSlug = encodeURIComponent(slug)

  for (const endpoint of PUBLIC_PROFESSIONAL_ENDPOINTS) {
    try {
      return await request<PublicProfessionalProfile>(`${endpoint}/${encodedSlug}`)
    } catch (error) {
      lastError = error
      if (!(error instanceof ApiError) || ![401, 403, 404, 405, 501].includes(error.status)) {
        throw error
      }
    }
  }

  if (lastError) throw lastError
  throw new ApiError('Perfil profissional indisponível.', 404)
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
  getPublic: (slug: string) => requestFirstAvailableProfessional(slug),
}

export const companyApi = {
  update: async (token: string, input: UpdateCompanyInput) => {
    const endpoints = ['/companies/me', '/company', '/companies']
    let lastError: unknown

    for (const endpoint of endpoints) {
      try {
        return await request<Company>(endpoint, {
          method: 'PATCH',
          token,
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
    return input as Company
  },
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
        if (!(error instanceof ApiError) || ![401, 403, 404, 405, 501].includes(error.status)) {
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
