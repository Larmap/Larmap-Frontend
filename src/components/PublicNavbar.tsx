import { Heart } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canUsePublicFavorites } from '../utils/userAccess'
import { BrandLogo } from './BrandLogo'

type PublicNavSection = 'rent' | 'sale' | 'news' | 'map' | 'favorites'

export function PublicNavbar() {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const showFavoritesButton = canUsePublicFavorites(isAuthenticated, user)

  function isNavItemActive(section: PublicNavSection) {
    if (section === 'favorites') return location.pathname === '/favoritos'
    if (section === 'news') return location.pathname === '/novidades'
    if (location.pathname !== '/mapa') return false

    const searchParams = new URLSearchParams(location.search)
    const listingType = searchParams.get('type')
    const searchQuery = searchParams.get('q')?.trim()

    if (section === 'rent') return listingType === 'aluguel'
    if (section === 'sale') return listingType === 'compra' || listingType === 'venda'
    if (section === 'map') return !listingType && !searchQuery
    return false
  }

  return (
    <header className="home-header">
      <div className="home-header__inner">
        <BrandLogo to="/" />
        <nav className="home-nav" aria-label="Navegacao principal">
          <Link
            aria-current={isNavItemActive('rent') ? 'page' : undefined}
            className={isNavItemActive('rent') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/mapa?type=aluguel"
          >
            Aluguel
          </Link>
          <Link
            aria-current={isNavItemActive('sale') ? 'page' : undefined}
            className={isNavItemActive('sale') ? 'home-nav__link home-nav__link--active' : 'home-nav__link'}
            to="/mapa?type=compra"
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
            aria-current={isNavItemActive('map') ? 'page' : undefined}
            className={isNavItemActive('map') ? 'home-nav__link home-nav__link--active home-nav__link--featured' : 'home-nav__link home-nav__link--featured'}
            to="/mapa"
          >
            Mapa interativo
          </Link>
          {showFavoritesButton ? (
            <Link
              aria-label="Favoritos"
              aria-current={isNavItemActive('favorites') ? 'page' : undefined}
              className={isNavItemActive('favorites') ? 'home-nav__icon home-nav__icon--active' : 'home-nav__icon'}
              title="Favoritos"
              to="/favoritos"
            >
              <Heart size={18} />
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
