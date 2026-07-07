import { useCallback, useEffect, useState } from 'react'
import { blogService } from '../services/blog.service'
import type { BlogAuthor, BlogCategory, BlogDashboardMetrics, BlogPost, MediaFile } from '../types'

interface BlogAdminData {
  authors: BlogAuthor[]
  categories: BlogCategory[]
  media: MediaFile[]
  metrics: BlogDashboardMetrics
  posts: BlogPost[]
}

const emptyMetrics: BlogDashboardMetrics = {
  categories: 0,
  drafts: 0,
  published: 0,
  scheduled: 0,
  totalPosts: 0,
}

export function useBlogAdminData() {
  const [data, setData] = useState<BlogAdminData>({
    authors: [],
    categories: [],
    media: [],
    metrics: emptyMetrics,
    posts: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [posts, categories, media, authors, metrics] = await Promise.all([
        blogService.getPosts(),
        blogService.getCategories(),
        blogService.getMedia(),
        blogService.getAuthors(),
        blogService.getDashboardMetrics(),
      ])
      setData({ authors, categories, media, metrics, posts })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar dados do blog.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...data, error, loading, reload }
}
