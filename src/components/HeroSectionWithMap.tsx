'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MapPin, Search } from 'lucide-react'

interface City {
  name: string
  buildingCount: number
  sampleImage?: string
  latitude?: number
  longitude?: number
}

export default function HeroSectionWithMap() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [searchQuery, setSearchQuery] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)

  // Словарь транслитерации для популярных городов
  const cityTranslations = useMemo(() => new Map([
    ['berlin', ['берлин', 'berlin']],
    ['moscow', ['москва', 'moscow']],
    ['paris', ['париж', 'paris']],
    ['london', ['лондон', 'london']],
    ['rome', ['рим', 'rome']],
    ['madrid', ['мадрид', 'madrid']],
    ['vienna', ['вена', 'vienna']],
    ['prague', ['прага', 'prague']],
    ['istanbul', ['стамбул', 'istanbul']],
    ['athens', ['афины', 'athens']],
    ['barcelona', ['барселона', 'barcelona']],
    ['amsterdam', ['амстердам', 'amsterdam']],
    ['budapest', ['будапешт', 'budapest']],
    ['warsaw', ['варшава', 'warsaw']],
    ['stockholm', ['стокгольм', 'stockholm']],
    ['helsinki', ['хельсинки', 'helsinki']],
    ['copenhagen', ['копенгаген', 'copenhagen']],
    ['oslo', ['осло', 'oslo']],
  ]), [])

  // Функция нормализации для мультиязычного поиска
  const normalizeSearchQuery = useCallback((query: string): string[] => {
    const normalized = query.toLowerCase().trim()
    const variants = [normalized]

    // Проверяем, есть ли город в словаре транслитераций
    for (const [key, translations] of cityTranslations) {
      if (translations.some(t => t.includes(normalized) || normalized.includes(t))) {
        variants.push(...translations, key)
      }
    }

    return [...new Set(variants)] // Убираем дубликаты
  }, [cityTranslations])

  // Загрузка городов из БД
  useEffect(() => {
    async function fetchCities() {
      const { data, error } = await supabase
        .from('buildings')
        .select('city, latitude, longitude')
        .not('city', 'is', null)
        .eq('moderation_status', 'approved')

      if (data && !error) {
        // Группируем по городам и считаем количество
        const cityMap = new Map<string, City>()

        data.forEach(building => {
          if (building.city) {
            const existing = cityMap.get(building.city)
            if (existing) {
              existing.buildingCount++
            } else {
              cityMap.set(building.city, {
                name: building.city,
                buildingCount: 1,
                latitude: building.latitude || undefined,
                longitude: building.longitude || undefined
              })
            }
          }
        })

        const citiesList = Array.from(cityMap.values())
          .sort((a, b) => b.buildingCount - a.buildingCount)

        setCities(citiesList)
      }
    }

    fetchCities()
  }, [supabase])

  // Фильтрация городов по запросу с мультиязычной поддержкой
  useEffect(() => {
    if (searchQuery.trim()) {
      const queryVariants = normalizeSearchQuery(searchQuery)

      const filtered = cities.filter(city => {
        const cityNameLower = city.name.toLowerCase()
        // Проверяем совпадение с любым вариантом запроса
        return queryVariants.some(variant =>
          cityNameLower.includes(variant) || variant.includes(cityNameLower)
        )
      })

      setFilteredCities(filtered.slice(0, 5)) // Показываем топ-5 совпадений
      setShowSuggestions(true)
    } else {
      setFilteredCities([])
      setShowSuggestions(false)
    }
  }, [searchQuery, cities, normalizeSearchQuery])

  // Обработка выбора города
  const handleCitySelect = useCallback((cityName: string) => {
    setSelectedCity(cityName)
    setSearchQuery(cityName)
    setShowSuggestions(false)
    setIsAnimating(true)

    // Анимация "шторки" - через 800ms переходим на карту
    setTimeout(() => {
      router.push(`/map?city=${encodeURIComponent(cityName)}`)
    }, 800)
  }, [router])

  // Обработка нажатия Enter
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (searchQuery.trim()) {
      const queryVariants = normalizeSearchQuery(searchQuery)

      // Ищем точное совпадение с учетом нормализации
      const exactMatch = cities.find(city => {
        const cityNameLower = city.name.toLowerCase()
        return queryVariants.some(variant =>
          cityNameLower === variant || variant === searchQuery.toLowerCase()
        )
      })

      const cityToSelect = exactMatch || filteredCities[0]

      if (cityToSelect) {
        handleCitySelect(cityToSelect.name)
      } else {
        // Если нет точного совпадения, переходим на карту с общим поиском
        setIsAnimating(true)
        setTimeout(() => {
          router.push(`/map?q=${encodeURIComponent(searchQuery)}`)
        }, 800)
      }
    }
  }, [searchQuery, cities, filteredCities, handleCitySelect, normalizeSearchQuery, router])

  return (
    <section
      className={`relative w-full h-[80vh] min-h-[500px] overflow-hidden transition-all duration-800 ${
        isAnimating ? 'hero-slide-down' : ''
      }`}
    >
      {/* Фон с имитацией карты (градиент + паттерн) */}
      <div
        className="absolute inset-0 z-0 transition-all duration-500"
        style={{
          filter: isAnimating ? 'blur(0px)' : 'blur(4px)',
          opacity: isAnimating ? 1 : 0.6,
          background: `
            linear-gradient(135deg,
              rgba(147, 197, 253, 0.8) 0%,
              rgba(196, 181, 253, 0.8) 25%,
              rgba(252, 211, 77, 0.7) 50%,
              rgba(167, 243, 208, 0.8) 75%,
              rgba(147, 197, 253, 0.8) 100%
            ),
            repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.05) 35px, rgba(0,0,0,.05) 70px),
            repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(0,0,0,.03) 35px, rgba(0,0,0,.03) 70px)
          `,
          backgroundSize: '400% 400%, 100% 100%, 100% 100%',
          animation: 'gradient-shift 15s ease infinite'
        }}
      />

      {/* Градиентный оверлей для лучшей читаемости - исчезает при анимации */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 z-0 transition-opacity duration-500"
        style={{ opacity: isAnimating ? 0 : 1 }}
      />

      {/* Контент - скрывается при анимации */}
      <div
        className="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-6 lg:px-8 transition-opacity duration-300"
        style={{ opacity: isAnimating ? 0 : 1, pointerEvents: isAnimating ? 'none' : 'auto' }}
      >
        {/* Заголовок */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-8 animate-fade-in">
          Открой город. Поделись историей.
        </h1>

        {/* Подзаголовок */}
        <p className="text-lg sm:text-xl text-white/90 text-center mb-12 max-w-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Исследуй архитектурные шедевры, создавай маршруты и делись впечатлениями
        </p>

        {/* Поиск по городам */}
        <div className="w-full max-w-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={24} />
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Введите название города (например, Берлин, Стамбул, Прага...)"
                className="w-full pl-14 pr-4 py-5 text-lg rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all"
              />
            </div>

            {/* Автокомплит */}
            {showSuggestions && filteredCities.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl overflow-hidden z-50 animate-slide-down">
                {filteredCities.map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleCitySelect(city.name)}
                    className="w-full px-6 py-4 hover:bg-blue-50 transition-colors flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin size={20} className="text-blue-600 group-hover:text-blue-700" />
                      <div>
                        <div className="font-medium text-gray-900">{city.name}</div>
                        <div className="text-sm text-gray-500">
                          {city.buildingCount} {city.buildingCount === 1 ? 'здание' : 'зданий'}
                        </div>
                      </div>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Кнопка поиска для мобильных */}
            <button
              type="submit"
              className="mt-4 w-full sm:hidden bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors font-medium border border-white/30"
            >
              Найти город
            </button>
          </form>

          {/* Популярные города (показываем если нет поискового запроса) */}
          {!searchQuery && cities.length > 0 && (
            <div className="mt-8 text-center">
              <div className="text-white/80 text-sm mb-3">Популярные города:</div>
              <div className="flex flex-wrap justify-center gap-2">
                {cities.slice(0, 4).map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleCitySelect(city.name)}
                    className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-all hover:scale-105 border border-white/30"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Индикатор скролла */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="text-white/60 text-sm mb-2">Прокрути вниз</div>
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/60 rounded-full animate-scroll" />
          </div>
        </div>
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

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scroll {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(12px);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .animate-scroll {
          animation: scroll 1.5s ease-in-out infinite;
        }

        .hero-slide-down {
          animation: heroSlideDown 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes heroSlideDown {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  )
}
