import type { BlogAuthor, BlogCategory, BlogContent, BlogDashboardMetrics, BlogPost, BlogPostFilters, BlogPostInput, BlogTag, MediaFile } from '../types'
import { isTiptapDocument } from '../utils/content'
import { DEFAULT_API_BASE_URL } from '../../../api/publicEndpoints'
import { AUTH_UNAUTHORIZED_EVENT } from '../../../auth/events'

const BLOG_API_BASE_URL = typeof window === 'undefined' ? DEFAULT_API_BASE_URL : '/api'

class BlogApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'BlogApiError'
    this.status = status
    this.code = code
  }
}

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string; code?: string } }

interface ApiPost {
  id: string; title: string; slug: string; summary: string | null; content?: BlogContent; coverImage: string | null
  status: string; featured: boolean; readingTime: number | null; publishedAt: string | null; scheduledFor: string | null
  createdAt: string; updatedAt: string; author: ApiAuthor | null; categories: ApiCategory[]; tags: BlogTag[]
}
interface ApiAuthor { id: string; nome: string; cargo?: string | null; foto?: string | null; bio?: string | null; linkedin?: string | null; instagram?: string | null; publicEmail?: string | null }
interface ApiCategory { id: string; name: string; slug: string; description?: string | null; color?: string | null; icon?: string | null; order?: number; postCount?: number }
interface ApiMedia { id: string; url: string; type: string; filename: string; mimeType?: string | null; size?: number | null; createdAt: string }

async function api<T>(path: string, options: { method?: string; token?: string; body?: unknown; form?: FormData } = {}) {
  const headers = new Headers()
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (!options.form) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${BLOG_API_BASE_URL}${path}`, { method: options.method ?? 'GET', headers, body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)) })
  if (options.token && response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
  const text = await response.text()
  let payload: ApiEnvelope<T> | null = null
  try { payload = text ? JSON.parse(text) as ApiEnvelope<T> : null } catch { throw new BlogApiError('Resposta inválida da API.', response.status) }
  if (!response.ok || payload?.success === false) throw new BlogApiError(payload?.error?.message ?? 'Não foi possível completar a requisição.', response.status, payload?.error?.code)
  if (payload?.data === undefined) throw new BlogApiError('Resposta inválida da API.', response.status)
  return payload.data
}

function status(value: string): BlogPost['status'] {
  return value.toLowerCase() as BlogPost['status']
}
function author(value: ApiAuthor | null): BlogAuthor {
  return { id: value?.id ?? 'unknown', name: value?.nome ?? 'LarMap', role: value?.cargo ?? '', avatarUrl: value?.foto ?? '/assets/Larmap-logo-casas.png', bio: value?.bio ?? '', linkedin: value?.linkedin ?? null, instagram: value?.instagram ?? null, publicEmail: value?.publicEmail ?? null }
}
function category(value?: ApiCategory): BlogCategory {
  return { id: value?.id ?? 'uncategorized', name: value?.name ?? 'Sem categoria', slug: value?.slug ?? 'sem-categoria', description: value?.description ?? '', color: value?.color ?? '#027eca', postCount: value?.postCount ?? 0 }
}
function content(value: unknown): BlogContent {
  if (typeof value === 'string') return value
  return isTiptapDocument(value) ? value : null
}
function post(value: ApiPost): BlogPost {
  return { id: value.id, title: value.title, slug: value.slug, summary: value.summary ?? '', content: content(value.content), coverImage: { id: `cover-${value.id}`, name: value.title, type: 'image', size: '', createdAt: value.createdAt, url: value.coverImage ?? '/assets/Larmap-logo-casas.png', alt: value.title }, status: status(value.status), featured: value.featured, publishedAt: value.publishedAt ?? undefined, scheduledFor: value.scheduledFor ?? undefined, createdAt: value.createdAt, updatedAt: value.updatedAt, readingTimeMinutes: value.readingTime ?? 1, author: author(value.author), category: category(value.categories[0]), tags: value.tags ?? [] }
}
function media(value: ApiMedia): MediaFile { return { id: value.id, url: value.url, name: value.filename, type: value.type === 'DOCUMENT' ? 'pdf' : value.type.toLowerCase() as MediaFile['type'], size: value.size ? `${Math.max(1, Math.round(value.size / 1024))} KB` : '', createdAt: value.createdAt } }
function postBody(input: BlogPostInput) { return { title: input.title, summary: input.summary, content: input.content, coverImage: input.coverImageUrl, authorId: input.authorId, categoryIds: [input.categoryId], tagNames: input.tags } }

export const blogService = {
  async getPosts(filters: BlogPostFilters = {}, token?: string) {
    const query = new URLSearchParams()
    if (filters.categorySlug && filters.categorySlug !== 'todos') query.set('category', filters.categorySlug)
    if (filters.query) query.set('search', filters.query)
    if (filters.status) query.set('status', filters.status)
    if (filters.limit) query.set('limit', String(filters.limit))
    const data = await api<{ posts: ApiPost[] }>(`/blog/posts${query.size ? `?${query}` : ''}`, { token })
    return data.posts.map(post).filter((item) => item.slug !== filters.excludeSlug)
  },
  async getPost(slug: string, token?: string) { return post(await api<ApiPost>(`/blog/posts/${encodeURIComponent(slug)}`, { token })) },
  getCategories: async () => (await api<ApiCategory[]>('/blog/categories')).map(category),
  getAuthors: async (token: string) => (await api<ApiAuthor[]>('/blog/authors', { token })).map((item) => author(item)),
  getMedia: async (token: string) => (await api<ApiMedia[]>('/blog/media', { token })).map(media),
  async getDashboardMetrics(token: string): Promise<BlogDashboardMetrics> { const data = await api<{ total: number; published: number; scheduled: number; drafts: number; categories: number }>('/blog/dashboard', { token }); return { totalPosts: data.total, published: data.published, scheduled: data.scheduled, drafts: data.drafts, categories: data.categories } },
  async createPost(token: string, input: BlogPostInput) { const created = post(await api<ApiPost>('/blog/posts', { method: 'POST', token, body: postBody(input) })); if (input.status === 'published') await api(`/blog/posts/${created.id}/publish`, { method: 'POST', token }); if (input.status === 'scheduled' && input.scheduledFor) await api(`/blog/posts/${created.id}/schedule`, { method: 'POST', token, body: { scheduledFor: input.scheduledFor } }); return created },
  async updatePost(token: string, id: string, input: BlogPostInput) { const updated = post(await api<ApiPost>(`/blog/posts/${id}`, { method: 'PUT', token, body: postBody(input) })); if (input.status === 'published' && updated.status !== 'published') await api(`/blog/posts/${id}/publish`, { method: 'POST', token }); if (input.status === 'scheduled' && input.scheduledFor) await api(`/blog/posts/${id}/schedule`, { method: 'POST', token, body: { scheduledFor: input.scheduledFor } }); return updated },
  deletePost: (token: string, id: string) => api<void>(`/blog/posts/${id}`, { method: 'DELETE', token }),
  duplicatePost: (token: string, id: string) => api(`/blog/posts/${id}/duplicate`, { method: 'POST', token }),
  uploadMedia: (token: string, file: File) => { const form = new FormData(); form.set('file', file); return api<ApiMedia>('/blog/media', { method: 'POST', token, form }).then(media) },
}
