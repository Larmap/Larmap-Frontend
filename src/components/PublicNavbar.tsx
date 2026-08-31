import {
  Bookmark,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { featureFlags } from '../config/features'
import { BrandLogo } from './BrandLogo'

type PublicNavSection = 'rent' | 'sale' | 'news' | 'blog' | 'map'

export function PublicNavbar() {
  const {
    adminHomePath,
    company,
    isAuthenticated,
    logout,
    sessionKind,
    user,
  } = useAuth()
  const location = useLocation()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const isCommon = user?.accessRole === 'COMMON'
  const accountName = user?.name ?? company?.name ?? 'Conta LarMap'
  const accountEmail = user?.email ?? company?.email ?? ''
  const isLegacyCompany = sessionKind === 'LEGACY_COMPANY_SESSION'
  const hasAdminAccess = isAuthenticated && (!isCommon || isLegacyCompany)

  useEffect(() => {
    setAccountMenuOpen(false)
  }, [location.hash, location.pathname, location.search])

  useEffect(() => {
    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountMenuOpen(false)
    }

    document.addEventListener('mousedown', closeAccountMenu)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', closeAccountMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function isNavItemActive(section: PublicNavSection) {
    if (section === 'news') return location.pathname === '/novidades'
    if (section === 'blog') return location.pathname === '/blog' || location.pathname.startsWith('/blog/')
    const searchParams = new URLSearchParams(location.search)
    const listingType = searchParams.get('type')
    const searchQuery = searchParams.get('q')?.trim()

    if (section === 'rent') {
      return (
        location.pathname === '/aluguel' ||
        (location.pathname === '/mapa' && listingType === 'aluguel')
      )
    }
    if (section === 'sale') {
      return (
        location.pathname === '/compra' ||
        (location.pathname === '/mapa' && (listingType === 'compra' || listingType === 'venda'))
      )
    }
    if (section === 'map') return location.pathname === '/mapa' && !listingType && !searchQuery
    return false
  }

  function handleLogout() {
    setAccountMenuOpen(false)
    logout()
  }

  return (
    <header className="home-header">
      <div className="home-header__inner">
        <BrandLogo to="/" />
        <nav className="home-nav" aria-label="Navegação principal">
          <Link
            aria-current={isNavItemActive('rent') ? 'page' : undefined}
            className={isNavItemActive('rent') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/aluguel"
          >
            Aluguel
          </Link>
          <Link
            aria-current={isNavItemActive('sale') ? 'page' : undefined}
            className={isNavItemActive('sale') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/compra"
          >
            Compra
          </Link>
          <Link
            aria-current={isNavItemActive('news') ? 'page' : undefined}
            className={isNavItemActive('news') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/novidades"
          >
            Novidades
          </Link>
          <Link
            aria-current={isNavItemActive('blog') ? 'page' : undefined}
            className={isNavItemActive('blog') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/blog"
          >
            Blog
          </Link>
          <Link
            aria-current={isNavItemActive('map') ? 'page' : undefined}
            className={
              isNavItemActive('map')
                ? 'home-nav__link home-nav__link--active home-nav__link--featured'
                : 'home-nav__link home-nav__link--featured'
            }
            to="/mapa"
          >
            Mapa interativo
          </Link>

          <div className="public-account-menu" ref={accountMenuRef}>
            <button
              aria-controls="public-account-popover"
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label={isAuthenticated ? 'Abrir menu da conta' : 'Entrar'}
              className={accountMenuOpen ? 'home-nav__icon home-nav__icon--active' : 'home-nav__icon'}
              onClick={() => setAccountMenuOpen((current) => !current)}
              title={isAuthenticated ? 'Minha conta' : 'Entrar'}
              type="button"
            >
              <UserRound size={19} strokeWidth={1.9} />
            </button>

            {accountMenuOpen ? (
              <div className="public-account-popover" id="public-account-popover" role="menu">
                {isAuthenticated ? (
                  <>
                    <div className="public-account-popover__identity">
                      <span aria-hidden="true"><UserRound size={18} /></span>
                      <div>
                        <strong>{accountName}</strong>
                        {accountEmail ? <small>{accountEmail}</small> : null}
                      </div>
                    </div>

                    <Link role="menuitem" to="/minha-conta">
                      <UserRound size={16} />
                      Minha conta
                    </Link>

                    {isCommon ? (
                      <>
                        <Link role="menuitem" to="/favoritos">
                          <Heart size={16} />
                          Imóveis salvos
                        </Link>
                        <Link role="menuitem" to="/minha-conta#artigos-salvos">
                          <Bookmark size={16} />
                          Artigos salvos
                        </Link>
                      </>
                    ) : null}

                    {hasAdminAccess ? (
                      <Link role="menuitem" to={adminHomePath}>
                        <LayoutDashboard size={16} />
                        Área administrativa
                      </Link>
                    ) : null}

                    <button onClick={handleLogout} role="menuitem" type="button">
                      <LogOut size={16} />
                      Sair
                    </button>
                  </>
                ) : (
                  <>
                    <div className="public-account-popover__intro">
                      <strong>Sua conta LarMap</strong>
                      <p>Entre para acessar sua conta LarMap.</p>
                    </div>
                    <Link className="public-account-popover__primary" role="menuitem" state={{ from: location }} to="/login">
                      <LogIn size={16} />
                      Entrar
                    </Link>
                    {featureFlags.PUBLIC_REGISTRATION ? (
                      <Link role="menuitem" to="/register">
                        <UserPlus size={16} />
                        Crie sua conta
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </header>
  )
}
