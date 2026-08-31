import type { AccessRole, AuthSession } from '../types/api'
import { featureFlags } from '../config/features'

export type AppPermission =
  | 'company:manage'
  | 'blog:manage'
  | 'professional-profile:self:edit'

const ROLE_DEFAULT_PERMISSIONS: Record<AccessRole, readonly AppPermission[]> = {
  COMMON: [],
  COMPANY: ['company:manage'],
  BLOG: ['blog:manage'],
  TECHNICAL: ['company:manage', 'blog:manage'],
}

const LEGACY_COMPANY_PERMISSIONS: readonly AppPermission[] = [
  'company:manage',
]

function hasBackendPermissions(session: AuthSession) {
  return session.kind === 'NEW_AUTH_SESSION' && session.user.permissions.length > 0
}

export function can(session: AuthSession | null, permission: AppPermission) {
  if (!session) return false

  if (permission === 'blog:manage' && !featureFlags.BLOG_ADMIN) return false
  if (permission === 'professional-profile:self:edit' && !featureFlags.PROFESSIONAL_SELF_PROFILE) return false

  if (session.kind === 'LEGACY_COMPANY_SESSION') {
    return LEGACY_COMPANY_PERMISSIONS.includes(permission)
  }

  if (hasBackendPermissions(session)) {
    return session.user.permissions.includes(permission)
  }

  if (
    permission === 'professional-profile:self:edit' &&
    session.user.accessRole === 'COMMON' &&
    session.user.professionalRole?.toLowerCase() === 'agent'
  ) {
    return true
  }

  return ROLE_DEFAULT_PERMISSIONS[session.user.accessRole].includes(permission)
}

export function hasAccessRole(session: AuthSession | null, role: AccessRole) {
  return session?.kind === 'NEW_AUTH_SESSION' && session.user.accessRole === role
}

export function canAccessCompanyAdmin(session: AuthSession | null) {
  return can(session, 'company:manage')
}

export function canAccessBlogAdmin(session: AuthSession | null) {
  return can(session, 'blog:manage')
}

export function canEditOwnProfessionalProfile(session: AuthSession | null) {
  return can(session, 'professional-profile:self:edit')
}

export function canAccessPath(session: AuthSession | null, pathname: string) {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false
  if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login') return false

  if (pathname === '/favoritos') {
    return session?.kind === 'NEW_AUTH_SESSION' && session.user.accessRole === 'COMMON'
  }

  if (pathname === '/minha-conta') return Boolean(session)

  if (pathname === '/admin/blog' || pathname.startsWith('/admin/blog/')) {
    return canAccessBlogAdmin(session)
  }

  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/users' ||
    pathname === '/properties'
  ) {
    return canAccessCompanyAdmin(session)
  }

  return true
}

export function getPostLoginDestination(session: AuthSession | null) {
  if (canAccessCompanyAdmin(session)) return '/admin/dashboard'
  if (canAccessBlogAdmin(session)) return '/admin/blog'

  return session ? '/minha-conta' : '/'
}
