import { CalendarClock, FileText, PencilLine, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminPageHeader, AdminSurface, EmptyState, StatusIndicator } from '../components/AdminUI'
import { formatBlogDateTime, getPostStatusDate } from '../utils'
import { useBlogAdminWorkspace } from './AdminBlogShell'

export function AdminBlogDashboardPage() {
  const { error, loading, metrics, posts } = useBlogAdminWorkspace()
  const recentPosts = posts.slice(0, 5)
  const scheduledPosts = posts.filter((post) => post.status === 'scheduled').slice(0, 4)

  return (
    <div className="blog-admin-stack">
      <AdminPageHeader
        action={<Link className="admin-button admin-button--primary" to="/admin/blog/posts/new"><PencilLine size={17} /> Nova publicação</Link>}
        description="Acompanhe as publicações e organize o conteúdo editorial da plataforma."
        title="LarMap Explica"
      />

      <section className="blog-admin-metric-grid" aria-label="Indicadores editoriais">
        <MetricCard icon={FileText} label="Total de publicações" value={metrics.totalPosts} />
        <MetricCard icon={Send} label="Publicadas" value={metrics.published} />
        <MetricCard icon={CalendarClock} label="Agendadas" value={metrics.scheduled} />
        <MetricCard icon={PencilLine} label="Rascunhos" value={metrics.drafts} />
      </section>

      <AdminSurface className="admin-editorial-list">
        <div className="admin-section-heading">
          <div><h2>Publicações recentes</h2><p>Conteúdos atualizados mais recentemente.</p></div>
          <Link className="admin-text-link" to="/admin/blog/posts">Ver todas</Link>
        </div>
        {recentPosts.length ? (
          <div className="admin-editorial-list__rows">
            {recentPosts.map((post) => (
              <article className="admin-editorial-row" key={post.id}>
                <img alt="" src={post.coverImage.url} />
                <div className="admin-editorial-row__title"><Link to={`/admin/blog/posts/${post.id}/edit`}>{post.title}</Link><span>{post.category.name}</span></div>
                <StatusIndicator status={post.status} />
                <time dateTime={getPostStatusDate(post)}>{formatBlogDateTime(getPostStatusDate(post))}</time>
                <Link aria-label={`Editar ${post.title}`} className="admin-row-action" to={`/admin/blog/posts/${post.id}/edit`}>Editar</Link>
              </article>
            ))}
          </div>
        ) : loading ? <p className="admin-loading">Carregando publicações...</p> : <EmptyState description="Crie a primeira publicação para começar a organizar o conteúdo." title="Nenhuma publicação cadastrada" />}
      </AdminSurface>

      <AdminSurface>
        <div className="admin-section-heading"><div><h2>Próximas publicações</h2><p>Acompanhe o calendário editorial.</p></div></div>
        {scheduledPosts.length ? (
          <div className="admin-schedule-list">
            {scheduledPosts.map((post) => (
              <Link key={post.id} to={`/admin/blog/posts/${post.id}/edit`}><CalendarClock size={17} /><span><strong>{post.title}</strong><small>{formatBlogDateTime(getPostStatusDate(post))}</small></span></Link>
            ))}
          </div>
        ) : <EmptyState description="Programe um conteúdo para manter o LarMap Explica sempre atualizado." title="Nenhuma publicação agendada." />}
      </AdminSurface>

      {error ? <p className="admin-inline-error">{error}</p> : null}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <article className="admin-metric-card">
      <div><span>{label}</span><strong>{value.toLocaleString('pt-BR')}</strong></div>
      <Icon aria-hidden="true" size={19} />
    </article>
  )
}
