import { FolderOpen } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useBlogAdminWorkspace } from './AdminBlogShell'

export function AdminBlogCategoriesPage() {
  const { categories } = useBlogAdminWorkspace()

  return (
    <div className="blog-admin-stack">
      <section className="blog-admin-heading blog-admin-heading--compact">
        <div>
          <span className="eyebrow">{categories.length} categorias</span>
          <h1>Categorias</h1>
          <p>Filtros editoriais mockados para organizar os conteúdos públicos do Blog.</p>
        </div>
      </section>

      <section className="blog-category-admin-grid">
        {categories.map((category) => {
          const style = { '--blog-category-color': category.color } as CSSProperties

          return (
            <article className="blog-category-admin-card" key={category.id} style={style}>
              <div className="blog-category-admin-card__icon">
                <FolderOpen size={19} />
              </div>
              <div>
                <strong>{category.name}</strong>
                <span>{category.slug}</span>
              </div>
              <p>{category.description}</p>
              <small>{category.postCount} postagens</small>
            </article>
          )
        })}
      </section>
    </div>
  )
}
