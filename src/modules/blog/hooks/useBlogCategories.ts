import { useEffect, useState } from 'react'
import { blogService } from '../services/blog.service'
import type { BlogCategory } from '../types'

export function useBlogCategories() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')

      try {
        const nextCategories = await blogService.getCategories()
        if (active) setCategories(nextCategories)
      } catch (caughtError) {
        if (active) setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar categorias.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return { categories, error, loading }
}
