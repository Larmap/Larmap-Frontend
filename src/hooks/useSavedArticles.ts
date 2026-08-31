import type { BlogPost } from '../modules/blog/types'

const STORAGE_PREFIX = 'larmap.savedArticles'
const MAX_ITEMS = 120
export const SAVED_ARTICLES_CHANGED_EVENT = 'larmap:saved-articles-changed'

export interface SavedArticleItem {
  coverImageUrl?: string
  id: string
  savedAt: number
  slug: string
  summary: string
  title: string
}

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}.${userId}`
}

function readItems(userId: string): SavedArticleItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed as SavedArticleItem[] : []
  } catch {
    return []
  }
}

function writeItems(userId: string, items: SavedArticleItem[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(items.slice(0, MAX_ITEMS)))
  window.dispatchEvent(new CustomEvent(SAVED_ARTICLES_CHANGED_EVENT, { detail: { userId } }))
}

export function getSavedArticles(userId: string) {
  return readItems(userId)
}

export function isArticleSaved(userId: string, articleId: string) {
  return readItems(userId).some((item) => item.id === articleId)
}

export function toggleSavedArticle(userId: string, post: BlogPost) {
  if (post.status !== 'published') return readItems(userId)

  const currentItems = readItems(userId)
  const alreadySaved = currentItems.some((item) => item.id === post.id)
  const nextItems = alreadySaved
    ? currentItems.filter((item) => item.id !== post.id)
    : [
        {
          coverImageUrl: post.coverImage.url,
          id: post.id,
          savedAt: Date.now(),
          slug: post.slug,
          summary: post.summary,
          title: post.title,
        },
        ...currentItems.filter((item) => item.id !== post.id),
      ]

  writeItems(userId, nextItems)
  return nextItems
}

export function removeSavedArticle(userId: string, articleId: string) {
  const nextItems = readItems(userId).filter((item) => item.id !== articleId)
  writeItems(userId, nextItems)
  return nextItems
}
