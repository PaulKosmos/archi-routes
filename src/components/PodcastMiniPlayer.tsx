'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, ChevronUp } from 'lucide-react'
import { PodcastEpisode } from '@/types/podcast'
import { getStorageUrl } from '@/lib/storage'
import { SupabaseClient } from '@supabase/supabase-js'

interface PodcastMiniPlayerProps {
  episode: PodcastEpisode | null
  audioUrl?: string
  isPlaying: boolean
  onPlayPause: () => void
  onClose: () => void
  supabase?: SupabaseClient
}

export default function PodcastMiniPlayer({
  episode,
  audioUrl,
  isPlaying,
  onPlayPause,
  onClose,
  supabase
}: PodcastMiniPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Generate proper storage URL for audio
  const storageAudioUrl = audioUrl ? getStorageUrl(audioUrl, 'podcasts') : ''

  // Auto play/pause when isPlaying changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Play error:', err))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Rewind 15 seconds
  const rewind = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  // Fast forward 15 seconds
  const fastForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15)
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  // Update progress
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  // Handle audio ended
  const handleEnded = () => {
    onPlayPause() // This will set isPlaying to false
    setCurrentTime(0)
  }

  // Change playback speed
  const selectPlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
    setShowSpeedMenu(false)
  }

  // Volume control
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

  // Set duration when metadata is loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  // Seek to position
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // Fallback duration from episode
  const episodeDuration = duration || (episode?.duration_seconds || 0)

  // Don't render if no episode
  if (!episode) {
    return (
      <div className="py-2 text-center text-sm text-gray-500">
        Выберите подкаст для прослушивания
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="flex items-center gap-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close player"
          >
            <X size={20} className="text-gray-600" />
          </button>

          {/* Episode Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
              {episode.title}
            </h3>
            {episode.series && (
              <p className="text-xs text-gray-500">{episode.series.title}</p>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            {/* Rewind */}
            <button
              onClick={rewind}
              className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rewind 15 seconds"
            >
              <SkipBack size={16} className="text-gray-700" />
              <span className="text-xs font-semibold text-gray-700">15s</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="ml-0.5" />
              )}
            </button>

            {/* Fast Forward */}
            <button
              onClick={fastForward}
              className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fast forward 15 seconds"
            >
              <span className="text-xs font-semibold text-gray-700">15s</span>
              <SkipForward size={16} className="text-gray-700" />
            </button>

            {/* Playback Speed Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors text-xs font-semibold text-gray-700 flex items-center gap-1"
                title="Change playback speed"
              >
                {playbackRate}x
                <ChevronUp size={14} className={`transition-transform ${showSpeedMenu ? '' : 'rotate-180'}`} />
              </button>

              {/* Speed menu popup */}
              {showSpeedMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSpeedMenu(false)}
                  />
                  <div className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[80px]">
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

            {/* Time Display */}
            <div className="text-xs text-gray-600 font-medium w-20 text-right">
              {formatTime(currentTime)} / {formatTime(episodeDuration)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-xs hidden sm:block">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              style={{
                background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, rgb(229, 231, 235) ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, rgb(229, 231, 235) 100%)`
              }}
            />
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <div className="w-20 hidden sm:flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Hidden Audio Element with WAV support */}
        {storageAudioUrl && (
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onLoadedMetadata={handleLoadedMetadata}
            crossOrigin="anonymous"
          >
            <source src={storageAudioUrl} type="audio/mpeg" />
            <source src={storageAudioUrl} type="audio/wav" />
            <source src={storageAudioUrl} type="audio/ogg" />
          </audio>
        )}
    </div>
  )
}
