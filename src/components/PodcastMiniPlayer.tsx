'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, X, Volume2, VolumeX, ChevronDown } from 'lucide-react'
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

  // Reset player when episode changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentTime(0)
      audioRef.current.load()
    }
  }, [episode?.id])

  // Auto play/pause when isPlaying changes
  useEffect(() => {
    if (audioRef.current && storageAudioUrl) {
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Play error:', err))
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, storageAudioUrl])

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Skip function
  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration))
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
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
  const setSpeed = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
    setShowSpeedMenu(false)
  }

  // Volume control
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
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Don't render if no episode
  if (!episode) {
    return (
      <div className="py-2 text-center text-sm text-muted-foreground">
        Select a podcast to listen
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-muted rounded-[var(--radius)] transition-colors"
          title="Close player"
        >
          <X size={16} className="text-muted-foreground" />
        </button>

        {/* Episode Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-foreground line-clamp-1">
            {episode.title}
          </h3>
          {episode.series && (
            <p className="text-[10px] text-muted-foreground">{episode.series.title}</p>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Rewind */}
          <button
            onClick={() => skip(-15)}
            className="p-1 hover:bg-muted rounded-[var(--radius)] transition-colors"
            title="Rewind 15 seconds"
          >
            <SkipBack size={14} className="text-muted-foreground" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[var(--radius)] transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} className="ml-0.5" />
            )}
          </button>

          {/* Fast Forward */}
          <button
            onClick={() => skip(15)}
            className="p-1 hover:bg-muted rounded-[var(--radius)] transition-colors"
            title="Fast forward 15 seconds"
          >
            <SkipForward size={14} className="text-muted-foreground" />
          </button>

          {/* Playback Speed Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted border border-border rounded-[var(--radius)] text-[10px] font-medium text-foreground hover:bg-muted/80 transition-colors"
              title="Change playback speed"
            >
              <span>{playbackRate}x</span>
              <ChevronDown size={10} />
            </button>

            {/* Speed menu popup */}
            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div className="absolute bottom-full mb-1 right-0 bg-card border border-border rounded-[var(--radius)] shadow-lg py-1 z-50 min-w-[80px]">
                  {speedOptions.map(rate => (
                    <button
                      key={rate}
                      onClick={() => setSpeed(rate)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${playbackRate === rate ? 'bg-muted font-semibold text-primary' : 'text-foreground'
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
          <div className="text-[10px] text-muted-foreground font-medium w-20 text-right">
            {formatTime(currentTime)} / {formatTime(episodeDuration)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="relative w-full h-1 bg-muted rounded-full">
            {/* Filled part of the progress bar */}
            <div
              className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 hover:bg-muted rounded-[var(--radius)] transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={16} className="text-muted-foreground" />
            ) : (
              <Volume2 size={16} className="text-muted-foreground" />
            )}
          </button>
          <div className="w-20 hidden sm:flex items-center">
            <div className="relative w-full h-1 bg-muted rounded-full">
              {/* Filled part of the volume bar */}
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
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
