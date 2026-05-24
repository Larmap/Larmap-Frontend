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

export interface PoiSearchParams {
  categories: PoiCategory[]
  center: {
    latitude: number
    longitude: number
  }
  radiusMeters: number
  limit?: number
}

export interface PoiSearchState {
  pois: Poi[]
  loading: boolean
  error: string
  empty: boolean
}
