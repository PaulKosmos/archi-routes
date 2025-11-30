'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Headphones } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  title?: string
  onPositionChange?: (position: number) => void
  initialPosition?: number
}

export default function AudioPlayer({
  audioUrl,
  title,
  onPositionChange,
  initialPosition = 0
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialPosition)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Инициализация аудио
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Устанавливаем начальную позицию
    if (initialPosition > 0) {
      audio.currentTime = initialPosition
    }

    // Обработчики событий
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      if (onPositionChange) {
        onPositionChange(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl, initialPosition, onPositionChange])

  // Управление воспроизведением
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  // Перемотка
  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, duration))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Изменение позиции
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Изменение громкости
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  // Переключение mute
  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume || 0.5
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  // Изменение скорости
  const togglePlaybackRate = () => {
    const audio = audioRef.current
    if (!audio) return

    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const currentIndex = rates.indexOf(playbackRate)
    const nextRate = rates[(currentIndex + 1) % rates.length]
    
    audio.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 shadow-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Заголовок */}
      {title && (
        <div className="mb-4">
          <h5 className="font-semibold text-gray-900 flex items-center">
            <Headphones className="w-5 h-5 mr-2 text-purple-600" />
            {title}
          </h5>
        </div>
      )}

      {/* Прогресс бар */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Управление */}
      <div className="flex items-center justify-between">
        {/* Основные кнопки */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => skip(-15)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Назад 15 сек"
          >
            <SkipBack className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={togglePlay}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>
          
          <button
            onClick={() => skip(15)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Вперед 15 сек"
          >
            <SkipForward className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Громкость и скорость */}
        <div className="flex items-center space-x-4">
          {/* Громкость */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-700" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-700" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Скорость */}
          <button
            onClick={togglePlaybackRate}
            className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="Скорость воспроизведения"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  )
}
