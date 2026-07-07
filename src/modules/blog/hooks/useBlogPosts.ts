import { useCallback, useEffect, useState } from 'react'
import { blogService } from '../services/blog.service'
import type { BlogPost, BlogPostFilters } from '../types'

export function useBlogPosts(filters: BlogPostFilters = {}) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const categorySlug = filters.categorySlug
  const excludeSlug = filters.excludeSlug
  const limit = filters.limit
  const query = filters.query
  const status = filters.status

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const nextPosts = await blogService.getPosts({ categorySlug, excludeSlug, limit, query, status })
      setPosts(nextPosts)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar as postagens.')
    } finally {
      setLoading(false)
    }
  }, [categorySlug, excludeSlug, limit, query, status])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const nextPosts = await blogService.getPosts({ categorySlug, excludeSlug, limit, query, status })
        if (active) setPosts(nextPosts)
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar as postagens.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [categorySlug, excludeSlug, limit, query, status])

  return { error, loading, posts, reload }
}
