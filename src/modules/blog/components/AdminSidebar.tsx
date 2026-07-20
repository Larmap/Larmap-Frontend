import { ExternalLink, FileText, Images, LayoutDashboard, Tags, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { BrandLogo } from '../../../components/BrandLogo'

const adminBlogNavItems = [
  { icon: LayoutDashboard, label: 'Visão geral', to: '/admin/blog' },
  { icon: FileText, label: 'Publicações', to: '/admin/blog/posts' },
  { icon: Tags, label: 'Categorias', to: '/admin/blog/categories' },
  { icon: Images, label: 'Mídias', to: '/admin/blog/media' },
]

export function AdminSidebar({ onClose, open = false }: { onClose?: () => void; open?: boolean }) {
  return (
    <>
      {open ? <button aria-label="Fechar menu" className="blog-admin-sidebar__backdrop" onClick={onClose} type="button" /> : null}
      <aside className={open ? 'blog-admin-sidebar blog-admin-sidebar--open' : 'blog-admin-sidebar'}>
        <div className="blog-admin-sidebar__brand">
          <Link className="blog-admin-sidebar__logo" onClick={onClose} to="/admin/blog"><BrandLogo /></Link>
          <button aria-label="Fechar menu" className="admin-icon-button blog-admin-sidebar__close" onClick={onClose} type="button"><X size={20} /></button>
        </div>
        <span className="blog-admin-sidebar__module">LarMap Explica</span>
        <nav className="blog-admin-sidebar__nav" aria-label="Administração do LarMap Explica">
          {adminBlogNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink className={({ isActive }) => isActive ? 'blog-admin-sidebar__link blog-admin-sidebar__link--active' : 'blog-admin-sidebar__link'} end={item.to === '/admin/blog'} key={item.to} onClick={onClose} to={item.to}>
                <Icon aria-hidden="true" size={19} /><span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <Link className="blog-admin-sidebar__link blog-admin-sidebar__link--external" onClick={onClose} target="_blank" to="/blog"><ExternalLink size={18} /><span>Ver LarMap Explica</span></Link>
      </aside>
    </>
  )
}
