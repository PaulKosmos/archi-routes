// Podcast System Types

export interface PodcastSeries {
  id: string
  title: string
  slug: string
  description?: string
  cover_image_url?: string
  created_at: string
  updated_at: string
  episode_count?: number
}

export interface PodcastTag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface PodcastEpisode {
  id: string
  title: string
  episode_number?: number
  series_id?: string
  series?: PodcastSeries
  description?: string
  audio_url: string
  duration_seconds?: number
  duration_formatted?: string
  cover_image_url?: string
  published_at?: string
  created_at: string
  updated_at: string
  author_id?: string
  author?: {
    id: string
    full_name: string
    avatar_url?: string
    display_name?: string
  }
  status: 'draft' | 'published' | 'archived'
  view_count?: number
  play_count?: number
  tags?: PodcastTag[]
  // External platform links
  apple_podcasts_url?: string
  spotify_url?: string
  yandex_music_url?: string
  google_podcasts_url?: string
}

export interface PodcastUploadPayload {
  title: string
  description?: string
  series_id?: string
  episode_number?: number
  audio_file: File
  cover_image?: File
  tags?: string[]
  status?: 'draft' | 'published'
  published_at?: string
  // External platform links
  apple_podcasts_url?: string
  spotify_url?: string
  yandex_music_url?: string
  google_podcasts_url?: string
}

export interface PodcastFilters {
  series_id?: string
  tag_ids?: string[]
  search?: string
  status?: 'draft' | 'published' | 'archived'
  sort_by?: 'published_at' | 'created_at' | 'episode_number'
  sort_order?: 'asc' | 'desc'
}

export interface PodcastListResponse {
  episodes: PodcastEpisode[]
  total: number
  page: number
  per_page: number
}
