import { useEffect, useState } from 'react'
import { blogService } from '../services/blog.service'
import type { BlogPost } from '../types'

export function useBlogPost(identifier?: string) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      if (!identifier) {
        setPost(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const nextPost = await blogService.getPost(identifier)
        if (active) setPost(nextPost)
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar a postagem.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [identifier])

  return { error, loading, post }
}
