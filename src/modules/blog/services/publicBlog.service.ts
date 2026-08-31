import { featureFlags } from '../../../config/features'
import { blogCategoriesMock } from '../mocks/categories.mock'
import { blogPostsMock } from '../mocks/posts.mock'
import type { BlogCategory, BlogPost, BlogPostFilters } from '../types'
import { matchesBlogSearch } from '../utils'
import { blogService } from './blog.service'

/**
 * Transitional public-blog adapter.
 *
 * The public API is queried with its temporary maximum before applying local
 * filters. That lets API posts and the eight legacy posts share one stable
 * result set without duplicate posts across client-side filters/pages. Remove
 * this workaround once all legacy posts are persisted and server pagination is
 * the canonical public contract.
 */
export const PUBLIC_BLOG_API_LIMIT = 50

function slugKey(slug: string) {
  return slug.trim().toLowerCase()
}

function getPublishedTimestamp(post: BlogPost) {
  const timestamp = Date.parse(post.publishedAt ?? '')
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

function isExpectedPublicApiFailure(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: unknown }).status
    : undefined
  return status === 404 || status === 502 || status === 503 || status === 504 || status === 0 || status === 408
}

function reportPublicApiDiagnostic(operation: string, error: unknown) {
  // Known cutover failures are expected while the current backend is live.
  // Unexpected errors remain diagnosable in development without noisy browser
  // logs in production or an error state that hides legacy content.
  const isDevelopment = Boolean((import.meta.env ?? {}).DEV)
  if (!isDevelopment || isExpectedPublicApiFailure(error)) return
  console.warn(`[blog] Public API ${operation} failed; using legacy content when available.`, error)
}

function applyPublicFilters(posts: BlogPost[], filters: BlogPostFilters) {
  const filtered = posts.filter((post) => {
    if (filters.status && post.status !== filters.status) return false
    if (filters.categorySlug && filters.categorySlug !== 'todos' && post.category.slug !== filters.categorySlug) return false
    if (filters.excludeSlug && slugKey(post.slug) === slugKey(filters.excludeSlug)) return false
    if (filters.query && !matchesBlogSearch(post, filters.query)) return false
    if (filters.featured !== undefined && Boolean(post.featured) !== filters.featured) return false
    return true
  })

  const sorted = [...filtered].sort((first, second) => getPublishedTimestamp(second) - getPublishedTimestamp(first))
  return filters.limit ? sorted.slice(0, filters.limit) : sorted
}

/** API posts replace, rather than supplement, a legacy post with the same slug. */
export function mergeWithLegacyPosts(apiPosts: BlogPost[], legacyPosts = blogPostsMock) {
  const bySlug = new Map<string, BlogPost>()

  for (const post of legacyPosts) {
    if (post.slug.trim()) bySlug.set(slugKey(post.slug), post)
  }

  for (const post of apiPosts) {
    if (post.slug.trim()) bySlug.set(slugKey(post.slug), post)
  }

  return [...bySlug.values()].sort((first, second) => getPublishedTimestamp(second) - getPublishedTimestamp(first))
}

/** API category metadata replaces matching legacy metadata; counts come from the final post set. */
export function mergeWithLegacyCategories(
  apiCategories: BlogCategory[],
  posts: BlogPost[],
  legacyCategories = blogCategoriesMock,
) {
  const bySlug = new Map<string, BlogCategory>()

  for (const category of legacyCategories) {
    if (category.slug.trim()) bySlug.set(slugKey(category.slug), category)
  }

  for (const category of apiCategories) {
    if (category.slug.trim()) bySlug.set(slugKey(category.slug), category)
  }

  for (const post of posts) {
    const key = slugKey(post.category.slug)
    if (!bySlug.has(key)) bySlug.set(key, post.category)
  }

  const postCountBySlug = new Map<string, number>()
  for (const post of posts) {
    const key = slugKey(post.category.slug)
    postCountBySlug.set(key, (postCountBySlug.get(key) ?? 0) + 1)
  }

  return [...bySlug.values()]
    .map((category) => ({
      ...category,
      postCount: postCountBySlug.get(slugKey(category.slug)) ?? 0,
    }))
    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
}

async function fetchPublicApiPosts() {
  return blogService.getPosts({ limit: PUBLIC_BLOG_API_LIMIT, status: 'published' })
}

export const publicBlogService = {
  async getPosts(filters: BlogPostFilters = {}) {
    let apiPosts: BlogPost[] = []

    try {
      apiPosts = await fetchPublicApiPosts()
    } catch (error) {
      if (!featureFlags.BLOG_LEGACY_MOCKS) throw error
      reportPublicApiDiagnostic('post listing', error)
    }

    const legacyPosts = featureFlags.BLOG_LEGACY_MOCKS ? blogPostsMock : []
    return applyPublicFilters(mergeWithLegacyPosts(apiPosts, legacyPosts), filters)
  },

  async getPost(slug: string) {
    try {
      return await blogService.getPost(slug)
    } catch (error) {
      const legacyPost = featureFlags.BLOG_LEGACY_MOCKS
        ? blogPostsMock.find((post) => slugKey(post.slug) === slugKey(slug)) ?? null
        : null

      if (legacyPost) {
        reportPublicApiDiagnostic(`post detail for "${slug}"`, error)
        return legacyPost
      }

      throw error
    }
  },

  async getCategories() {
    const [postsResult, categoriesResult] = await Promise.allSettled([
      this.getPosts({ status: 'published' }),
      blogService.getCategories(),
    ])

    if (postsResult.status === 'rejected' && !featureFlags.BLOG_LEGACY_MOCKS) {
      throw postsResult.reason
    }

    const posts = postsResult.status === 'fulfilled' ? postsResult.value : []
    const apiCategories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []

    if (categoriesResult.status === 'rejected') {
      if (!featureFlags.BLOG_LEGACY_MOCKS && !posts.length) throw categoriesResult.reason
      reportPublicApiDiagnostic('category listing', categoriesResult.reason)
    }

    return mergeWithLegacyCategories(
      apiCategories,
      posts,
      featureFlags.BLOG_LEGACY_MOCKS ? blogCategoriesMock : [],
    )
  },
}
