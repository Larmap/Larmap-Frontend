export type PoiCategory = 'market' | 'fuel' | 'health' | 'food' | 'education' | 'leisure'

export interface Poi {
  id: string
  osmId: number
  osmType: 'node' | 'way' | 'relation'
  category: PoiCategory
  name: string
  latitude: number
  longitude: number
  tags: Record<string, string>
  distanceMeters?: number
}

export interface PoiSearchCenter {
  latitude: number
  longitude: number
}

export interface PoiSearchBounds {
  south: number
  west: number
  north: number
  east: number
}

export interface PoiBoundsSearchParams {
  bounds: PoiSearchBounds
  categories: PoiCategory[]
  center: PoiSearchCenter
  limit?: number
}

export interface PoiSearchState {
  pois: Poi[]
  loading: boolean
  error: string
  empty: boolean
}
