import { ChevronDown, ExternalLink, LogOut, Menu, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { BLOG_ADMIN_PAGE_TITLES } from '../constants'

function getTitle(pathname: string) {
  if (pathname.endsWith('/edit')) return 'Editar publicação'
  return BLOG_ADMIN_PAGE_TITLES[pathname] ?? 'LarMap Explica'
}

function getAccountRole(role?: string) {
  if (!role) return 'Conta administrativa'
  if (role === 'admin') return 'Administrador'
  if (role === 'manager') return 'Gerente'
  if (role === 'agent') return 'Corretor'
  return role
}

export function AdminTopbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const location = useLocation()
  const { company, logout, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const accountName = user?.name ?? company?.name ?? 'LarMap'
  const initials = accountName.split(' ').slice(0, 2).map((part) => part[0]).join('')

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  return (
    <header className="blog-admin-topbar">
      <div className="blog-admin-topbar__title">
        <button aria-label="Abrir menu" className="admin-icon-button blog-admin-topbar__menu" onClick={onMenuOpen} type="button"><Menu size={21} /></button>
        <div><span>LarMap Explica</span><strong>{getTitle(location.pathname)}</strong></div>
      </div>
      <div className="admin-user-menu" ref={menuRef}>
        <button aria-expanded={menuOpen} aria-haspopup="menu" className="admin-user-menu__trigger" onClick={() => setMenuOpen((current) => !current)} type="button">
          <span aria-hidden="true" className="admin-user-menu__avatar">{initials}</span>
          <span className="admin-user-menu__identity"><strong>{accountName}</strong><small>{getAccountRole(user?.role)}</small></span>
          <ChevronDown aria-hidden="true" size={16} />
        </button>
        {menuOpen ? (
          <div className="admin-user-menu__popover" role="menu">
            <span className="admin-user-menu__placeholder" role="menuitem"><UserRound size={16} /> Minha conta</span>
            <Link onClick={() => setMenuOpen(false)} role="menuitem" target="_blank" to="/"><ExternalLink size={16} /> Ver site</Link>
            <button onClick={logout} role="menuitem" type="button"><LogOut size={16} /> Sair</button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
