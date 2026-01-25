// Art Deco Architectural Map Markers
// Geometric, monument-inspired design for building locations

import { Building } from '@/types/building';

export const createBuildingIcon = (
  building: Building,
  isSelected: boolean = false,
  isHovered: boolean = false,
  isInRoute: boolean = false,
  routeIndex: number = -1
) => {
  // Size scaling
  const baseSize = isSelected ? 30 : isHovered ? 26 : 22
  const actualSize = isInRoute ? 34 : baseSize

  // Art Deco color palette - sophisticated and architectural
  const colorScheme = {
    normal: { primary: '#0F766E', secondary: '#14B8A6', accent: '#5EEAD4' },      // Teal - professional
    selected: { primary: '#1E40AF', secondary: '#3B82F6', accent: '#93C5FD' },    // Blue - active
    hovered: { primary: '#C2410C', secondary: '#F97316', accent: '#FDBA74' },     // Orange - interactive
    route: { primary: '#6B21A8', secondary: '#A855F7', accent: '#D8B4FE' }        // Purple - special
  }

  const colors = isInRoute ? colorScheme.route
                : isSelected ? colorScheme.selected
                : isHovered ? colorScheme.hovered
                : colorScheme.normal

  // Geometric monument SVG design
  const monumentSVG = `
    <svg width="${actualSize}" height="${actualSize}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Art Deco gradient -->
        <linearGradient id="grad-${building.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.9" />
        </linearGradient>

        <!-- Glow filter -->
        <filter id="glow-${building.id}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Inner shadow -->
        <filter id="inner-shadow-${building.id}">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
          <feOffset dx="0" dy="1" result="offsetblur"/>
          <feFlood flood-color="${colors.primary}" flood-opacity="0.5"/>
          <feComposite in2="offsetblur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Outer glow ring -->
      <circle cx="24" cy="24" r="22" fill="none" stroke="${colors.accent}"
              stroke-width="0.5" opacity="0.3"
              class="marker-glow"/>

      <!-- Monument base (hexagon) -->
      <path d="M 24 4 L 38 13 L 38 31 L 24 40 L 10 31 L 10 13 Z"
            fill="url(#grad-${building.id})"
            filter="url(#inner-shadow-${building.id})"
            class="marker-base"/>

      <!-- Art Deco detail lines -->
      <path d="M 24 8 L 34 14 L 34 28 L 24 34 L 14 28 L 14 14 Z"
            fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>

      <path d="M 24 12 L 30 16 L 30 26 L 24 30 L 18 26 L 18 16 Z"
            fill="none" stroke="white" stroke-width="1" opacity="0.6"/>

      <!-- Center icon/number -->
      <text x="24" y="24"
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            font-family="'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
            font-size="${isInRoute ? '18' : '14'}"
            font-weight="700"
            letter-spacing="-0.5"
            filter="url(#glow-${building.id})"
            class="marker-label">
        ${isInRoute && routeIndex >= 0 ? routeIndex + 1 : '◆'}
      </text>

      <!-- Top accent (architectural spire) -->
      <path d="M 24 4 L 26 8 L 22 8 Z" fill="white" opacity="0.8" class="marker-accent"/>
    </svg>
  `

  return L.divIcon({
    className: 'custom-building-icon',
    html: `
      <div class="architectural-marker" style="
        width: ${actualSize}px;
        height: ${actualSize}px;
        transform: translate(-50%, -50%);
        cursor: pointer;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))
                drop-shadow(0 0 0 1px rgba(255, 255, 255, 0.1));
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        ${monumentSVG}
      </div>
    `,
    iconSize: [actualSize, actualSize],
    iconAnchor: [actualSize/2, actualSize/2],
    popupAnchor: [-10, -actualSize/2 - 5]
  })
}
