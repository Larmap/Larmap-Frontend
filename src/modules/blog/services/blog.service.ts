import { blogAuthorsMock } from '../mocks/authors.mock'
import { blogCategoriesMock } from '../mocks/categories.mock'
import { blogMediaMock } from '../mocks/media.mock'
import { blogPostsMock } from '../mocks/posts.mock'
import type {
  BlogAuthor,
  BlogCategory,
  BlogDashboardMetrics,
  BlogPost,
  BlogPostFilters,
  BlogPostInput,
  BlogTag,
  MediaFile,
  MediaFileType,
} from '../types'
import {
  calculateReadingTime,
  createBlogSlug,
  filterPostsByStatus,
  matchesBlogSearch,
  sortPostsByDate,
} from '../utils'

let postsStore = blogPostsMock.map((post) => ({ ...post, tags: [...post.tags] }))
let mediaStore = blogMediaMock.map((media) => ({ ...media }))

function createTag(name: string): BlogTag {
  return {
    id: `tag-${createBlogSlug(name)}`,
    name,
    slug: createBlogSlug(name),
  }
}

function clonePost(post: BlogPost): BlogPost {
  return {
    ...post,
    author: { ...post.author },
    category: { ...post.category },
    coverImage: { ...post.coverImage },
    tags: post.tags.map((tag) => ({ ...tag })),
  }
}

function cloneMedia(media: MediaFile): MediaFile {
  return { ...media }
}

function getCategoryById(categoryId: string): BlogCategory {
  const category = blogCategoriesMock.find((item) => item.id === categoryId)
  if (!category) throw new Error('Categoria do blog não encontrada.')
  return category
}

function getAuthorById(authorId: string): BlogAuthor {
  const author = blogAuthorsMock.find((item) => item.id === authorId)
  if (!author) throw new Error('Autor do blog não encontrado.')
  return author
}

function getMediaByInput(input: BlogPostInput): MediaFile {
  if (input.coverImageId) {
    const media = mediaStore.find((item) => item.id === input.coverImageId)
    if (media) return media
  }

  if (input.coverImageUrl) {
    const existing = mediaStore.find((item) => item.url === input.coverImageUrl)
    if (existing) return existing

    const media: MediaFile = {
      alt: input.title,
      createdAt: new Date().toISOString(),
      id: `media-external-${Date.now()}`,
      name: `${input.slug || createBlogSlug(input.title)}.jpg`,
      size: 'Mock',
      type: 'image',
      url: input.coverImageUrl,
    }
    mediaStore = [media, ...mediaStore]
    return media
  }

  const fallback = mediaStore.find((item) => item.type === 'image')
  if (!fallback) throw new Error('Nenhuma imagem mockada disponível.')
  return fallback
}

function buildPostFromInput(input: BlogPostInput, basePost?: BlogPost): BlogPost {
  const now = new Date().toISOString()
  const status = input.status
  const publishedAt = status === 'published' ? input.publishedAt ?? basePost?.publishedAt ?? now : undefined
  const scheduledFor = status === 'scheduled' ? input.scheduledFor : undefined

  return {
    author: getAuthorById(input.authorId),
    category: getCategoryById(input.categoryId),
    content: input.content,
    coverImage: getMediaByInput(input),
    createdAt: basePost?.createdAt ?? now,
    id: basePost?.id ?? `post-${Date.now()}`,
    publishedAt,
    readingTimeMinutes: input.readingTimeMinutes ?? calculateReadingTime(input.content),
    scheduledFor,
    slug: input.slug || createBlogSlug(input.title),
    status,
    summary: input.summary,
    tags: input.tags.map(createTag),
    title: input.title,
    updatedAt: now,
  }
}

function withDynamicPostCount(category: BlogCategory): BlogCategory {
  return {
    ...category,
    postCount: postsStore.filter((post) => post.category.id === category.id).length,
  }
}

function inferMediaType(file: File): MediaFileType {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'image'
}

export const blogService = {
  async getPosts(filters: BlogPostFilters = {}): Promise<BlogPost[]> {
    const categorySlug = filters.categorySlug === 'todos' ? undefined : filters.categorySlug

    const filteredPosts = sortPostsByDate(filterPostsByStatus(postsStore, filters.status))
      .filter((post) => !categorySlug || post.category.slug === categorySlug)
      .filter((post) => !filters.excludeSlug || post.slug !== filters.excludeSlug)
      .filter((post) => !filters.query || matchesBlogSearch(post, filters.query))

    return filteredPosts.slice(0, filters.limit ?? filteredPosts.length).map(clonePost)
  },

  async getPost(identifier: string): Promise<BlogPost | null> {
    const post = postsStore.find((item) => item.slug === identifier || item.id === identifier)
    return post ? clonePost(post) : null
  },

  async createPost(input: BlogPostInput): Promise<BlogPost> {
    const createdPost = buildPostFromInput(input)
    postsStore = [createdPost, ...postsStore]
    return clonePost(createdPost)
  },

  async updatePost(id: string, input: BlogPostInput): Promise<BlogPost> {
    const currentPost = postsStore.find((post) => post.id === id)
    if (!currentPost) throw new Error('Postagem não encontrada.')

    const updatedPost = buildPostFromInput(input, currentPost)
    postsStore = postsStore.map((post) => (post.id === id ? updatedPost : post))
    return clonePost(updatedPost)
  },

  async deletePost(id: string): Promise<void> {
    postsStore = postsStore.filter((post) => post.id !== id)
  },

  async duplicatePost(id: string): Promise<BlogPost> {
    const currentPost = postsStore.find((post) => post.id === id)
    if (!currentPost) throw new Error('Postagem não encontrada.')

    const duplicatedPost: BlogPost = {
      ...clonePost(currentPost),
      createdAt: new Date().toISOString(),
      id: `post-${Date.now()}`,
      publishedAt: undefined,
      scheduledFor: undefined,
      slug: `${currentPost.slug}-copia`,
      status: 'draft',
      title: `${currentPost.title} (cópia)`,
      updatedAt: new Date().toISOString(),
    }
    postsStore = [duplicatedPost, ...postsStore]
    return clonePost(duplicatedPost)
  },

  async schedulePost(id: string, scheduledFor: string): Promise<BlogPost> {
    const post = postsStore.find((item) => item.id === id)
    if (!post) throw new Error('Postagem não encontrada.')

    const scheduledPost: BlogPost = {
      ...post,
      publishedAt: undefined,
      scheduledFor,
      status: 'scheduled',
      updatedAt: new Date().toISOString(),
    }
    postsStore = postsStore.map((item) => (item.id === id ? scheduledPost : item))
    return clonePost(scheduledPost)
  },

  async uploadMedia(file: File): Promise<MediaFile> {
    const type = inferMediaType(file)
    const media: MediaFile = {
      alt: type === 'image' ? file.name : undefined,
      createdAt: new Date().toISOString(),
      id: `media-upload-${Date.now()}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      thumbnailUrl: type === 'image' ? URL.createObjectURL(file) : undefined,
      type,
      url: URL.createObjectURL(file),
    }

    mediaStore = [media, ...mediaStore]
    return cloneMedia(media)
  },

  async getCategories(): Promise<BlogCategory[]> {
    return blogCategoriesMock.map(withDynamicPostCount)
  },

  async getAuthors(): Promise<BlogAuthor[]> {
    return blogAuthorsMock.map((author) => ({ ...author }))
  },

  async getMedia(): Promise<MediaFile[]> {
    return mediaStore.map(cloneMedia)
  },

  async getDashboardMetrics(): Promise<BlogDashboardMetrics> {
    return {
      categories: blogCategoriesMock.length,
      drafts: postsStore.filter((post) => post.status === 'draft').length,
      published: postsStore.filter((post) => post.status === 'published').length,
      scheduled: postsStore.filter((post) => post.status === 'scheduled').length,
      totalPosts: postsStore.length,
    }
  },
}
