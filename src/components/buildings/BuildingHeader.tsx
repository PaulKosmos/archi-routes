// src/components/buildings/BuildingHeader.tsx - ПОЛНАЯ ВЕРСИЯ

'use client'

import { useState, useMemo } from 'react'
import { Building } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { Heart, Share2, Camera, MapPin, Calendar, User, Award, ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getStorageUrl } from '@/lib/storage'
import AddToCollectionButton from '@/components/collections/AddToCollectionButton'

interface BuildingHeaderProps {
  building: Building
  userFavorite: any
  onFavoriteUpdate: () => void
}

export default function BuildingHeader({ building, userFavorite, onFavoriteUpdate }: BuildingHeaderProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  // Проверяем права на редактирование
  const canEdit = user && (
    user.id === building.created_by || 
    profile?.role === 'admin'
  )
  
  console.log('🔍 BuildingHeader - canEdit check:', {
    user: !!user,
    userId: user?.id,
    buildingCreatedBy: building.created_by,
    profileRole: profile?.role,
    canEdit
  })

  // Получаем все изображения здания с правильными URL
  const images = [
    building.image_url ? getStorageUrl(building.image_url, 'photos') : null,
    ...(building.image_urls || []).map(url => url ? getStorageUrl(url, 'photos') : null)
  ].filter(Boolean)
  
  console.log('🏢 Building images:', {
    originalImageUrl: building.image_url,
    originalImageUrls: building.image_urls,
    processedImages: images
  })

  const handleFavoriteToggle = async () => {
    if (!user) {
      alert('Необходимо войти в систему для добавления в избранное')
      return
    }

    setFavoriteLoading(true)
    try {
      if (userFavorite) {
        const { error } = await supabase
          .from('user_building_favorites')
          .delete()
          .eq('id', userFavorite.id)
        
        if (error) throw error
        console.log('❤️ Removed from favorites')
      } else {
        const { error } = await supabase
          .from('user_building_favorites')
          .insert({
            user_id: user.id,
            building_id: building.id,
            visit_status: 'want_to_visit'
          })
        
        if (error) throw error
        console.log('❤️ Added to favorites')
      }
      
      onFavoriteUpdate()
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Ошибка при добавлении в избранное. Попробуйте ещё раз.')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: building.name,
          text: building.description || `Архитектурный объект: ${building.name}`,
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Ссылка скопирована в буфер обмена')
    }
  }

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Изображение - теперь в колонке, не на весь экран */}
          <div className="lg:w-1/2">
            <div className="relative h-80 lg:h-96 overflow-hidden rounded-lg">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={building.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('🖼️ Header image loading error:', images[currentImageIndex])
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                    onLoad={(e) => {
                      console.log('✅ Header image loaded:', images[currentImageIndex])
                    }}
                  />
                  
                  {/* Навигация по изображениям */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      
                      {/* Индикаторы изображений */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Фото недоступно</p>
                  </div>
                </div>
              )}

              {/* Действия в правом верхнем углу */}
              <div className="absolute top-4 right-4 flex space-x-2">
                {canEdit && (
                  <Link
                    href={`/buildings/${building.id}/edit`}
                    className="p-3 bg-white/90 text-gray-700 rounded-full backdrop-blur-sm hover:bg-white transition-colors"
                    title="Редактировать здание"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                )}
                
                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                    userFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/90 text-gray-700 hover:bg-white'
                  } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`h-5 w-5 ${userFavorite ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={handleShare}
                  className="p-3 bg-white/90 text-gray-700 rounded-full backdrop-blur-sm hover:bg-white transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              {/* Верификация */}
              {building.verified && (
                <div className="absolute top-4 left-4">
                  <div className="flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Award className="h-4 w-4 mr-1" />
                    Проверено
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Информационная панель - теперь рядом с фото */}
          <div className="lg:w-1/2 flex flex-col justify-between">
            
            {/* Основная информация */}
            <div className="flex-1">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{building.city}, {building.country}</span>
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {building.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                {building.architect && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{building.architect}</span>
                  </div>
                )}
                
                {building.year_built && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{building.year_built}</span>
                  </div>
                )}
                
                {building.architectural_style && (
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {building.architectural_style}
                  </div>
                )}
              </div>

              {/* Описание */}
              {building.description && (
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">{building.description}</p>
                </div>
              )}
            </div>

            {/* Рейтинг и действия */}
            <div className="flex items-center justify-between">
              
              {/* Рейтинг */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.floor(building.rating || 0) ? 'fill-current' : 'fill-gray-200'
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-lg font-semibold text-gray-900">
                    {(building.rating || 0).toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {building.review_count || 0} {building.review_count === 1 ? 'отзыв' : 'отзывов'}
                </p>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-3">
                <AddToCollectionButton
                  buildingId={building.id}
                  buildingName={building.name}
                  size="md"
                />
                
                <Link
                  href={`/buildings/${building.id}/review/new`}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Написать обзор
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
