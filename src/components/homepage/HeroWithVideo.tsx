'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface HeroWithVideoProps {
  videoUrl?: string
  posterUrl?: string
  stats?: {
    buildings: number
    routes: number
    reviews: number
  }
}

export default function HeroWithVideo({
  videoUrl = '/videos/hero-background.mp4',
  posterUrl = '/images/hero-poster.jpg',
  stats = { buildings: 2500, routes: 500, reviews: 10000 }
}: HeroWithVideoProps) {
  const router = useRouter()
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Preload video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/buildings?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden bg-gray-900">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            isVideoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl}
          onLoadedData={() => setIsVideoLoaded(true)}
        >
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl.replace('.mp4', '.webm')} type="video/webm" />
        </video>

        {/* Gradient overlay - asymmetric for visual interest */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full">
          {/* Main heading with unique typography */}
          <div className="mb-8 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-medium text-white/60 tracking-wider uppercase">
                Исследуй города и их истории
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
            </div>

            <h1 className="text-white">
              <span className="block text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
                Открывай города
              </span>
              <span className="block text-5xl md:text-7xl font-light tracking-tight leading-[0.95] mt-1">
                через <span className="font-bold italic">маршруты</span>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 max-w-2xl pt-4 leading-relaxed">
              Исследуй архитектуру, создавай уникальные маршруты, делись историями с сообществом
            </p>
          </div>

          {/* Search Bar - unique design */}
          <div className="mb-10 max-w-3xl">
            <form onSubmit={handleSearch} className="relative">
              <div
                className={`relative bg-white/10 backdrop-blur-md border transition-all duration-300 ${
                  isSearchFocused
                    ? 'border-white/40 shadow-2xl shadow-white/20'
                    : 'border-white/20 shadow-xl'
                }`}
                style={{ borderRadius: '2px' }} // Sharp corners for modern look
              >
                <div className="flex items-center">
                  <div className="pl-5 pr-3">
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Найти город, здание или архитектора..."
                    className="flex-1 bg-transparent text-white placeholder-white/50 py-4 pr-5 outline-none text-base"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* CTA Buttons - asymmetric layout */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/map"
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 font-semibold overflow-hidden transition-all duration-300 hover:bg-gray-100"
              style={{ borderRadius: '2px' }}
            >
              <span className="relative z-10">Создать маршрут</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <Link
              href="/map"
              className="group inline-flex items-center gap-3 px-8 py-4 border-2 border-white/30 text-white font-medium backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/50"
              style={{ borderRadius: '2px' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Исследовать карту</span>
            </Link>
          </div>

          {/* Stats Bar - horizontal line design */}
          <div className="relative">
            {/* Top line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="grid grid-cols-3 gap-8 py-6">
              <div className="text-center border-r border-white/10 last:border-r-0">
                <div className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                  {stats.buildings.toLocaleString()}+
                </div>
                <div className="text-sm text-white/60 uppercase tracking-wider mt-1">
                  Зданий
                </div>
              </div>

              <div className="text-center border-r border-white/10 last:border-r-0">
                <div className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                  {stats.routes.toLocaleString()}+
                </div>
                <div className="text-sm text-white/60 uppercase tracking-wider mt-1">
                  Маршрутов
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white tabular-nums">
                  {(stats.reviews / 1000).toFixed(0)}K+
                </div>
                <div className="text-sm text-white/60 uppercase tracking-wider mt-1">
                  Отзывов
                </div>
              </div>
            </div>

            {/* Bottom line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator - subtle */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
        <span className="text-xs text-white uppercase tracking-widest">Прокрутите вниз</span>
        <div className="w-px h-12 bg-gradient-to-b from-white to-transparent animate-pulse"></div>
      </div>
    </section>
  )
}
