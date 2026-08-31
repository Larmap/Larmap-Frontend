import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquareText,
  Settings,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { leadsApi } from '../api/client'
import type { AppPermission } from '../auth/authorization'
import { useAuth } from '../context/AuthContext'
import { useAdminData } from '../hooks/useAdminData'
import type { Lead } from '../types/api'
import { updateLocalLeads } from '../utils/localLeads'
import { BrandLogo } from './BrandLogo'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'company:manage' },
  { to: '/admin/imoveis', label: 'Imóveis', icon: Map, permission: 'company:manage' },
  { to: '/admin/corretores', label: 'Corretores', icon: Users, permission: 'company:manage' },
  { to: '/admin/leads', label: 'Leads', icon: MessageSquareText, badge: true, permission: 'company:manage' },
  { to: '/admin/desempenho', label: 'Desempenho', icon: BarChart3, permission: 'company:manage' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, permission: 'company:manage' },
  { to: '/admin/blog', label: 'LarMap Explica', icon: FileText, permission: 'blog:manage' },
]

const ADMIN_ACCOUNT_MENU_ID = 'admin-account-menu'
const ADMIN_NOTIFICATION_MENU_ID = 'admin-notification-menu'
const ADMIN_SIDEBAR_ID = 'admin-navigation-drawer'

export type AdminWorkspaceContext = ReturnType<typeof useAdminData>

export function useAdminWorkspace() {
  return useOutletContext<AdminWorkspaceContext>()
}

function formatLeadDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function AdminShell() {
  const { can, company, logout, sessionKind, token, user } = useAuth()
  const location = useLocation()
  const adminData = useAdminData(token)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [companyLogoFailed, setCompanyLogoFailed] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationSnapshot, setNotificationSnapshot] = useState<Lead[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const accountMenuButtonRef = useRef<HTMLButtonElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const notificationWrapRef = useRef<HTMLDivElement>(null)
  const sidebarCloseButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const sidebarToggleButtonRef = useRef<HTMLButtonElement>(null)
  const unreadLeads = useMemo(() => adminData.leads.filter((lead) => !lead.viewed), [adminData.leads])
  const recentLeads = useMemo(
    () =>
      [...adminData.leads]
        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
        .slice(0, 5),
    [adminData.leads],
  )
  const newLeadsCount = unreadLeads.length
  const accountLabel = user?.accessRole === 'TECHNICAL'
    ? 'Técnico'
    : sessionKind === 'LEGACY_COMPANY_SESSION'
      ? 'Imobiliária (legado)'
      : 'Imobiliária'
  const visibleNavItems = navItems.filter((item) => can(item.permission as AppPermission))
  const accountName = user?.accessRole === 'TECHNICAL'
    ? user.name
    : company?.name ?? user?.name ?? 'LarMap'
  const accountEmail = user?.email ?? company?.email ?? 'Conta ativa'
  const companyLogoUrl = (company?.brandImageUrl ?? company?.logoUrl ?? '').trim()
  const currentSection = visibleNavItems.find((item) =>
    location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )?.label ?? 'Administração'
  const notificationButtonLabel = newLeadsCount === 1
    ? '1 novo lead'
    : newLeadsCount > 1
      ? `${newLeadsCount} novos leads`
      : 'Notificações'
  const visibleNotifications = notificationSnapshot.length ? notificationSnapshot : recentLeads
  const notificationMenuLabel = notificationSnapshot.length
    ? notificationSnapshot.length === 1
      ? '1 novo lead'
      : `${notificationSnapshot.length} novos leads`
    : 'Leads recentes'

  useEffect(() => {
    setAccountMenuOpen(false)
    setNotificationsOpen(false)
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setCompanyLogoFailed(false)
  }, [companyLogoUrl])

  useEffect(() => {
    if (!accountMenuOpen && !notificationsOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return

      if (accountMenuOpen && !accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false)
      }

      if (notificationsOpen && !notificationWrapRef.current?.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [accountMenuOpen, notificationsOpen])

  useEffect(() => {
    if (!accountMenuOpen && !notificationsOpen && !sidebarOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      if (accountMenuOpen) {
        setAccountMenuOpen(false)
        accountMenuButtonRef.current?.focus()
        return
      }

      if (notificationsOpen) {
        setNotificationsOpen(false)
        notificationButtonRef.current?.focus()
        return
      }

      setSidebarOpen(false)
      sidebarToggleButtonRef.current?.focus()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [accountMenuOpen, notificationsOpen, sidebarOpen])

  useEffect(() => {
    if (!sidebarOpen) return

    const previousOverflow = document.body.style.overflow
    const focusFrame = window.requestAnimationFrame(() => sidebarCloseButtonRef.current?.focus())
    document.body.style.overflow = 'hidden'

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
    }
  }, [sidebarOpen])

  async function markLeadsAsRead(leads: Lead[]) {
    if (!leads.length) return
    const leadIds = new Set(leads.map((lead) => lead.id))
    updateLocalLeads(leadIds, { viewed: true })

    adminData.setLeads(
      adminData.leads.map((lead) =>
        leadIds.has(lead.id)
          ? {
              ...lead,
              viewed: true,
              updatedAt: new Date().toISOString(),
            }
          : lead,
      ),
    )

    if (!token) return

    await Promise.allSettled(
      leads.map((lead) => leadsApi.update(token, lead.id, { viewed: true })),
    )
  }

  function openSidebar() {
    setAccountMenuOpen(false)
    setNotificationsOpen(false)
    setSidebarOpen(true)
  }

  function closeSidebar(restoreFocus = false) {
    setSidebarOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => sidebarToggleButtonRef.current?.focus())
    }
  }

  function handleSidebarKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (!sidebarOpen || event.key !== 'Tab' || !sidebarRef.current) return

    const focusableElements = Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0)

    if (!focusableElements.length) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  function toggleAccountMenu() {
    setNotificationsOpen(false)
    setAccountMenuOpen((current) => !current)
  }

  function handleAccountMenuBlur(event: ReactFocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) {
      setAccountMenuOpen(false)
    }
  }

  function handleNotificationBlur(event: ReactFocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) {
      setNotificationsOpen(false)
    }
  }

  function closeNotifications(restoreFocus = false) {
    setNotificationsOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => notificationButtonRef.current?.focus())
    }
  }

  function handleLogout() {
    setAccountMenuOpen(false)
    setNotificationsOpen(false)
    setSidebarOpen(false)
    logout()
  }

  function toggleNotifications() {
    const shouldOpen = !notificationsOpen
    setAccountMenuOpen(false)
    setNotificationsOpen(shouldOpen)

    if (!shouldOpen) return

    const nextSnapshot = unreadLeads.length ? unreadLeads : recentLeads
    setNotificationSnapshot(nextSnapshot)
    void markLeadsAsRead(unreadLeads)
  }

  return (
    <div className={sidebarOpen ? 'admin-shell admin-shell--drawer-open' : 'admin-shell'}>
      {sidebarOpen ? (
        <button
          aria-label="Fechar menu administrativo"
          className="admin-sidebar-backdrop"
          onClick={() => closeSidebar(true)}
          type="button"
        />
      ) : null}

      <aside
        aria-label="Menu administrativo"
        aria-modal={sidebarOpen || undefined}
        className={sidebarOpen ? 'admin-sidebar admin-sidebar--open' : 'admin-sidebar'}
        id={ADMIN_SIDEBAR_ID}
        onKeyDown={handleSidebarKeyDown}
        ref={sidebarRef}
        role={sidebarOpen ? 'dialog' : undefined}
      >
        <div className="admin-sidebar__header">
          <Link
            aria-label="Ir para o painel da imobiliária"
            className="admin-logo"
            onClick={() => closeSidebar()}
            to="/admin/dashboard"
          >
            <BrandLogo className="admin-logo__brand" variant="symbol" />
          </Link>
          <button
            aria-label="Fechar menu administrativo"
            className="admin-sidebar__close"
            onClick={() => closeSidebar(true)}
            ref={sidebarCloseButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <nav className="admin-nav" aria-label="Navegação administrativa">
          {visibleNavItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'
                }
                key={item.to}
                onClick={() => closeSidebar()}
                to={item.to}
              >
                <Icon aria-hidden="true" size={19} />
                <span>{item.label}</span>
                {item.badge && newLeadsCount ? (
                  <strong className="admin-nav__badge">{newLeadsCount}</strong>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <Link
          className="admin-nav__link admin-nav__link--external"
          onClick={() => closeSidebar()}
          rel="noreferrer"
          target="_blank"
          to="/mapa"
        >
          <ExternalLink aria-hidden="true" size={18} />
          <span>Mapa público</span>
        </Link>

        <button className="admin-logout" onClick={handleLogout} type="button">
          <LogOut aria-hidden="true" size={19} />
          <span>Sair</span>
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <button
              aria-controls={ADMIN_SIDEBAR_ID}
              aria-expanded={sidebarOpen}
              aria-label="Abrir menu administrativo"
              className="admin-menu-toggle"
              onClick={openSidebar}
              ref={sidebarToggleButtonRef}
              type="button"
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <span className="admin-topbar__section">{currentSection}</span>
          </div>

          <div className="admin-topbar__actions">
            <div
              className="admin-notification-wrap"
              onBlur={handleNotificationBlur}
              ref={notificationWrapRef}
            >
              <button
                aria-controls={ADMIN_NOTIFICATION_MENU_ID}
                aria-label={notificationButtonLabel}
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                className={newLeadsCount ? 'admin-notification admin-notification--unread' : 'admin-notification'}
                onClick={toggleNotifications}
                ref={notificationButtonRef}
                type="button"
              >
                <Bell aria-hidden="true" size={19} />
                {newLeadsCount ? (
                  <span aria-hidden="true" className="admin-notification__count">{newLeadsCount}</span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div
                  aria-labelledby={`${ADMIN_NOTIFICATION_MENU_ID}-title`}
                  className="admin-notification-menu"
                  id={ADMIN_NOTIFICATION_MENU_ID}
                  role="dialog"
                >
                  <div className="admin-notification-menu__header">
                    <div>
                      <strong id={`${ADMIN_NOTIFICATION_MENU_ID}-title`}>Notificações</strong>
                      <span>{notificationMenuLabel}</span>
                    </div>
                    <button
                      aria-label="Fechar notificações"
                      className="admin-notification-menu__close"
                      onClick={() => closeNotifications(true)}
                      type="button"
                    >
                      <X aria-hidden="true" size={17} />
                    </button>
                  </div>

                  {visibleNotifications.length ? (
                    <div className="admin-notification-list">
                      {visibleNotifications.map((lead) => (
                        <Link
                          className="admin-notification-item"
                          key={lead.id}
                          onClick={() => setNotificationsOpen(false)}
                          to="/admin/leads"
                        >
                          <span>{lead.interestedName ?? 'Interessado não identificado'}</span>
                          <strong>{lead.propertyTitle ?? 'Imóvel não informado'}</strong>
                          <small>{formatLeadDate(lead.createdAt)}</small>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-notification-empty">Os novos contatos aparecerão aqui.</p>
                  )}

                  <Link className="admin-notification-footer" onClick={() => setNotificationsOpen(false)} to="/admin/leads">
                    Ver todos os leads
                  </Link>
                </div>
              ) : null}
            </div>

            <div
              className="admin-account-menu"
              onBlur={handleAccountMenuBlur}
              ref={accountMenuRef}
            >
              <button
                aria-controls={ADMIN_ACCOUNT_MENU_ID}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label={`Abrir menu da conta de ${accountName}`}
                className="admin-account-menu__trigger"
                onClick={toggleAccountMenu}
                ref={accountMenuButtonRef}
                type="button"
              >
                <span className="admin-account-menu__avatar">
                  {companyLogoUrl && !companyLogoFailed ? (
                    <img
                      alt=""
                      onError={() => setCompanyLogoFailed(true)}
                      src={companyLogoUrl}
                    />
                  ) : user?.accessRole === 'TECHNICAL' ? (
                    <UserRound aria-hidden="true" size={18} />
                  ) : (
                    <Building2 aria-hidden="true" size={18} />
                  )}
                </span>
                <span className="admin-account-menu__identity">
                  <strong>{accountName}</strong>
                  <small>{accountLabel}</small>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={accountMenuOpen
                    ? 'admin-account-menu__chevron admin-account-menu__chevron--open'
                    : 'admin-account-menu__chevron'}
                  size={16}
                />
              </button>

              {accountMenuOpen ? (
                <div
                  aria-label="Opções da conta"
                  className="admin-account-menu__popover"
                  id={ADMIN_ACCOUNT_MENU_ID}
                  role="menu"
                >
                  <div className="admin-account-menu__summary" role="presentation">
                    <strong>{accountName}</strong>
                    <small>{accountEmail}</small>
                  </div>
                  <Link
                    onClick={() => setAccountMenuOpen(false)}
                    role="menuitem"
                    to="/admin/configuracoes"
                  >
                    <Building2 aria-hidden="true" size={16} />
                    Minha imobiliária
                  </Link>
                  <Link
                    onClick={() => setAccountMenuOpen(false)}
                    role="menuitem"
                    to="/minha-conta"
                  >
                    <UserRound aria-hidden="true" size={16} />
                    Conta
                  </Link>
                  <button onClick={handleLogout} role="menuitem" type="button">
                    <LogOut aria-hidden="true" size={16} />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet context={adminData} />
        </main>
      </div>
    </div>
  )
}
