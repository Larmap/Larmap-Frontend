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
  'fitness',
  'leisure',
  'religion',
]

export const poiCategoryLabels: Record<PoiCategory, string> = {
  education: 'Ensino',
  food: 'Alimentacao',
  fuel: 'Postos',
  fitness: 'Academias',
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
  fitness: 'A',
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
  food: 4,
  fuel: 5,
  fitness: 6,
  leisure: 7,
  religion: 8,
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
