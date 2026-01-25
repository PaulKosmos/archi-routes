'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RoutePreviewMapProps {
  geometry: any // GeoJSON LineString
  points: Array<{
    latitude: number
    longitude: number
    title: string
    order_index: number
  }>
  isHovered?: boolean
}

export default function RoutePreviewMap({ geometry, points, isHovered }: RoutePreviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layersRef = useRef<{ line?: L.Polyline; markers?: L.Marker[] }>({})

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      attributionControl: false
    })

    mapInstanceRef.current = map

    // Add tile layer with muted colors
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: ''
    }).addTo(map)

    // Draw route line if geometry exists
    if (geometry && geometry.coordinates) {
      const coordinates = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number])

      const polyline = L.polyline(coordinates, {
        color: '#000000',
        weight: 3,
        opacity: 0.6,
        smoothFactor: 1
      }).addTo(map)

      layersRef.current.line = polyline
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] })
    }

    // Add markers for first 3-4 points
    if (points && points.length > 0) {
      const markers: L.Marker[] = []
      const displayPoints = points.slice(0, Math.min(4, points.length))

      displayPoints.forEach((point, index) => {
        // Custom marker icons
        const isFirst = index === 0
        const isLast = index === displayPoints.length - 1

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: ${isFirst || isLast ? '12px' : '8px'};
              height: ${isFirst || isLast ? '12px' : '8px'};
              background: ${isFirst ? '#22c55e' : isLast ? '#ef4444' : '#000000'};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        })

        const marker = L.marker([point.latitude, point.longitude], { icon }).addTo(map)
        markers.push(marker)
      })

      layersRef.current.markers = markers

      // Fit bounds to show all points if no geometry
      if (!geometry || !geometry.coordinates) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds(), { padding: [30, 30] })
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [geometry, points])

  // Handle hover effect
  useEffect(() => {
    if (!layersRef.current.line) return

    if (isHovered) {
      layersRef.current.line.setStyle({ opacity: 0.9, weight: 4 })
    } else {
      layersRef.current.line.setStyle({ opacity: 0.6, weight: 3 })
    }
  }, [isHovered])

  return (
    <div
      ref={mapRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#f8f9fa' }}
    />
  )
}
