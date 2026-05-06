const STORAGE_KEY = 'smartmap.recentlyViewed'
const MAX_ITEMS = 20

export interface RecentlyViewedItem {
  id: string
  title: string
  status: string
  contactPhone?: string | null
  contactWhatsApp?: string | null
  viewedAt: number
}

function readItems(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentlyViewedItem[]
  } catch {
    return []
  }
}

function writeItems(items: RecentlyViewedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function addRecentlyViewed(item: Omit<RecentlyViewedItem, 'viewedAt'>) {
  const items = readItems().filter((existing) => existing.id !== item.id)
  items.unshift({ ...item, viewedAt: Date.now() })
  writeItems(items)
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readItems()
}
