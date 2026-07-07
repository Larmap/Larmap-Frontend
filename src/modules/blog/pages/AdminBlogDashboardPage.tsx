import { CalendarClock, FileText, FolderOpen, PencilLine, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBlogAdminWorkspace } from './AdminBlogShell'
import { BLOG_STATUS_LABELS } from '../constants'
import { formatBlogDateTime, getPostStatusDate } from '../utils'

export function AdminBlogDashboardPage() {
  const { loading, metrics, posts } = useBlogAdminWorkspace()
  const recentPosts = posts.slice(0, 5)

  return (
    <div className="blog-admin-stack">
      <section className="blog-admin-heading">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Blog LarMap</h1>
          <p>Resumo editorial com dados mockados e pronto para integração com API.</p>
        </div>
        <Link className="primary-button" to="/admin/blog/posts/new">
          <PencilLine size={17} />
          <span>Criar postagem</span>
        </Link>
      </section>

      <section className="blog-admin-metric-grid" aria-label="Resumo do blog">
        <MetricCard icon={FileText} label="Total de Postagens" value={metrics.totalPosts} />
        <MetricCard icon={Send} label="Publicadas" tone="green" value={metrics.published} />
        <MetricCard icon={CalendarClock} label="Agendadas" tone="blue" value={metrics.scheduled} />
        <MetricCard icon={PencilLine} label="Rascunhos" tone="warning" value={metrics.drafts} />
        <MetricCard icon={FolderOpen} label="Categorias" value={metrics.categories} />
      </section>

      <section className="panel blog-admin-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Editorial</span>
            <h2>Postagens recentes</h2>
          </div>
          <Link className="text-link" to="/admin/blog/posts">
            Ver todas
          </Link>
        </div>

        <div className="blog-admin-activity-list">
          {recentPosts.map((post) => (
            <Link className="blog-admin-activity-row" key={post.id} to={`/admin/blog/posts/${post.id}/edit`}>
              <img alt="" src={post.coverImage.url} />
              <div>
                <strong>{post.title}</strong>
                <span>
                  {post.category.name} | {BLOG_STATUS_LABELS[post.status]} | {formatBlogDateTime(getPostStatusDate(post))}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {loading ? <p className="empty-copy">Atualizando dados do blog...</p> : null}
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof FileText
  label: string
  tone?: 'blue' | 'green' | 'warning'
  value: number
}) {
  return (
    <article className={`blog-admin-metric-card${tone ? ` blog-admin-metric-card--${tone}` : ''}`}>
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value.toLocaleString('pt-BR')}</strong>
    </article>
  )
}
