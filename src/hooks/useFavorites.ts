import type { PropertyStatus } from '../types/api'
import { readStorageValue } from '../utils/storage'

const STORAGE_KEY = 'larmap.favorites'
const LEGACY_STORAGE_KEY = 'smartmap.favorites'
const MAX_ITEMS = 80

export interface FavoriteItem {
  id: string
  title: string
  status: PropertyStatus
  priceLabel?: string
  neighborhood?: string
  city?: string
  contactPhone?: string | null
  contactWhatsApp?: string | null
  savedAt: number
}

function readItems(): FavoriteItem[] {
  try {
    const raw = readStorageValue(STORAGE_KEY, LEGACY_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as FavoriteItem[]
  } catch {
    return []
  }
}

function writeItems(items: FavoriteItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function getFavorites() {
  return readItems()
}

export function toggleFavorite(item: Omit<FavoriteItem, 'savedAt'>) {
  const currentItems = readItems()
  const alreadySaved = currentItems.some((favorite) => favorite.id === item.id)
  const nextItems = alreadySaved
    ? currentItems.filter((favorite) => favorite.id !== item.id)
    : [{ ...item, savedAt: Date.now() }, ...currentItems.filter((favorite) => favorite.id !== item.id)]

  writeItems(nextItems)
  return nextItems
}

export function removeFavorite(id: string) {
  const nextItems = readItems().filter((favorite) => favorite.id !== id)
  writeItems(nextItems)
  return nextItems
}
