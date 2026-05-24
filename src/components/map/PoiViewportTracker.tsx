import { useEffect } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { useMapEvents } from 'react-leaflet'
import type { PoiSearchBounds, PoiSearchCenter } from '../../types/pois'

export interface PoiViewport {
  bounds: PoiSearchBounds
  center: PoiSearchCenter
  zoom: number
}

interface PoiViewportTrackerProps {
  enabled: boolean
  onViewportChange: (viewport: PoiViewport) => void
}

function getViewportSnapshot(map: LeafletMap): PoiViewport {
  const center = map.getCenter()
  const bounds = map.getBounds()

  return {
    bounds: {
      east: bounds.getEast(),
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      west: bounds.getWest(),
    },
    center: { latitude: center.lat, longitude: center.lng },
    zoom: map.getZoom(),
  }
}

export function PoiViewportTracker({ enabled, onViewportChange }: PoiViewportTrackerProps) {
  const map = useMapEvents({
    moveend() {
      if (!enabled) return
      onViewportChange(getViewportSnapshot(map))
    },
    zoomend() {
      if (!enabled) return
      onViewportChange(getViewportSnapshot(map))
    },
  })

  useEffect(() => {
    if (!enabled) return
    onViewportChange(getViewportSnapshot(map))
  }, [enabled, map, onViewportChange])

  return null
}
