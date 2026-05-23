import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BrandLogo } from './BrandLogo'

const navItems = [
  { to: '/app', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/app/users', label: 'Equipe', icon: Users },
  { to: '/app/properties', label: 'Imóveis', icon: Map },
]

export function AppShell() {
  const { company, logout } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BrandLogo compact to="/app" />

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <Link className="nav-link nav-link--public" rel="noreferrer" to="/mapa" target="_blank">
          <ExternalLink size={17} />
          <span>Mapa público</span>
        </Link>

        <button className="sidebar-logout" type="button" onClick={logout}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button topbar-menu" type="button" title="Menu">
              <Menu size={18} />
            </button>
            <div>
              <span>Imobiliária</span>
              {company?.name ? (
                <strong>{company.name}</strong>
              ) : (
                <strong className="topbar-brand">
                  <img
                    aria-hidden="true"
                    className="brand-logo__icon"
                    src="/assets/icon-larmap.png"
                    alt=""
                  />
                  <span className="brand-logo__name">
                    <span className="brand-logo__name-lar">Lar</span>
                    <span className="brand-logo__name-map">Map</span>
                  </span>
                </strong>
              )}
            </div>
          </div>

          <div className="company-pill">
            <Building2 size={17} />
            <span>{company?.email ?? 'Conta ativa'}</span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
