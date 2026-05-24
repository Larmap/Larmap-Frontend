import { useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'

export interface PoiViewport {
  center: {
    latitude: number
    longitude: number
  }
  zoom: number
}

interface PoiViewportTrackerProps {
  enabled: boolean
  onViewportChange: (viewport: PoiViewport) => void
}

export function PoiViewportTracker({ enabled, onViewportChange }: PoiViewportTrackerProps) {
  const map = useMapEvents({
    moveend() {
      if (!enabled) return
      const center = map.getCenter()
      onViewportChange({
        center: { latitude: center.lat, longitude: center.lng },
        zoom: map.getZoom(),
      })
    },
    zoomend() {
      if (!enabled) return
      const center = map.getCenter()
      onViewportChange({
        center: { latitude: center.lat, longitude: center.lng },
        zoom: map.getZoom(),
      })
    },
  })

  useEffect(() => {
    if (!enabled) return
    const center = map.getCenter()
    onViewportChange({
      center: { latitude: center.lat, longitude: center.lng },
      zoom: map.getZoom(),
    })
  }, [enabled, map, onViewportChange])

  return null
}
