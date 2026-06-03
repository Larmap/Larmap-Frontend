import type { PoiCategory } from '../types/pois'

export const MIN_POI_ZOOM = 13
export const POI_BOUNDS_PADDING = 0.2

export const allPoiCategories: PoiCategory[] = [
  'market',
  'fuel',
  'health',
  'pharmacy',
  'food',
  'education',
  'leisure',
  'religion',
]

export const poiCategoryLabels: Record<PoiCategory, string> = {
  education: 'Ensino',
  food: 'Alimentacao',
  fuel: 'Postos',
  health: 'Hospitais e saude',
  leisure: 'Lazer',
  market: 'Mercados',
  pharmacy: 'Farmacias',
  religion: 'Igrejas e templos',
}

export const poiCategoryShortLabels: Record<PoiCategory, string> = {
  education: 'E',
  food: 'R',
  fuel: 'P',
  health: 'S',
  leisure: 'L',
  market: 'M',
  pharmacy: 'F',
  religion: 'I',
}

export const poiCategoryPriority: Record<PoiCategory, number> = {
  market: 0,
  health: 1,
  pharmacy: 2,
  education: 3,
  leisure: 4,
  food: 5,
  fuel: 6,
  religion: 7,
}

export function getPoiSearchLimit(zoom: number, densityMode: 'home' | 'map') {
  const safeZoom = Number.isFinite(zoom) ? zoom : 15

  if (densityMode === 'home') {
    if (safeZoom < 14) return 90
    if (safeZoom < 15) return 150
    return 260
  }

  if (safeZoom < 14) return 160
  if (safeZoom < 15) return 260
  return 420
}
