import { Copy, Edit3, Eye, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { BlogPost } from '../types'
import { formatBlogDateTime, getPostStatusDate } from '../utils'
import { EmptyState, StatusIndicator } from './AdminUI'

interface PostsTableProps {
  onDelete: (post: BlogPost) => void
  onDuplicate: (post: BlogPost) => void
  posts: BlogPost[]
}

export function PostsTable({ onDelete, onDuplicate, posts }: PostsTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  if (!posts.length) {
    return <EmptyState description="Tente alterar os filtros ou pesquisar outro termo." title="Nenhuma publicação encontrada" />
  }

  return (
    <div className="blog-admin-table-wrap">
      <table className="blog-admin-table">
        <thead><tr><th>Publicação</th><th>Categoria</th><th>Autor</th><th>Status</th><th>Data</th><th><span className="sr-only">Ações</span></th></tr></thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td data-label="Publicação"><div className="admin-post-cell"><img className="blog-admin-table__thumb" alt="" src={post.coverImage.url} /><div><strong>{post.title}</strong><span>{post.summary}</span></div></div></td>
              <td data-label="Categoria">{post.category.name}</td>
              <td data-label="Autor">{post.author.name}</td>
              <td data-label="Status"><StatusIndicator status={post.status} /></td>
              <td data-label="Data"><time dateTime={getPostStatusDate(post)}>{formatBlogDateTime(getPostStatusDate(post))}</time></td>
              <td className="blog-admin-table__actions-cell">
                <div className="admin-actions-menu">
                  <button aria-expanded={openMenu === post.id} aria-haspopup="menu" aria-label={`Ações para ${post.title}`} className="admin-icon-button" onClick={() => setOpenMenu((current) => current === post.id ? null : post.id)} type="button"><MoreHorizontal size={19} /></button>
                  {openMenu === post.id ? (
                    <div className="admin-actions-menu__popover" role="menu">
                      <Link onClick={() => setOpenMenu(null)} role="menuitem" target="_blank" to={`/blog/${post.slug}`}><Eye size={15} /> Visualizar</Link>
                      <Link onClick={() => setOpenMenu(null)} role="menuitem" to={`/admin/blog/posts/${post.id}/edit`}><Edit3 size={15} /> Editar</Link>
                      <button onClick={() => { setOpenMenu(null); onDuplicate(post) }} role="menuitem" type="button"><Copy size={15} /> Duplicar</button>
                      <button className="admin-actions-menu__danger" onClick={() => { setOpenMenu(null); onDelete(post) }} role="menuitem" type="button"><Trash2 size={15} /> Excluir</button>
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
