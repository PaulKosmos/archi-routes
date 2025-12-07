'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp } from 'lucide-react'

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

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange(volume || 0.5)
    } else {
      handleVolumeChange(0)
      setIsMuted(true)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * totalDuration

    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
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

  const selectPlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
    setShowSpeedMenu(false)
  }

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className={`bg-gray-50 rounded-xl p-5 border border-gray-200 ${className}`}>
      {/* Hidden audio element with WAV support */}
      <audio ref={audioRef} crossOrigin="anonymous">
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        <source src={audioUrl} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>

      {/* Title */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
          {title}
        </p>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.max(0, currentTime - 15)
            }
          }}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          title="Rewind 15s"
        >
          <SkipBack size={20} />
          <span className="text-xs font-semibold mt-0.5">15s</span>
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.currentTime = Math.min(totalDuration, currentTime + 15)
            }
          }}
          className="flex flex-col items-center text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          title="Forward 15s"
        >
          <SkipForward size={20} />
          <span className="text-xs font-semibold mt-0.5">15s</span>
        </button>
      </div>

      {/* Progress bar with timeline */}
      <div className="mb-4">
        <div
          className="h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden group mb-2"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-150"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Volume and extras */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="w-24 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Playback Speed Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-1 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1"
              title="Change playback speed"
            >
              {playbackRate}x
              <ChevronUp size={16} className={`transition-transform ${showSpeedMenu ? '' : 'rotate-180'}`} />
            </button>

            {/* Speed menu popup */}
            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute bottom-full mb-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 min-w-[90px]">
                  {[1, 1.25, 1.5].map(rate => (
                    <button
                      key={rate}
                      onClick={() => selectPlaybackRate(rate)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        playbackRate === rate ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700'
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
