import type { PoiCategory } from '../types/pois'

export const allPoiCategories: PoiCategory[] = [
  'market',
  'fuel',
  'health',
  'food',
  'education',
  'leisure',
]

export const poiCategoryLabels: Record<PoiCategory, string> = {
  education: 'Ensino',
  food: 'Alimentacao',
  fuel: 'Postos',
  health: 'Saude',
  leisure: 'Lazer',
  market: 'Mercados',
}

export const poiCategoryShortLabels: Record<PoiCategory, string> = {
  education: 'E',
  food: 'R',
  fuel: 'P',
  health: 'S',
  leisure: 'L',
  market: 'M',
}

export const poiCategoryPriority: Record<PoiCategory, number> = {
  market: 0,
  health: 1,
  education: 2,
  food: 3,
  leisure: 4,
  fuel: 5,
}
