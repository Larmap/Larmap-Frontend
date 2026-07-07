import { useMemo, useState } from 'react'
import { PublicFooter } from '../../../components/PublicFooter'
import { PublicNavbar } from '../../../components/PublicNavbar'
import { BlogGrid } from '../components/BlogGrid'
import { CategoryFilter } from '../components/CategoryFilter'
import { HeroSection } from '../components/HeroSection'
import { useBlogCategories } from '../hooks/useBlogCategories'
import { useBlogPosts } from '../hooks/useBlogPosts'
import type { BlogPostFilters } from '../types'

export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('todos')
  const [searchValue, setSearchValue] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const postFilters = useMemo<BlogPostFilters>(
    () => ({
      categorySlug: activeCategory,
      query: submittedSearch,
      status: 'published',
    }),
    [activeCategory, submittedSearch],
  )
  const { categories } = useBlogCategories()
  const { error, loading, posts } = useBlogPosts(postFilters)

  function handleSearch() {
    setSubmittedSearch(searchValue.trim())
  }

  return (
    <main className="blog-page">
      <PublicNavbar />
      <HeroSection onSearch={handleSearch} onSearchChange={setSearchValue} searchValue={searchValue} />

      <section className="blog-content-section">
        <div className="blog-content-section__inner">
          <CategoryFilter activeSlug={activeCategory} categories={categories} onChange={setActiveCategory} />

          <div className="blog-section-heading">
            <span className="eyebrow">{posts.length} conteúdos</span>
            <h2>Últimas publicações</h2>
          </div>

          {error ? <p className="notice notice--error">{error}</p> : null}
          {loading ? <p className="blog-loading">Carregando postagens...</p> : <BlogGrid posts={posts} />}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
