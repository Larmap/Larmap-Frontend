import { ExternalLink, FileText, Images, LayoutDashboard, Tags } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { BrandLogo } from '../../../components/BrandLogo'

const adminBlogNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/blog' },
  { icon: FileText, label: 'Postagens', to: '/admin/blog/posts' },
  { icon: Tags, label: 'Categorias', to: '/admin/blog/categories' },
  { icon: Images, label: 'Mídias', to: '/admin/blog/media' },
]

export function AdminSidebar() {
  return (
    <aside className="blog-admin-sidebar">
      <Link className="blog-admin-sidebar__logo" to="/admin/blog">
        <BrandLogo />
      </Link>

      <nav className="blog-admin-sidebar__nav" aria-label="Administracao do blog">
        {adminBlogNavItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'blog-admin-sidebar__link blog-admin-sidebar__link--active' : 'blog-admin-sidebar__link'
              }
              end={item.to === '/admin/blog'}
              key={item.to}
              to={item.to}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <Link className="blog-admin-sidebar__link blog-admin-sidebar__link--external" target="_blank" to="/blog">
        <ExternalLink size={17} />
        <span>Ver blog público</span>
      </Link>
    </aside>
  )
}
