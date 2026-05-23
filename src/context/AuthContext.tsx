import { createContext, useContext, useState, type ReactNode } from 'react'
import { ApiError, authApi, companyApi } from '../api/client'
import type { Company, LoginData, LoginInput, RegisterCompanyInput, UpdateCompanyInput, User } from '../types/api'
import { readStorageValue, removeStorageValue } from '../utils/storage'

const TOKEN_STORAGE_KEY = 'larmap.authToken'
const COMPANY_STORAGE_KEY = 'larmap.company'
const USER_STORAGE_KEY = 'larmap.user'
const LEGACY_TOKEN_STORAGE_KEY = 'smartmap.authToken'
const LEGACY_COMPANY_STORAGE_KEY = 'smartmap.company'
const LEGACY_USER_STORAGE_KEY = 'smartmap.user'

interface AuthContextValue {
  token: string | null
  company: Company | null
  user: User | null
  adminHomePath: string
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<LoginData>
  registerCompany: (input: RegisterCompanyInput) => Promise<void>
  updateCompanyProfile: (input: UpdateCompanyInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredCompany(): Company | null {
  const stored = readStorageValue(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as Company
  } catch {
    removeStorageValue(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
    return null
  }
}

function readStoredUser(): User | null {
  const stored = readStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as User
  } catch {
    removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
    return null
  }
}

function getAdminHomePath(user: User | null) {
  return user?.role === 'agent' ? '/admin/corretor' : '/admin/dashboard'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => readStorageValue(TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY))
  const [company, setCompany] = useState<Company | null>(() => readStoredCompany())
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  async function login(input: LoginInput) {
    const data = await authApi.login(input)
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(data.company))
    if (data.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
    } else {
      removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
    }
    setToken(data.token)
    setCompany(data.company)
    setUser(data.user ?? null)
    return data
  }

  async function registerCompany(input: RegisterCompanyInput) {
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

    await login({ email: input.email, password: input.password })

    await updateCompanyProfile({
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
  }

  async function updateCompanyProfile(input: UpdateCompanyInput) {
    const currentCompany = company ?? readStoredCompany()
    if (!currentCompany) return

    let nextCompany: Company = {
      ...currentCompany,
      ...input,
      updatedAt: new Date().toISOString(),
    }

    if (token) {
      try {
        nextCompany = await companyApi.update(token, input)
      } catch (error) {
        if (!(error instanceof ApiError) || ![404, 405, 501].includes(error.status)) {
          throw error
        }
      }
    }

    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(nextCompany))
    setCompany(nextCompany)
  }

  function logout() {
    removeStorageValue(TOKEN_STORAGE_KEY, LEGACY_TOKEN_STORAGE_KEY)
    removeStorageValue(COMPANY_STORAGE_KEY, LEGACY_COMPANY_STORAGE_KEY)
    removeStorageValue(USER_STORAGE_KEY, LEGACY_USER_STORAGE_KEY)
    setToken(null)
    setCompany(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        company,
        user,
        adminHomePath: getAdminHomePath(user),
        login,
        registerCompany,
        updateCompanyProfile,
        logout,
        isAuthenticated: Boolean(token),
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
