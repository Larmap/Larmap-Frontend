import {
  BarChart3,
  Bell,
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquareText,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { leadsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useAdminData } from '../hooks/useAdminData'
import type { Lead } from '../types/api'
import { updateLocalLeads } from '../utils/localLeads'
import { BrandLogo } from './BrandLogo'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/imoveis', label: 'Imóveis', icon: Map },
  { to: '/admin/corretores', label: 'Corretores', icon: Users },
  { to: '/admin/leads', label: 'Leads', icon: MessageSquareText, badge: true },
  { to: '/admin/desempenho', label: 'Desempenho', icon: BarChart3 },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

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
  const { company, logout, token, user } = useAuth()
  const adminData = useAdminData(token)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationSnapshot, setNotificationSnapshot] = useState<Lead[]>([])
  const unreadLeads = useMemo(() => adminData.leads.filter((lead) => !lead.viewed), [adminData.leads])
  const recentLeads = useMemo(
    () =>
      [...adminData.leads]
        .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
        .slice(0, 5),
    [adminData.leads],
  )
  const newLeadsCount = unreadLeads.length
  const accountLabel = user?.role === 'agent' ? 'Corretor' : 'Imobiliária'
  const visibleNotifications = notificationSnapshot.length ? notificationSnapshot : recentLeads
  const notificationMenuLabel = notificationSnapshot.length
    ? notificationSnapshot.length === 1
      ? '1 novo lead'
      : `${notificationSnapshot.length} novos leads`
    : 'Leads recentes'

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

  function toggleNotifications() {
    const shouldOpen = !notificationsOpen
    setNotificationsOpen(shouldOpen)

    if (!shouldOpen) return

    const nextSnapshot = unreadLeads.length ? unreadLeads : recentLeads
    setNotificationSnapshot(nextSnapshot)
    void markLeadsAsRead(unreadLeads)
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-logo" to="/admin/dashboard">
          <BrandLogo className="admin-logo__brand" />
        </Link>

        <nav className="admin-nav" aria-label="Navegação administrativa">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'
                }
                key={item.to}
                to={item.to}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && newLeadsCount ? (
                  <strong className="admin-nav__badge">{newLeadsCount}</strong>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <Link className="admin-nav__link admin-nav__link--external" to="/mapa" target="_blank">
          <ExternalLink size={17} />
          <span>Mapa público</span>
        </Link>

        <button className="admin-logout" onClick={logout} type="button">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-account">
            <span>{accountLabel}</span>
            <strong>{user?.name ?? company?.name ?? 'LarMap'}</strong>
          </div>

          <div className="admin-topbar__actions">
            <div className="admin-notification-wrap">
              <button
                aria-label={newLeadsCount ? `${newLeadsCount} novos leads` : 'Notificações'}
                aria-expanded={notificationsOpen}
                className={newLeadsCount ? 'admin-notification admin-notification--unread' : 'admin-notification'}
                onClick={toggleNotifications}
                type="button"
              >
                <Bell size={17} />
                <span>Notificações</span>
                {newLeadsCount ? <strong className="admin-notification__count">{newLeadsCount}</strong> : null}
              </button>
              {notificationsOpen ? (
                <div className="admin-notification-menu" role="dialog" aria-label="Notificações de leads">
                  <div className="admin-notification-menu__header">
                    <strong>Notificações</strong>
                    <span>{notificationMenuLabel}</span>
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

            <div className="admin-company-pill">
              {user?.role === 'agent' ? <UserRound size={17} /> : <Building2 size={17} />}
              <span>{company?.email ?? user?.email ?? 'Conta ativa'}</span>
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
