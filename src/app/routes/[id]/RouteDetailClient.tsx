// src/app/routes/[id]/RouteDetailClient.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, User, Star, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import RouteMap from './RouteMap'

interface RouteDetailClientProps {
  route: any // Используем any чтобы избежать конфликтов типов
}

export default function RouteDetailClient({ route }: RouteDetailClientProps) {
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [isNavigationMode, setIsNavigationMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const currentPoint = route.route_points?.[currentPointIndex]

  // Обработчики аудиоплеера
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handlePrevPoint = () => {
    if (currentPointIndex > 0) {
      setCurrentPointIndex(currentPointIndex - 1)
      setIsPlaying(false)
    }
  }

  const handleNextPoint = () => {
    if (currentPointIndex < (route.route_points?.length || 0) - 1) {
      setCurrentPointIndex(currentPointIndex + 1)
      setIsPlaying(false)
    }
  }

  // Обновление аудио при смене точки
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [currentPointIndex])

  // Обработчики событий аудио
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentPoint])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (level: string) => {
    switch (level) {
      case 'easy': return 'Легкий'
      case 'medium': return 'Средний'
      case 'hard': return 'Сложный'
      default: return 'Не указан'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Навигация */}
      <div className="mb-6">
        <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} className="mr-2" />
          Назад к главной
        </Link>
      </div>

      {/* Заголовок маршрута */}
      <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{route.title}</h1>
            <p className="text-gray-600 text-lg">{route.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(route.difficulty_level || '')}`}>
            {getDifficultyText(route.difficulty_level || '')}
          </span>
        </div>

        {/* Метаинформация */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="flex items-center text-gray-600">
            <MapPin size={20} className="mr-2" />
            <span>{route.route_points?.length || 0} точек</span>
          </div>
          {route.estimated_duration_minutes && (
            <div className="flex items-center text-gray-600">
              <Clock size={20} className="mr-2" />
              <span>{route.estimated_duration_minutes} мин</span>
            </div>
          )}
          {route.distance_km && (
            <div className="flex items-center text-gray-600">
              <MapPin size={20} className="mr-2" />
              <span>{Number(route.distance_km).toFixed(1)} км</span>
            </div>
          )}
          <div className="flex items-center text-gray-600">
            <User size={20} className="mr-2" />
            <span>{route.profiles?.full_name || 'Автор'}</span>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsNavigationMode(!isNavigationMode)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isNavigationMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isNavigationMode ? 'Завершить прохождение' : 'Начать маршрут'}
          </button>
          <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Сохранить в избранное
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Карта */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Карта маршрута</h2>
            </div>
            <div className="p-4">
              <RouteMap 
                route={route} 
                currentPointIndex={isNavigationMode ? currentPointIndex : -1}
              />
            </div>
          </div>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Навигация по точкам */}
          {isNavigationMode && currentPoint && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">
                Точка {currentPointIndex + 1} из {route.route_points?.length || 0}
              </h3>
              
              {/* Прогресс */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentPointIndex + 1) / (route.route_points?.length || 1)) * 100}%` }}
                />
              </div>

              {/* Навигационные кнопки */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevPoint}
                  disabled={currentPointIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 disabled:text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <SkipBack size={16} className="mr-1" />
                  Назад
                </button>
                <button
                  onClick={handleNextPoint}
                  disabled={currentPointIndex === (route.route_points?.length || 0) - 1}
                  className="flex items-center px-4 py-2 text-gray-600 disabled:text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Вперед
                  <SkipForward size={16} className="ml-1" />
                </button>
              </div>

              {/* Аудиоплеер */}
              {currentPoint.audio_url && (
                <div className="border-t pt-4">
                  <audio
                    ref={audioRef}
                    src={currentPoint.audio_url}
                    preload="metadata"
                  />
                  
                  <div className="flex items-center space-x-3 mb-3">
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all"
                          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    
                    <Volume2 size={16} className="text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Информация о текущей точке */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">
              {isNavigationMode ? 'Текущая точка' : 'Точки маршрута'}
            </h3>
            
            {isNavigationMode && currentPoint ? (
              /* Детали текущей точки */
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{currentPoint.title}</h4>
                
                {currentPoint.description && (
                  <p className="text-gray-600 text-sm mb-3">{currentPoint.description}</p>
                )}
                
                {/* Информация о связанном здании */}
                {currentPoint.buildings && (
                  <div className="border-t pt-3">
                    <Link 
                      href={`/buildings/${currentPoint.buildings.id}`}
                      className="block hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors"
                    >
                      <h5 className="font-medium text-blue-600 mb-1">{currentPoint.buildings.name}</h5>
                      <p className="text-sm text-gray-600 mb-1">
                        {currentPoint.buildings.architect} • {currentPoint.buildings.year_built}
                      </p>
                      <p className="text-sm text-gray-600">{currentPoint.buildings.architectural_style}</p>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Список всех точек */
              <div className="space-y-4">
                {(route.route_points || []).map((point: any, index: number) => (
                  <div 
                    key={point.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      index === currentPointIndex && isNavigationMode
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setCurrentPointIndex(index)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === currentPointIndex && isNavigationMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{point.title}</h4>
                        {point.buildings && (
                          <p className="text-xs text-gray-600 mt-1">{point.buildings.name}</p>
                        )}
                        {point.audio_url && (
                          <div className="flex items-center mt-1">
                            <Play size={12} className="text-blue-600 mr-1" />
                            <span className="text-xs text-blue-600">Есть аудио</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Информация об авторе */}
          {route.profiles && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Автор маршрута</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(route.profiles.full_name || route.profiles.username || 'А')[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {route.profiles.full_name || route.profiles.username || 'Автор'}
                  </h4>
                  <p className="text-sm text-gray-600 capitalize">{route.profiles.role || 'Пользователь'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Статистика маршрута */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Статистика</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Завершений:</span>
                <span className="font-medium">{route.completion_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Рейтинг:</span>
                <div className="flex items-center">
                  <Star size={16} className="text-yellow-400 mr-1" />
                  <span className="font-medium">
                    {route.rating ? Number(route.rating).toFixed(1) : 'Нет оценок'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Создан:</span>
                <span className="font-medium">
                  {new Date(route.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}