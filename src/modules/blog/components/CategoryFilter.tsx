import { BLOG_CATEGORY_FILTERS } from '../constants'
import type { BlogCategory } from '../types'

interface CategoryFilterProps {
  activeSlug: string
  categories: BlogCategory[]
  onChange: (slug: string) => void
}

export function CategoryFilter({ activeSlug, categories, onChange }: CategoryFilterProps) {
  function getCount(slug: string) {
    if (slug === 'todos') return categories.reduce((total, category) => total + category.postCount, 0)
    return categories.find((category) => category.slug === slug)?.postCount ?? 0
  }

  return (
    <div className="blog-category-filter" aria-label="Categorias do blog">
      {BLOG_CATEGORY_FILTERS.map((category) => {
        const isActive = activeSlug === category.slug

        return (
          <button
            aria-pressed={isActive}
            className={isActive ? 'blog-category-chip blog-category-chip--active' : 'blog-category-chip'}
            key={category.slug}
            onClick={() => onChange(category.slug)}
            type="button"
          >
            <span>{category.label}</span>
            <strong>{getCount(category.slug)}</strong>
          </button>
        )
      })}
    </div>
  )
}
