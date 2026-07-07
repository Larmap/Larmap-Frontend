import { Copy, Edit3, Eye, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BlogPost } from '../types'
import { formatBlogDateTime, getPostStatusDate } from '../utils'
import { StatusBadge } from './StatusBadge'

interface PostsTableProps {
  onDelete: (post: BlogPost) => void
  onDuplicate: (post: BlogPost) => void
  posts: BlogPost[]
}

export function PostsTable({ onDelete, onDuplicate, posts }: PostsTableProps) {
  if (!posts.length) {
    return (
      <div className="admin-empty">
        <strong>Nenhuma postagem cadastrada</strong>
        <p>Crie a primeira publicacao para iniciar o Blog LarMap.</p>
      </div>
    )
  }

  return (
    <div className="blog-admin-table-wrap">
      <table className="blog-admin-table">
        <thead>
          <tr>
            <th>Imagem</th>
            <th>Título</th>
            <th>Categoria</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                <img className="blog-admin-table__thumb" alt="" src={post.coverImage.url} />
              </td>
              <td>
                <strong>{post.title}</strong>
                <span>{post.slug}</span>
              </td>
              <td>{post.category.name}</td>
              <td>
                <StatusBadge status={post.status} />
              </td>
              <td>{formatBlogDateTime(getPostStatusDate(post))}</td>
              <td>
                <div className="blog-admin-table__actions">
                  <Link className="icon-button" title="Editar" to={`/admin/blog/posts/${post.id}/edit`}>
                    <Edit3 size={15} />
                  </Link>
                  <button className="icon-button" onClick={() => onDuplicate(post)} title="Duplicar" type="button">
                    <Copy size={15} />
                  </button>
                  <Link className="icon-button" target="_blank" title="Visualizar" to={`/blog/${post.slug}`}>
                    <Eye size={15} />
                  </Link>
                  <button
                    className="icon-button icon-button--danger"
                    onClick={() => onDelete(post)}
                    title="Excluir"
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
