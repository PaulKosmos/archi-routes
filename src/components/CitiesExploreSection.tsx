'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import OptimizedImage from '@/components/OptimizedImage'
import { createClient } from '@/lib/supabase'
import { getStorageUrl } from '@/lib/storage'
import { MapPin, Building2 } from 'lucide-react'

interface CityData {
  city: string
  buildingCount: number
  sampleImage: string | null
  sampleLat: number | null
  sampleLng: number | null
}

export default function CitiesExploreSection() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [cities, setCities] = useState<CityData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopCities() {
      try {
        // Запрашиваем все здания с группировкой по городам
        const { data: buildings, error } = await supabase
          .from('buildings')
          .select('city, image_url, latitude, longitude')
          .not('city', 'is', null)

        if (error) {
          console.error('Error fetching cities:', error)
          setLoading(false)
          return
        }

        // Группируем по городам
        const cityMap = new Map<string, CityData>()

        buildings?.forEach(building => {
          if (!building.city) return

          const existing = cityMap.get(building.city)

          if (existing) {
            existing.buildingCount++
            // Если еще нет изображения, добавляем первое найденное
            if (!existing.sampleImage && building.image_url) {
              existing.sampleImage = building.image_url
              existing.sampleLat = building.latitude
              existing.sampleLng = building.longitude
            }
          } else {
            cityMap.set(building.city, {
              city: building.city,
              buildingCount: 1,
              sampleImage: building.image_url || null,
              sampleLat: building.latitude || null,
              sampleLng: building.longitude || null
            })
          }
        })

        // Сортируем по количеству зданий и берем топ-4
        const topCities = Array.from(cityMap.values())
          .sort((a, b) => b.buildingCount - a.buildingCount)
          .slice(0, 4)

        setCities(topCities)
      } catch (err) {
        console.error('Failed to fetch cities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopCities()
  }, [supabase])

  const handleCityClick = (cityName: string) => {
    router.push(`/map?city=${encodeURIComponent(cityName)}`)
  }

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (cities.length === 0) {
    return null // Не показываем секцию если нет городов
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Исследуй города
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Отправляйся в архитектурное путешествие по самым интересным городам
          </p>
        </div>

        {/* Сетка городов */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cities.map((city, index) => (
            <button
              key={city.city}
              onClick={() => handleCityClick(city.city)}
              className="group relative h-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Фоновое изображение */}
              {city.sampleImage ? (
                <OptimizedImage
                  src={getStorageUrl(city.sampleImage, 'photos')}
                  alt={city.city}
                  fill
                  className="transition-transform duration-500 group-hover:scale-110"
                  objectFit="cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  priority={index === 0}
                />
              ) : (
                // Fallback градиент если нет изображения
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
              )}

              {/* Темный оверлей */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

              {/* Контент */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                {/* Название города */}
                <h3 className="text-2xl font-bold mb-2 transform transition-transform duration-300 group-hover:translate-y-[-4px]">
                  {city.city}
                </h3>

                {/* Счетчик зданий */}
                <div className="flex items-center space-x-2 text-white/90">
                  <Building2 size={18} />
                  <span className="text-sm font-medium">
                    {city.buildingCount} {city.buildingCount === 1 ? 'здание' : city.buildingCount < 5 ? 'здания' : 'зданий'}
                  </span>
                </div>

                {/* Индикатор перехода */}
                <div className="mt-4 flex items-center space-x-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <MapPin size={16} />
                  <span>Open Map</span>
                </div>
              </div>

              {/* Декоративный бордер при hover */}
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/30 transition-colors duration-300 rounded-2xl" />
            </button>
          ))}
        </div>

        {/* CTA кнопка для всех городов */}
        {cities.length >= 4 && (
          <div className="mt-12 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => router.push('/buildings')}
              className="inline-flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <span>View All Cities</span>
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
