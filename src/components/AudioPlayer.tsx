'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Headphones, ChevronDown } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  title?: string
  onPositionChange?: (position: number) => void
  initialPosition?: number
  duration?: number
}

export default function AudioPlayer({
  audioUrl,
  title,
  onPositionChange,
  initialPosition = 0,
  duration: propDuration
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialPosition)
  const [duration, setDuration] = useState(propDuration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

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
  const setSpeed = (rate: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.playbackRate = rate
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
  }

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-6 shadow-sm">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Заголовок */}
      {title && (
        <div className="mb-4">
          <h5 className="font-semibold text-foreground flex items-center">
            <Headphones className="w-5 h-5 mr-2 text-muted-foreground" />
            {title}
          </h5>
        </div>
      )}

      {/* Прогресс бар с заполнением */}
      <div className="mb-4">
        <div className="relative w-full h-2 bg-muted rounded-full">
          {/* Заполненная часть прогресс-бара */}
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Прозрачный range input поверх */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Управление */}
      <div className="flex items-center justify-between">
        {/* Основные кнопки */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-15)}
            className="flex flex-col items-center p-2 hover:bg-muted rounded-[var(--radius)] transition-colors group"
            title="Назад 15 сек"
          >
            <SkipBack className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-0.5">15 сек</span>
          </button>

          <button
            onClick={togglePlay}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(15)}
            className="flex flex-col items-center p-2 hover:bg-muted rounded-[var(--radius)] transition-colors group"
            title="Вперед 15 сек"
          >
            <SkipForward className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-0.5">15 сек</span>
          </button>
        </div>

        {/* Громкость и скорость */}
        <div className="flex items-center space-x-4">
          {/* Громкость */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Volume2 className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <div className="relative w-20 h-1 bg-muted rounded-full">
              {/* Заполненная часть громкости */}
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
          </div>

          {/* Скорость с dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-3 py-1.5 bg-muted border border-border rounded-[var(--radius)] text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              title="Скорость воспроизведения"
            >
              <span>{playbackRate}x</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-[var(--radius)] shadow-lg py-1 min-w-[80px] z-50">
                {speedOptions.map(rate => (
                  <button
                    key={rate}
                    onClick={() => setSpeed(rate)}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${
                      playbackRate === rate ? 'bg-muted font-semibold text-primary' : 'text-foreground'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
