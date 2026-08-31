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

export function useBlogAdminData(token: string | null) {
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

    if (!token) {
      setError('Sessão não encontrada.')
      setLoading(false)
      return
    }

    try {
      const [published, drafts, scheduled, archived, categories, media, authors, metrics] = await Promise.all([
        blogService.getPosts({ status: 'published' }, token),
        blogService.getPosts({ status: 'draft' }, token),
        blogService.getPosts({ status: 'scheduled' }, token),
        blogService.getPosts({ status: 'archived' }, token),
        blogService.getCategories(),
        blogService.getMedia(token),
        blogService.getAuthors(token),
        blogService.getDashboardMetrics(token),
      ])
      setData({ authors, categories, media, metrics, posts: [...published, ...drafts, ...scheduled, ...archived] })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar dados do blog.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...data, error, loading, reload }
}
