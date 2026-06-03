import { useCallback, useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

interface MapResizeHandlerProps {
  dependencies?: ReadonlyArray<unknown>
}

const RESIZE_SETTLE_DELAYS_MS = [80, 260]

function getContainerRectSnapshot(container: HTMLElement) {
  const rect = container.getBoundingClientRect()

  return {
    height: Math.round(rect.height),
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
  }
}

export function MapResizeHandler({ dependencies = [] }: MapResizeHandlerProps) {
  const map = useMap()
  const frameRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])

  const clearScheduledInvalidations = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    for (const timerId of timersRef.current) {
      window.clearTimeout(timerId)
    }
    timersRef.current = []
  }, [])

  const invalidateSize = useCallback((reason: string) => {
    map.invalidateSize({ debounceMoveend: true, pan: false })

    if (import.meta.env.DEV) {
      console.info('[POI_DEBUG] invalidate size', {
        containerRect: getContainerRectSnapshot(map.getContainer()),
        mapSize: map.getSize(),
        reason,
      })
    }
  }, [map])

  const scheduleInvalidateSize = useCallback((reason: string) => {
    clearScheduledInvalidations()

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      invalidateSize(`${reason}:raf`)
    })

    timersRef.current = RESIZE_SETTLE_DELAYS_MS.map((delayMs) =>
      window.setTimeout(() => {
        invalidateSize(`${reason}:${delayMs}ms`)
      }, delayMs),
    )
  }, [clearScheduledInvalidations, invalidateSize])

  useEffect(() => {
    let active = true

    map.whenReady(() => {
      if (!active) return
      scheduleInvalidateSize('map-ready')
    })

    return () => {
      active = false
      clearScheduledInvalidations()
    }
  }, [clearScheduledInvalidations, map, scheduleInvalidateSize])

  useEffect(() => {
    const container = map.getContainer()
    const handleWindowResize = () => scheduleInvalidateSize('window-resize')
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => scheduleInvalidateSize('container-resize'))

    resizeObserver?.observe(container)
    window.addEventListener('resize', handleWindowResize)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', handleWindowResize)
      clearScheduledInvalidations()
    }
  }, [clearScheduledInvalidations, map, scheduleInvalidateSize])

  useEffect(() => {
    scheduleInvalidateSize('layout-dependencies')
  }, [scheduleInvalidateSize, ...dependencies])

  return null
}
