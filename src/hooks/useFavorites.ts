import type { PropertyStatus } from '../types/api'
import { readStorageValue } from '../utils/storage'

const STORAGE_KEY = 'larmap.favorites'
const LEGACY_STORAGE_KEY = 'smartmap.favorites'
const ACCOUNT_STORAGE_PREFIX = 'larmap.favorites.user'
const CLAIMED_BY_STORAGE_KEY = 'larmap.favorites.claimedBy'
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

function parseItems(raw: string | null): FavoriteItem[] {
  try {
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed as FavoriteItem[] : []
  } catch {
    return []
  }
}

function getAccountStorageKey(userId: string) {
  return `${ACCOUNT_STORAGE_PREFIX}.${userId}`
}

function readItems(userId?: string): FavoriteItem[] {
  if (!userId) return parseItems(readStorageValue(STORAGE_KEY, LEGACY_STORAGE_KEY))

  const accountStorageKey = getAccountStorageKey(userId)
  const accountItems = parseItems(localStorage.getItem(accountStorageKey))
  if (accountItems.length || localStorage.getItem(accountStorageKey) !== null) return accountItems

  const claimedBy = localStorage.getItem(CLAIMED_BY_STORAGE_KEY)
  if (claimedBy && claimedBy !== userId) return []

  const legacyItems = parseItems(readStorageValue(STORAGE_KEY, LEGACY_STORAGE_KEY))
  localStorage.setItem(accountStorageKey, JSON.stringify(legacyItems.slice(0, MAX_ITEMS)))
  localStorage.setItem(CLAIMED_BY_STORAGE_KEY, userId)
  return legacyItems
}

function writeItems(items: FavoriteItem[], userId?: string) {
  const storageKey = userId ? getAccountStorageKey(userId) : STORAGE_KEY
  localStorage.setItem(storageKey, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function getFavorites(userId?: string) {
  return readItems(userId)
}

export function toggleFavorite(item: Omit<FavoriteItem, 'savedAt'>, userId?: string) {
  const currentItems = readItems(userId)
  const alreadySaved = currentItems.some((favorite) => favorite.id === item.id)
  const nextItems = alreadySaved
    ? currentItems.filter((favorite) => favorite.id !== item.id)
    : [{ ...item, savedAt: Date.now() }, ...currentItems.filter((favorite) => favorite.id !== item.id)]

  writeItems(nextItems, userId)
  return nextItems
}

export function removeFavorite(id: string, userId?: string) {
  const nextItems = readItems(userId).filter((favorite) => favorite.id !== id)
  writeItems(nextItems, userId)
  return nextItems
}
