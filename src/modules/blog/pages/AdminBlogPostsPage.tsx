import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AdminPageHeader, AdminSurface, AdminToast, ConfirmDialog } from '../components/AdminUI'
import { AdminToolbar } from '../components/AdminToolbar'
import { PostsTable } from '../components/PostsTable'
import { blogService } from '../services/blog.service'
import type { BlogPost, BlogStatus } from '../types'
import { getPostStatusDate } from '../utils'
import { useBlogAdminWorkspace } from './AdminBlogShell'

type StatusFilter = 'all' | BlogStatus | 'archived'

export function AdminBlogPostsPage() {
  const { categories, error, loading, posts, reload } = useBlogAdminWorkspace()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    const routeNotice = (location.state as { notice?: string } | null)?.notice
    if (routeNotice) setNotice(routeNotice)
  }, [location.state])

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return posts
      .filter((post) => !normalizedQuery || post.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      .filter((post) => status === 'all' || (status !== 'archived' && post.status === status))
      .filter((post) => category === 'all' || post.category.id === category)
      .sort((a, b) => {
        const difference = new Date(getPostStatusDate(b)).getTime() - new Date(getPostStatusDate(a)).getTime()
        return sort === 'oldest' ? -difference : difference
      })
  }, [category, posts, query, sort, status])

  async function confirmDelete() {
    if (!deleteTarget) return
    await blogService.deletePost(deleteTarget.id)
    setDeleteTarget(null)
    setNotice('Publicação excluída.')
    await reload()
  }

  async function handleDuplicate(post: BlogPost) {
    await blogService.duplicatePost(post.id)
    setNotice('Publicação duplicada como rascunho.')
    await reload()
  }

  return (
    <div className="blog-admin-stack">
      <AdminPageHeader action={<Link className="admin-button admin-button--primary" to="/admin/blog/posts/new"><Plus size={17} /> Nova publicação</Link>} description="Gerencie os conteúdos publicados, agendados e salvos como rascunho." meta={`${posts.length} publicações`} title="Publicações" />
      <AdminSurface className="admin-posts-surface">
        <AdminToolbar>
          <label className="admin-search-field"><span className="sr-only">Buscar por título</span><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título" type="search" value={query} /></label>
          <label><span className="sr-only">Filtrar por status</span><select onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}><option value="all">Todas</option><option value="published">Publicadas</option><option value="scheduled">Agendadas</option><option value="draft">Rascunhos</option><option value="archived">Arquivadas</option></select></label>
          <label><span className="sr-only">Filtrar por categoria</span><select onChange={(event) => setCategory(event.target.value)} value={category}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="sr-only">Ordenar por data</span><select onChange={(event) => setSort(event.target.value)} value={sort}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option></select></label>
        </AdminToolbar>
        {loading ? <p className="admin-loading">Carregando publicações...</p> : <PostsTable onDelete={setDeleteTarget} onDuplicate={handleDuplicate} posts={filteredPosts} />}
      </AdminSurface>
      <AdminToast message={notice} />
      {error ? <AdminToast message={error} tone="error" /> : null}
      <ConfirmDialog confirmLabel="Excluir" description="Esta ação não poderá ser desfeita." onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} open={Boolean(deleteTarget)} title="Excluir publicação?" />
    </div>
  )
}
