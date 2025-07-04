// src/types/leaflet-decorator.d.ts
declare module 'leaflet-polylinedecorator' {
  import * as L from 'leaflet'

  namespace L {
    function polylineDecorator(
      line: L.Polyline,
      options: {
        patterns: Array<{
          offset: string
          repeat: string
          symbol: any
        }>
      }
    ): any

    namespace Symbol {
      function arrowHead(options: {
        pixelSize: number
        headAngle: number
        pathOptions: {
          fillOpacity: number
          weight: number
          color: string
        }
      }): any
    }
  }

  export = L
}