import { FolderOpen } from 'lucide-react'
import type { CSSProperties } from 'react'
import { AdminPageHeader, EmptyState } from '../components/AdminUI'
import { useBlogAdminWorkspace } from './AdminBlogShell'

export function AdminBlogCategoriesPage() {
  const { categories } = useBlogAdminWorkspace()
  const colors = ['#1b713f', '#176b9b', '#2f8051', '#326f91']

  return (
    <div className="blog-admin-stack">
      <AdminPageHeader description="Organize os conteúdos por temas e facilite a navegação dos leitores." meta={`${categories.length} categorias`} title="Categorias" />
      <section className="blog-category-admin-grid">
        {categories.map((category, index) => {
          const style = { '--blog-category-color': colors[index % colors.length] } as CSSProperties
          return (
            <article className="blog-category-admin-card" key={category.id} style={style}>
              <div className="blog-category-admin-card__icon"><FolderOpen size={19} /></div>
              <div><strong>{category.name}</strong><span>{category.slug}</span></div>
              <p>{category.description}</p>
              <small>{category.postCount} {category.postCount === 1 ? 'publicação' : 'publicações'}</small>
            </article>
          )
        })}
        {!categories.length ? <EmptyState description="As categorias criadas aparecerão aqui." title="Nenhuma categoria cadastrada" /> : null}
      </section>
    </div>
  )
}
