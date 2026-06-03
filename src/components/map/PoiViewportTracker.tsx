import { useCallback, useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { useMapEvents } from 'react-leaflet'
import { POI_BOUNDS_PADDING } from '../../constants/pois'
import type { PoiSearchBounds, PoiSearchCenter } from '../../types/pois'

export interface PoiViewport {
  bounds: PoiSearchBounds
  center: PoiSearchCenter
  paddedBounds: PoiSearchBounds
  zoom: number
}

interface PoiViewportTrackerProps {
  enabled: boolean
  onViewportChange: (viewport: PoiViewport) => void
}

function getContainerRectSnapshot(map: LeafletMap) {
  const rect = map.getContainer().getBoundingClientRect()

  return {
    height: Math.round(rect.height),
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
  }
}

function getViewportSnapshot(map: LeafletMap): PoiViewport {
  const center = map.getCenter()
  const bounds = map.getBounds()
  const paddedBounds = bounds.pad(POI_BOUNDS_PADDING)

  return {
    bounds: {
      east: bounds.getEast(),
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      west: bounds.getWest(),
    },
    center: { latitude: center.lat, longitude: center.lng },
    paddedBounds: {
      east: paddedBounds.getEast(),
      north: paddedBounds.getNorth(),
      south: paddedBounds.getSouth(),
      west: paddedBounds.getWest(),
    },
    zoom: map.getZoom(),
  }
}

export function PoiViewportTracker({ enabled, onViewportChange }: PoiViewportTrackerProps) {
  const enabledRef = useRef(enabled)
  const frameRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearScheduledSnapshot = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const emitViewportSnapshot = useCallback((map: LeafletMap, reason: string) => {
    if (!enabledRef.current) return

    const viewport = getViewportSnapshot(map)

    if (import.meta.env.DEV) {
      console.info('[POI_DEBUG] viewport snapshot', {
        bounds: viewport.bounds,
        center: viewport.center,
        containerRect: getContainerRectSnapshot(map),
        paddedBounds: viewport.paddedBounds,
        padding: POI_BOUNDS_PADDING,
        reason,
        size: map.getSize(),
        zoom: viewport.zoom,
      })
    }

    onViewportChange(viewport)
  }, [onViewportChange])

  const scheduleViewportSnapshot = useCallback((map: LeafletMap, reason: string, delayMs = 0) => {
    clearScheduledSnapshot()

    const requestSnapshot = () => {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        emitViewportSnapshot(map, reason)
      })
    }

    if (delayMs > 0) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        requestSnapshot()
      }, delayMs)
      return
    }

    requestSnapshot()
  }, [clearScheduledSnapshot, emitViewportSnapshot])

  const map = useMapEvents({
    moveend() {
      if (!enabled) return
      scheduleViewportSnapshot(map, 'moveend')
    },
    resize() {
      if (!enabled) return
      scheduleViewportSnapshot(map, 'resize', 40)
    },
    zoomend() {
      if (!enabled) return
      scheduleViewportSnapshot(map, 'zoomend')
    },
  })

  useEffect(() => {
    enabledRef.current = enabled

    if (!enabled) {
      clearScheduledSnapshot()
    }
  }, [clearScheduledSnapshot, enabled])

  useEffect(() => {
    if (!enabled) return

    let active = true

    map.whenReady(() => {
      if (!active) return
      scheduleViewportSnapshot(map, 'map-ready', 80)
    })

    scheduleViewportSnapshot(map, 'mount', 120)

    return () => {
      active = false
      clearScheduledSnapshot()
    }
  }, [clearScheduledSnapshot, enabled, map, scheduleViewportSnapshot])

  return null
}
