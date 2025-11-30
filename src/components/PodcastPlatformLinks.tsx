'use client'

import { PodcastEpisode } from '@/types/podcast'

interface PodcastPlatformLinksProps {
  episode: PodcastEpisode
  size?: number
}

export default function PodcastPlatformLinks({ episode, size = 22 }: PodcastPlatformLinksProps) {
  const platforms = [
    {
      name: 'Apple Podcasts',
      url: episode.apple_podcasts_url,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12 6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12zm0 1.846c5.595 0 10.154 4.559 10.154 10.154 0 5.595-4.559 10.154-10.154 10.154-5.595 0-10.154-4.559-10.154-10.154 0-5.595 4.559-10.154 10.154-10.154zm0 3.692c-3.562 0-6.462 2.9-6.462 6.462 0 3.563 2.9 6.462 6.462 6.462 3.563 0 6.462-2.9 6.462-6.462 0-3.562-2.9-6.462-6.462-6.462zm0 1.846c2.545 0 4.615 2.07 4.615 4.616 0 2.545-2.07 4.615-4.615 4.615-2.546 0-4.616-2.07-4.616-4.615 0-2.546 2.07-4.616 4.616-4.616zm0 2.77a1.846 1.846 0 100 3.692 1.846 1.846 0 000-3.693zm0 5.538c-.511 0-.923.413-.923.923v2.77a.923.923 0 101.846 0v-2.77c0-.51-.413-.923-.923-.923z"/>
        </svg>
      ),
      color: 'text-purple-600 hover:text-purple-700'
    },
    {
      name: 'Spotify',
      url: episode.spotify_url,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      ),
      color: 'text-green-600 hover:text-green-700'
    },
    {
      name: 'Yandex Music',
      url: episode.yandex_music_url,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
          {/* Official Yandex Music logo - Red circle with white "Я" */}
          <circle cx="12" cy="12" r="12" fill="#FF0000"/>
          <path d="M13.5 7.2c1.4 0 2.3.9 2.3 2.2 0 1.1-.6 1.8-1.5 2.2l1.8 4.2h-2.3l-1.5-3.7h-.8v3.7H9.2V7.2h4.3zm-2 3.5h1.7c.7 0 1.1-.4 1.1-1.1s-.4-1.1-1.1-1.1h-1.7v2.2z" fill="white"/>
        </svg>
      ),
      color: 'hover:opacity-80'
    },
    {
      name: 'Google Podcasts',
      url: episode.google_podcasts_url,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
          <path d="M1.5 10h2v4h-2v-4zm4.5-3h2v10h-2V7zm4.5-5h2v18h-2V2zm4.5 5h2v10h-2V7zm4.5 3h2v4h-2v-4z"/>
        </svg>
      ),
      color: 'text-blue-500 hover:text-blue-600'
    }
  ]

  // Filter only platforms that have URLs
  const availablePlatforms = platforms.filter(p => p.url)

  if (availablePlatforms.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="text-xs text-gray-500 font-medium">Слушать:</span>
      <div className="flex items-center gap-2">
        {availablePlatforms.map((platform) => (
          <button
            key={platform.name}
            type="button"
            className={`${platform.color} transition-all duration-200 transform hover:scale-110 cursor-pointer`}
            title={platform.name}
            onClick={(e) => {
              e.stopPropagation() // Prevent card click
              e.preventDefault() // Prevent default behavior
              // Open in new tab
              window.open(platform.url, '_blank', 'noopener,noreferrer')
            }}
          >
            {platform.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
