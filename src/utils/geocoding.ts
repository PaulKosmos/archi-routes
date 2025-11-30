// Утилита для reverse geocoding (координаты → адрес)
// Использует Nominatim (OpenStreetMap) - бесплатный сервис

export interface GeocodingResult {
  address: string
  city: string
  country: string
  postcode?: string
  state?: string
  formattedAddress: string
}

/**
 * Преобразует координаты в адрес с помощью Nominatim API
 * @param lat - широта
 * @param lng - долгота
 * @returns Информация об адресе или null при ошибке
 */
export async function reverseGeocode(
  lat: number, 
  lng: number
): Promise<GeocodingResult | null> {
  try {
    console.log('🗺️ [GEOCODING] Starting reverse geocoding for:', { lat, lng })
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ru`,
      {
        headers: {
          'User-Agent': 'ArchiRoutes/1.0' // Nominatim требует User-Agent
        }
      }
    )

    if (!response.ok) {
      console.error('🗺️ [GEOCODING] API error:', response.status)
      return null
    }

    const data = await response.json()
    console.log('🗺️ [GEOCODING] API response:', data)

    // Извлекаем компоненты адреса
    const address = data.address || {}
    
    // Определяем город (приоритет: city > town > village > municipality)
    const city = address.city || 
                 address.town || 
                 address.village || 
                 address.municipality || 
                 address.county ||
                 'Неизвестный город'

    // Определяем страну
    const country = address.country || 'Неизвестная страна'

    // Полный адрес
    const formattedAddress = data.display_name || `${lat}, ${lng}`

    const result: GeocodingResult = {
      address: formattedAddress,
      city,
      country,
      postcode: address.postcode,
      state: address.state,
      formattedAddress
    }

    console.log('🗺️ [GEOCODING] Success:', result)
    return result

  } catch (error) {
    console.error('🗺️ [GEOCODING] Error:', error)
    return null
  }
}

/**
 * Задержка для соблюдения rate limit Nominatim (1 запрос в секунду)
 */
export function delayForRateLimit(ms: number = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Упрощенная версия - только город и страна
 */
export async function getLocationInfo(
  lat: number, 
  lng: number
): Promise<{ city: string; country: string } | null> {
  const result = await reverseGeocode(lat, lng)
  
  if (!result) return null
  
  return {
    city: result.city,
    country: result.country
  }
}

