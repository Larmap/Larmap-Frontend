import type { AuthUser } from '../types/api'

export function isAdministrativeSession(isAuthenticated: boolean, user: AuthUser | null) {
  if (!isAuthenticated) return false
  if (!user) return true

  return user.accessRole !== 'COMMON'
}

export function canUsePublicFavorites(isAuthenticated: boolean, user: AuthUser | null) {
  return !isAdministrativeSession(isAuthenticated, user)
}
