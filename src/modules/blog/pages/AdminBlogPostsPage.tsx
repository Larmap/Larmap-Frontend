import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PostsTable } from '../components/PostsTable'
import { blogService } from '../services/blog.service'
import type { BlogPost } from '../types'
import { useBlogAdminWorkspace } from './AdminBlogShell'

export function AdminBlogPostsPage() {
  const { error, loading, posts, reload } = useBlogAdminWorkspace()
  const [notice, setNotice] = useState('')

  async function handleDelete(post: BlogPost) {
    const confirmed = window.confirm(`Excluir "${post.title}"?`)
    if (!confirmed) return

    await blogService.deletePost(post.id)
    setNotice('Postagem excluída dos mocks.')
    await reload()
  }

  async function handleDuplicate(post: BlogPost) {
    await blogService.duplicatePost(post.id)
    setNotice('Postagem duplicada como rascunho.')
    await reload()
  }

  return (
    <div className="blog-admin-stack">
      <section className="blog-admin-heading blog-admin-heading--compact">
        <div>
          <span className="eyebrow">{posts.length} registros</span>
          <h1>Postagens</h1>
          <p>Gerencie rascunhos, agendamentos e publicações do Blog LarMap.</p>
        </div>
        <Link className="primary-button" to="/admin/blog/posts/new">
          <Plus size={17} />
          <span>Criar nova postagem</span>
        </Link>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}
      {loading ? <p className="blog-loading">Carregando postagens...</p> : null}

      <section className="panel blog-admin-panel">
        <PostsTable onDelete={handleDelete} onDuplicate={handleDuplicate} posts={posts} />
      </section>
    </div>
  )
}
