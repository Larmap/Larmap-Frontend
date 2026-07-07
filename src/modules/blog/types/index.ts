export type BlogStatus = 'draft' | 'scheduled' | 'published'

export type MediaFileType = 'image' | 'video' | 'pdf'

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
  name: string
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
  content: string
  coverImage: MediaFile
  createdAt: string
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
  limit?: number
  query?: string
  status?: BlogStatus
}

export interface BlogPostInput {
  authorId: string
  categoryId: string
  content: string
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
  content: string
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
