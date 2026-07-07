import type { BlogPost, BlogStatus } from '../types'

export function createBlogSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function calculateReadingTime(content: string) {
  const words = stripHtml(content).split(/\s+/).filter(Boolean)
  return Math.max(1, Math.ceil(words.length / 220))
}

export function formatBlogDate(value?: string) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatBlogDateTime(value?: string) {
  if (!value) return 'Sem agendamento'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function getPostDisplayDate(post: Pick<BlogPost, 'publishedAt' | 'scheduledFor' | 'updatedAt'>) {
  return post.publishedAt ?? post.scheduledFor ?? post.updatedAt
}

export function getPostStatusDate(post: Pick<BlogPost, 'publishedAt' | 'scheduledFor' | 'updatedAt' | 'status'>) {
  if (post.status === 'scheduled') return post.scheduledFor ?? post.updatedAt
  if (post.status === 'published') return post.publishedAt ?? post.updatedAt
  return post.updatedAt
}

export function getRelatedBlogPosts(posts: BlogPost[], post: BlogPost, limit = 3) {
  return posts
    .filter((item) => item.slug !== post.slug)
    .sort((first, second) => {
      const firstScore =
        (first.category.id === post.category.id ? 3 : 0) +
        first.tags.filter((tag) => post.tags.some((postTag) => postTag.slug === tag.slug)).length
      const secondScore =
        (second.category.id === post.category.id ? 3 : 0) +
        second.tags.filter((tag) => post.tags.some((postTag) => postTag.slug === tag.slug)).length

      return secondScore - firstScore
    })
    .slice(0, limit)
}

export function matchesBlogSearch(post: BlogPost, query: string) {
  const normalizedQuery = createBlogSlug(query).replace(/-/g, ' ')
  if (!normalizedQuery) return true

  const searchable = [
    post.title,
    post.summary,
    post.category.name,
    post.author.name,
    ...post.tags.map((tag) => tag.name),
  ]
    .map((item) => createBlogSlug(item).replace(/-/g, ' '))
    .join(' ')

  return searchable.includes(normalizedQuery)
}

export function toDateInputValue(value?: string) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export function toTimeInputValue(value?: string) {
  if (!value) return ''
  return new Date(value).toISOString().slice(11, 16)
}

export function buildPublishDateTime(date: string, time: string) {
  if (!date || !time) return undefined
  return new Date(`${date}T${time}:00`).toISOString()
}

export function tagsTextToNames(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function sortPostsByDate(posts: BlogPost[]) {
  return [...posts].sort(
    (first, second) =>
      new Date(getPostStatusDate(second)).getTime() - new Date(getPostStatusDate(first)).getTime(),
  )
}

export function filterPostsByStatus(posts: BlogPost[], status?: BlogStatus) {
  if (!status) return posts
  return posts.filter((post) => post.status === status)
}
