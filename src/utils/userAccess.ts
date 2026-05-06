import type { User } from '../types/api'

const administrativeRoles = new Set(['admin', 'manager', 'agent'])

export function isAdministrativeSession(isAuthenticated: boolean, user: User | null) {
  if (!isAuthenticated) return false
  if (!user) return true

  return administrativeRoles.has(String(user.role).toLowerCase())
}

export function canUsePublicFavorites(isAuthenticated: boolean, user: User | null) {
  return !isAdministrativeSession(isAuthenticated, user)
}
