'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown, Headphones } from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  title: string
  duration?: number
  onPlay?: () => void
  onPause?: () => void
  className?: string
}

export default function PodcastPlayer({
  audioUrl,
  title,
  duration,
  onPlay,
  onPause,
  className = ''
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [totalDuration, setTotalDuration] = useState(duration || 0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      if (!duration) {
        setTotalDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [duration, isSeeking, onPlay, onPause])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(err => console.error('Play error:', err))
    }
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = Math.max(0, Math.min(audio.currentTime + seconds, totalDuration))
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
    setShowSpeedMenu(false)
  }

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  return (
    <div className={`bg-card border border-border rounded-[var(--radius)] p-3 sm:p-6 shadow-sm ${className}`}>
      {/* Hidden audio element with multi-format support */}
      <audio ref={audioRef} crossOrigin="anonymous">
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        <source src={audioUrl} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>

      {/* Заголовок */}
      <div className="mb-3 sm:mb-4">
        <h5 className="font-semibold text-sm sm:text-base text-foreground flex items-center">
          <Headphones className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-muted-foreground" />
          {title}
        </h5>
      </div>

      {/* Прогресс бар с заполнением */}
      <div className="mb-3 sm:mb-4">
        <div className="relative w-full h-1.5 sm:h-2 bg-muted rounded-full">
          {/* Заполненная часть прогресс-бара */}
          <div
            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Прозрачный range input поверх */}
          <input
            type="range"
            min="0"
            max={totalDuration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Управление */}
      <div className="flex items-center justify-between gap-2">
        {/* Основные кнопки */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => skip(-15)}
            className="flex flex-col items-center p-1 sm:p-2 hover:bg-muted rounded-[var(--radius)] transition-colors group"
            title="Back 15 sec"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <span className="hidden sm:inline text-[10px] text-muted-foreground mt-0.5">15 сек</span>
          </button>

          <button
            onClick={togglePlay}
            className="p-2 sm:p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(15)}
            className="flex flex-col items-center p-1 sm:p-2 hover:bg-muted rounded-[var(--radius)] transition-colors group"
            title="Forward 15 sec"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <span className="hidden sm:inline text-[10px] text-muted-foreground mt-0.5">15 сек</span>
          </button>
        </div>

        {/* Громкость и скорость */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Громкость */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-1.5 sm:p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              )}
            </button>
            <div className="hidden sm:block relative w-20 h-1 bg-muted rounded-full">
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
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-muted border border-border rounded-[var(--radius)] text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              title="Playback speed"
            >
              <span>{playbackRate}x</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-[var(--radius)] shadow-lg py-1 min-w-[80px] z-50">
                  {speedOptions.map(rate => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${playbackRate === rate ? 'bg-muted font-semibold text-primary' : 'text-foreground'
                        }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
