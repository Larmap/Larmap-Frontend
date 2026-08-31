import type { JSONContent } from '@tiptap/core'

export type BlogStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export type MediaFileType = 'image' | 'video' | 'pdf'

/** Documento persistido pelo backend e produzido pelo editor Tiptap. */
export type TiptapDocument = JSONContent & {
  type: 'doc'
  content: JSONContent[]
}

/** Compatibilidade temporária com os mocks HTML durante o cutover. */
export type BlogContent = TiptapDocument | string | null

export interface BlogCategory {
  color: string
  description: string
  id: string
  name: string
  postCount: number
  slug: string
}

export interface BlogAuthor {
  avatarUrl: string
  bio: string
  id: string
  instagram?: string | null
  linkedin?: string | null
  name: string
  publicEmail?: string | null
  role: string
}

export interface BlogTag {
  id: string
  name: string
  slug: string
}

export interface MediaFile {
  alt?: string
  createdAt: string
  id: string
  name: string
  size: string
  thumbnailUrl?: string
  type: MediaFileType
  url: string
}

export interface BlogPost {
  author: BlogAuthor
  category: BlogCategory
  content: BlogContent
  coverImage: MediaFile
  createdAt: string
  featured?: boolean
  id: string
  publishedAt?: string
  readingTimeMinutes: number
  scheduledFor?: string
  slug: string
  status: BlogStatus
  summary: string
  tags: BlogTag[]
  title: string
  updatedAt: string
}

export interface BlogPostFilters {
  categorySlug?: string
  excludeSlug?: string
  featured?: boolean
  limit?: number
  query?: string
  status?: BlogStatus
}

export interface BlogPostInput {
  authorId: string
  categoryId: string
  content: TiptapDocument
  coverImageId?: string
  coverImageUrl?: string
  publishedAt?: string
  readingTimeMinutes?: number
  scheduledFor?: string
  slug: string
  status: BlogStatus
  summary: string
  tags: string[]
  title: string
}

export interface BlogDashboardMetrics {
  categories: number
  drafts: number
  published: number
  scheduled: number
  totalPosts: number
}

export interface BlogPostFormValues {
  authorId: string
  categoryId: string
  content: BlogContent
  coverImageId: string
  coverImageUrl: string
  publishDate: string
  publishImmediately: boolean
  publishTime: string
  slug: string
  summary: string
  tagsText: string
  title: string
}
