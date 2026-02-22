import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'ArchiRoutes/1.0 (archiroutes.com)'
        }
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding API error' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GEOCODE API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch geocoding data' }, { status: 500 })
  }
}
