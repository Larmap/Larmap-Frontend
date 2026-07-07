import { Plus, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { BLOG_ADMIN_PAGE_TITLES } from '../constants'

interface AdminTopbarProps {
  onRefresh?: () => void
}

function getTitle(pathname: string) {
  if (pathname.endsWith('/edit')) return 'Editar postagem'
  return BLOG_ADMIN_PAGE_TITLES[pathname] ?? 'Blog'
}

export function AdminTopbar({ onRefresh }: AdminTopbarProps) {
  const location = useLocation()
  const { company, user } = useAuth()

  return (
    <header className="blog-admin-topbar">
      <div>
        <span>Admin Blog</span>
        <strong>{getTitle(location.pathname)}</strong>
      </div>

      <div className="blog-admin-topbar__actions">
        <span className="blog-admin-account">{user?.name ?? company?.name ?? 'LarMap'}</span>
        {onRefresh ? (
          <button className="secondary-button" onClick={onRefresh} type="button">
            <RefreshCw size={17} />
            <span>Atualizar</span>
          </button>
        ) : null}
        <Link className="primary-button" to="/admin/blog/posts/new">
          <Plus size={17} />
          <span>Nova postagem</span>
        </Link>
      </div>
    </header>
  )
}
