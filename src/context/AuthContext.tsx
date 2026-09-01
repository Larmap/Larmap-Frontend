import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  can as canSession,
  canAccessBlogAdmin as canAccessBlogAdminForSession,
  canAccessCompanyAdmin as canAccessCompanyAdminForSession,
  canEditOwnProfessionalProfile as canEditOwnProfessionalProfileForSession,
  getPostLoginDestination,
  hasAccessRole as sessionHasAccessRole,
  type AppPermission,
} from '../auth/authorization'
import { AUTH_UNAUTHORIZED_EVENT } from '../auth/events'
import { ApiError, authApi, companyApi } from '../api/client'
import { featureFlags } from '../config/features'
import type {
  AccessRole,
  AuthSession,
  AuthUser,
  Company,
  LoginData,
  LoginInput,
  RegisterCompanyInput,
  UpdateCompanyInput,
} from '../types/api'
import { readStorageValue, removeStorageValue } from '../utils/storage'

const TOKEN_STORAGE_KEY = 'larmap.authToken'
const COMPANY_STORAGE_KEY = 'larmap.company'
const USER_STORAGE_KEY = 'larmap.user'
const LEGACY_TOKEN_STORAGE_KEY = 'smartmap.authToken'
const LEGACY_COMPANY_STORAGE_KEY = 'smartmap.company'
const LEGACY_USER_STORAGE_KEY = 'smartmap.user'
const ACCESS_ROLES = new Set<AccessRole>(['COMMON', 'COMPANY', 'BLOG', 'TECHNICAL'])

interface AuthContextValue {
  session: AuthSession | null
  sessionKind: AuthSession['kind'] | null
  token: string | null
  company: Company | null
  user: AuthUser | null
  adminHomePath: string
  isAuthenticated: boolean
  isAuthLoading: boolean
  authErrorStatus: number | null
  can: (permission: AppPermission) => boolean
  hasAccessRole: (role: AccessRole) => boolean
  canAccessCompanyAdmin: () => boolean
  canAccessBlogAdmin: () => boolean
  canEditOwnProfessionalProfile: () => boolean
  login: (input: LoginInput) => Promise<AuthSession>
  registerCompany: (input: RegisterCompanyInput) => Promise<void>
  updateCompanyProfile: (input: UpdateCompanyInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function parseStoredValue<T>(storageKey: string, legacyStorageKey: string): T | null {
  const stored = readStorageValue(storageKey, legacyStorageKey)
  if (!stored) return null

  try {
    return JSON.parse(stored) as T
  } catch {
    removeStorageValue(storageKey, legacyStorageKey)
    return null
  }
}

function isAuthUser(user: AuthUser | null | undefined): user is AuthUser {
  return Boolean(
    user &&
      typeof user.id === 'string' &&
      typeof user.name === 'string' &&
      typeof user.email === 'string' &&
      user.accessRole &&
      ACCESS_ROLES.has(user.accessRole) &&
      Array.isArray(user.permissions) &&
      user.permissions.every((permission) => typeof permission === 'string'),
  )
}

function readStoredSession(): AuthSession | null {
  const token = readStorageValue(TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY)
  if (!token) return null

  const company = parseStoredValue<Company>(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
  const user = parseStoredValue<AuthUser>(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)

  if (isAuthUser(user)) {
    return { kind: 'NEW_AUTH_SESSION', token, user, company }
  }

  removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
  if (company) {
    return { kind: 'LEGACY_COMPANY_SESSION', token, user: null, company }
  }

  removeStorageValue(TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY)
  return null
}

function persistSession(session: AuthSession) {
  localStorage.setItem(TOKEN_STORAGE_KEY, session.token)

  if (session.company) {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(session.company))
  } else {
    removeStorageValue(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
  }

  if (session.kind === 'NEW_AUTH_SESSION') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user))
  } else {
    removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
  }

  localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY)
  localStorage.removeItem(LEGACY_COMPANY_STORAGE_KEY)
  localStorage.removeItem(LEGACY_USER_STORAGE_KEY)
}

function clearStoredSession() {
  removeStorageValue(TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY)
  removeStorageValue(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
  removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
}

function createSessionFromLogin(data: LoginData): AuthSession {
  if (typeof data.token !== 'string' || !data.token.trim()) {
    throw new ApiError('A resposta de autenticação não possui um token válido.', 502)
  }

  if (data.user) {
    if (!isAuthUser(data.user)) {
      throw new ApiError('A resposta de autenticação não possui um usuário válido.', 502)
    }

    return {
      kind: 'NEW_AUTH_SESSION',
      token: data.token,
      user: data.user,
      company: data.company ?? null,
    }
  }

  if (data.company) {
    return {
      kind: 'LEGACY_COMPANY_SESSION',
      token: data.token,
      user: null,
      company: data.company,
    }
  }

  throw new ApiError('A resposta de autenticação não possui uma sessão válida.', 502)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession())
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(session))
  const [authErrorStatus, setAuthErrorStatus] = useState<number | null>(null)

  const clearSession = useCallback(() => {
    clearStoredSession()
    setSession(null)
    setAuthErrorStatus(null)
    setIsAuthLoading(false)
  }, [])

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, clearSession)
  }, [clearSession])

  useEffect(() => {
    // /auth/me belongs to the new authentication contract. Legacy company
    // sessions are already represented by the persisted company DTO and the
    // backend currently in production does not implement this endpoint.
    if (!session || !featureFlags.NEW_AUTH_API || session.kind !== 'NEW_AUTH_SESSION') {
      setIsAuthLoading(false)
      return
    }

    let active = true
    setIsAuthLoading(true)
    setAuthErrorStatus(null)

    void authApi
      .me(session.token)
      .then((data) => {
        if (!active) return
        if (!isAuthUser(data.user)) {
          throw new ApiError('A resposta de /auth/me não possui um usuário válido.', 502)
        }

        const validatedCompany = data.company && session.company?.id === data.company.id
          ? { ...session.company, ...data.company }
          : data.company ?? null
        const validatedSession: AuthSession = {
          kind: 'NEW_AUTH_SESSION',
          token: session.token,
          user: data.user,
          // /auth/me currently returns a compact company DTO. Preserve fields
          // already obtained from a real company update for the same tenant.
          company: validatedCompany,
        }
        persistSession(validatedSession)
        setSession(validatedSession)
      })
      .catch((error: unknown) => {
        if (!active) return

        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          return
        }

        setAuthErrorStatus(error instanceof ApiError ? error.status : 0)
      })
      .finally(() => {
        if (active) setIsAuthLoading(false)
      })

    return () => {
      active = false
    }
  }, [clearSession, session?.kind, session?.token])

  async function login(input: LoginInput) {
    const data = await authApi.login({ email: input.email.trim(), password: input.password })
    const nextSession = createSessionFromLogin(data)
    persistSession(nextSession)
    setAuthErrorStatus(null)
    setIsAuthLoading(true)
    setSession(nextSession)
    return nextSession
  }

  async function registerCompany(input: RegisterCompanyInput) {
    if (!featureFlags.PUBLIC_REGISTRATION) {
      // The route is hidden while disabled. Keep this guard harmless if an
      // outdated caller is still mounted during a staged rollout.
      return
    }

    try {
      await authApi.register(input)
    } catch (error) {
      if (!(error instanceof ApiError) || ![400, 422].includes(error.status)) {
        throw error
      }

      await authApi.register({
        email: input.email,
        name: input.name,
        password: input.password,
        phone: input.phone,
        whatsapp: input.whatsapp,
      })
    }

    const loginSession = await login({ email: input.email, password: input.password })

    const updatedCompany = await companyApi.update(loginSession.token, {
      brandImageUrl: input.brandImageUrl,
      logoUrl: input.logoUrl ?? input.brandImageUrl,
      headquartersStreet: input.headquartersStreet,
      headquartersNumber: input.headquartersNumber,
      headquartersComplement: input.headquartersComplement,
      headquartersNeighborhood: input.headquartersNeighborhood,
      headquartersCity: input.headquartersCity,
      headquartersState: input.headquartersState,
      headquartersPostalCode: input.headquartersPostalCode,
      headquartersAddress: input.headquartersAddress,
    })
    const updatedSession: AuthSession = { ...loginSession, company: updatedCompany }
    persistSession(updatedSession)
    setSession(updatedSession)
  }

  async function updateCompanyProfile(input: UpdateCompanyInput) {
    const currentCompany = session?.company
    if (!session || !currentCompany) {
      throw new ApiError('Não foi possível identificar a imobiliária desta conta.', 409)
    }

    const nextCompany = await companyApi.update(session.token, input)
    const nextSession: AuthSession = { ...session, company: nextCompany }
    persistSession(nextSession)
    setSession(nextSession)
  }

  const user = session?.kind === 'NEW_AUTH_SESSION' ? session.user : null
  const company = session?.company ?? null

  return (
    <AuthContext.Provider
      value={{
        session,
        sessionKind: session?.kind ?? null,
        token: session?.token ?? null,
        company,
        user,
        adminHomePath: getPostLoginDestination(session),
        login,
        registerCompany,
        updateCompanyProfile,
        logout: clearSession,
        isAuthenticated: Boolean(session),
        isAuthLoading,
        authErrorStatus,
        can: (permission) => canSession(session, permission),
        hasAccessRole: (role) => sessionHasAccessRole(session, role),
        canAccessCompanyAdmin: () => canAccessCompanyAdminForSession(session),
        canAccessBlogAdmin: () => canAccessBlogAdminForSession(session),
        canEditOwnProfessionalProfile: () => canEditOwnProfessionalProfileForSession(session),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
