export function readStorageValue(storageKey: string, legacyStorageKey?: string) {
  const currentValue = localStorage.getItem(storageKey)
  if (currentValue !== null) return currentValue
  if (!legacyStorageKey) return null

  const legacyValue = localStorage.getItem(legacyStorageKey)
  if (legacyValue !== null) {
    localStorage.setItem(storageKey, legacyValue)
    localStorage.removeItem(legacyStorageKey)
  }

  return legacyValue
}

export function removeStorageValue(storageKey: string, legacyStorageKey?: string) {
  localStorage.removeItem(storageKey)
  if (legacyStorageKey) {
    localStorage.removeItem(legacyStorageKey)
  }
}
