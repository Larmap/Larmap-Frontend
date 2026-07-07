import type { BlogStatus } from '../types'

export const BLOG_CATEGORY_FILTERS = [
  { label: 'Todos', slug: 'todos' },
  { label: 'Mercado', slug: 'mercado' },
  { label: 'Compra', slug: 'compra' },
  { label: 'Aluguel', slug: 'aluguel' },
  { label: 'Financiamento', slug: 'financiamento' },
  { label: 'Investimentos', slug: 'investimentos' },
  { label: 'Guias', slug: 'guias' },
  { label: 'Construção', slug: 'construcao' },
  { label: 'Decoração', slug: 'decoracao' },
  { label: 'LarMap', slug: 'larmap' },
  { label: 'Notícias', slug: 'noticias' },
] as const

export const BLOG_FONT_OPTIONS = [
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Inter', value: 'Inter' },
] as const

export const BLOG_FONT_SIZE_OPTIONS = ['12', '14', '16', '18', '24', '30', '36', '48'] as const

export const BLOG_STATUS_LABELS: Record<BlogStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  scheduled: 'Scheduled',
}

export const BLOG_STATUS_DESCRIPTIONS: Record<BlogStatus, string> = {
  draft: 'Rascunho em edição',
  published: 'Publicado no blog',
  scheduled: 'Publicação agendada',
}

export const BLOG_ADMIN_PAGE_TITLES: Record<string, string> = {
  '/admin/blog': 'Dashboard',
  '/admin/blog/categories': 'Categorias',
  '/admin/blog/media': 'Mídias',
  '/admin/blog/posts': 'Postagens',
  '/admin/blog/posts/new': 'Nova postagem',
}
