// src/components/buildings/BuildingHeader.tsx - ПОЛНАЯ ВЕРСИЯ

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Building } from '@/types/building'
import { createClient } from '@/lib/supabase'
import { Heart, Share2, Camera, MapPin, Award, ChevronLeft, ChevronRight, Edit, Star } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getStorageUrl } from '@/lib/storage'
import toast from 'react-hot-toast'

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

  // Building rating state
  const [buildingRating, setBuildingRating] = useState(0)
  const [buildingRatingCount, setBuildingRatingCount] = useState(0)
  const [userBuildingRating, setUserBuildingRating] = useState(0)
  const [hoveredBuildingRating, setHoveredBuildingRating] = useState(0)

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
  const images: string[] = [
    building.image_url ? getStorageUrl(building.image_url, 'photos') : null,
    ...(building.image_urls || []).map(url => url ? getStorageUrl(url, 'photos') : null)
  ].filter((url): url is string => url !== null)
  
  console.log('🏢 Building images:', {
    originalImageUrl: building.image_url,
    originalImageUrls: building.image_urls,
    processedImages: images
  })

  // Load building rating data
  useEffect(() => {
    const loadBuildingRating = async () => {
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
        setBuildingRating(avg)
        setBuildingRatingCount(data.length)
      }
    }

    const loadUserBuildingRating = async () => {
      if (!user) return
      const { data } = await supabase
        .from('building_ratings')
        .select('rating')
        .eq('building_id', building.id)
        .eq('user_id', user.id)
        .single()

      if (data) setUserBuildingRating(data.rating)
    }

    loadBuildingRating()
    loadUserBuildingRating()
  }, [building.id, user])

  const handleRateBuilding = async (rating: number) => {
    if (!user) {
      toast.error('Sign in to rate this object')
      return
    }

    try {
      const { error } = await supabase
        .from('building_ratings')
        .upsert({
          building_id: building.id,
          user_id: user.id,
          rating,
          updated_at: new Date().toISOString()
        }, { onConflict: 'building_id,user_id' })

      if (error) throw error

      const oldRating = userBuildingRating
      setUserBuildingRating(rating)

      if (oldRating > 0) {
        const newAvg = buildingRatingCount > 0
          ? (buildingRating * buildingRatingCount - oldRating + rating) / buildingRatingCount
          : rating
        setBuildingRating(newAvg)
      } else {
        const newCount = buildingRatingCount + 1
        const newAvg = (buildingRating * buildingRatingCount + rating) / newCount
        setBuildingRating(newAvg)
        setBuildingRatingCount(newCount)
      }

      toast.success(`Rating ${rating}/5 saved!`)
    } catch (error) {
      console.error('Error rating building:', error)
      toast.error('Error saving rating')
    }
  }

  const handleFavoriteToggle = async () => {
    if (!user) {
      alert('You need to sign in to add to favorites')
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
      alert('Error adding to favorites. Please try again.')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: building.name,
          text: building.description || `Architectural object: ${building.name}`,
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard')
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
    <div className="bg-card">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">

          {/* Изображение - теперь в колонке, не на весь экран */}
          <div className="lg:w-1/2">
            <div className="relative h-56 sm:h-80 lg:h-96 overflow-hidden rounded-[var(--radius)]">
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
                <div className="w-full h-full bg-muted flex items-center justify-center rounded-[var(--radius)]">
                  <div className="text-center">
                    <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Photo unavailable</p>
                  </div>
                </div>
              )}

              {/* Действия в правом верхнем углу */}
              <div className="absolute top-4 right-4 flex space-x-2">
                {canEdit && (
                  <Link
                    href={`/buildings/${building.id}/edit`}
                    className="p-3 bg-card/90 text-foreground rounded-full backdrop-blur-sm hover:bg-card transition-colors"
                    title="Edit object"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                )}

                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={`p-3 rounded-full backdrop-blur-sm transition-colors ${
                    userFavorite
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-card/90 text-foreground hover:bg-card'
                  } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Heart className={`h-5 w-5 ${userFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-3 bg-card/90 text-foreground rounded-full backdrop-blur-sm hover:bg-card transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>

              {/* Верификация */}
              {building.verified && (
                <div className="absolute top-4 left-4">
                  <div className="flex items-center bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Award className="h-4 w-4 mr-1" />
                    Verified
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Информационная панель - теперь рядом с фото */}
          <div className="lg:w-1/2 flex flex-col justify-between">
            
            {/* Основная информация */}
            <div className="flex-1">
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{building.city}, {building.country}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-foreground mb-2 sm:mb-4">
                {building.name}
              </h1>
            </div>

            {/* Рейтинг */}
            <div>
              <div className="flex items-center mb-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isActive = userBuildingRating >= star || (hoveredBuildingRating >= star && hoveredBuildingRating > 0)
                    const isFilled = !hoveredBuildingRating && buildingRating >= star

                    return (
                      <button
                        key={star}
                        onClick={() => handleRateBuilding(star)}
                        onMouseEnter={() => setHoveredBuildingRating(star)}
                        onMouseLeave={() => setHoveredBuildingRating(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                        title={`Rate ${star}/5`}
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            isActive
                              ? 'fill-yellow-400 text-yellow-400'
                              : isFilled
                                ? 'fill-yellow-400/60 text-yellow-400/60'
                                : 'text-muted-foreground/30'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                {buildingRatingCount > 0 && (
                  <span className="ml-2 text-lg font-semibold font-metrics text-foreground">
                    {buildingRating.toFixed(1)}
                  </span>
                )}
              </div>
              {(buildingRatingCount > 0 || userBuildingRating > 0) && (
                <p className="text-sm text-muted-foreground font-metrics">
                  {buildingRatingCount > 0 && `${buildingRatingCount} ${buildingRatingCount === 1 ? 'rating' : 'ratings'}`}
                  {userBuildingRating > 0 && <span className="text-primary ml-2">Your: {userBuildingRating}/5</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
