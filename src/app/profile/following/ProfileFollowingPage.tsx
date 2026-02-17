'use client'

import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  ArrowLeft,
  Loader2,
  User as UserIcon
} from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import { getStorageUrl } from '@/lib/storage'

// ============================================================
// ТИПЫ
// ============================================================

type TabType = 'following' | 'followers'

interface FollowProfile {
  id: string
  username: string | null
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string
  follower_count: number
}

interface FollowRecord {
  id: string
  created_at: string
  follower_id: string
  following_id: string
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ProfileFollowingPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<TabType>('following')
  const [following, setFollowing] = useState<FollowProfile[]>([])
  const [followers, setFollowers] = useState<FollowProfile[]>([])
  const [loading, setLoading] = useState(true)

  // ============================================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================================

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    try {
      await Promise.all([
        loadFollowing(),
        loadFollowers()
      ])
    } catch (error) {
      console.error('Error loading follow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFollowing = async () => {
    if (!user) return

    // Get IDs of users I follow
    const { data: followRecords, error: followError } = await supabase
      .from('user_follows')
      .select('following_id, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })

    if (followError || !followRecords?.length) {
      setFollowing([])
      return
    }

    const userIds = followRecords.map(r => r.following_id)

    // Load profiles and real follower counts
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, display_name, avatar_url, bio, role')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error loading following profiles:', profilesError)
      setFollowing([])
      return
    }

    // Count real followers for each profile
    const profilesWithCounts = await addFollowerCounts(profiles || [])

    // Maintain the order from follow records
    const profileMap = new Map(profilesWithCounts.map(p => [p.id, p]))
    const ordered = userIds
      .map(id => profileMap.get(id))
      .filter((p): p is FollowProfile => !!p)

    setFollowing(ordered)
  }

  const loadFollowers = async () => {
    if (!user) return

    // Get IDs of users who follow me
    const { data: followRecords, error: followError } = await supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })

    if (followError || !followRecords?.length) {
      setFollowers([])
      return
    }

    const userIds = followRecords.map(r => r.follower_id)

    // Load profiles and real follower counts
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, display_name, avatar_url, bio, role')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error loading follower profiles:', profilesError)
      setFollowers([])
      return
    }

    // Count real followers for each profile
    const profilesWithCounts = await addFollowerCounts(profiles || [])

    // Maintain the order from follow records
    const profileMap = new Map(profilesWithCounts.map(p => [p.id, p]))
    const ordered = userIds
      .map(id => profileMap.get(id))
      .filter((p): p is FollowProfile => !!p)

    setFollowers(ordered)
  }

  const addFollowerCounts = async (profiles: Omit<FollowProfile, 'follower_count'>[]): Promise<FollowProfile[]> => {
    if (!profiles.length) return []

    const ids = profiles.map(p => p.id)
    const { data: counts } = await supabase
      .from('user_follows')
      .select('following_id')
      .in('following_id', ids)

    const countMap = new Map<string, number>()
    counts?.forEach(row => {
      countMap.set(row.following_id, (countMap.get(row.following_id) || 0) + 1)
    })

    return profiles.map(p => ({
      ...p,
      follower_count: countMap.get(p.id) || 0
    }))
  }

  const handleFollowChange = () => {
    // Reload data when follow status changes
    loadData()
  }

  // ============================================================
  // РЕНДЕР
  // ============================================================

  const currentList = activeTab === 'following' ? following : followers

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header buildings={[]} />
        <main className="flex-1 flex items-center justify-center">
          <div className="bg-card border border-border rounded-[var(--radius)] p-12 max-w-md mx-auto text-center">
            <UserIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold mb-2">Sign In</h1>
            <p className="text-muted-foreground mb-6">
              You must sign in to view your subscriptions
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </main>
        <EnhancedFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header buildings={[]} />

      <main className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pt-5 sm:pt-10">
          {/* Навигация назад */}
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Profile</span>
          </Link>

          {/* Заголовок */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">Subscriptions</h1>
          </div>

          {/* Табы */}
          <div className="flex gap-1 p-1 bg-muted rounded-[var(--radius)] mb-6 w-fit">
            <button
              onClick={() => setActiveTab('following')}
              className={`px-4 py-2 text-sm font-medium rounded-[calc(var(--radius)-2px)] transition-colors ${
                activeTab === 'following'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Following ({following.length})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`px-4 py-2 text-sm font-medium rounded-[calc(var(--radius)-2px)] transition-colors ${
                activeTab === 'followers'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Followers ({followers.length})
            </button>
          </div>

          {/* Контент */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentList.length === 0 ? (
            <div className="bg-card border border-border rounded-[var(--radius)] p-8 sm:p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {activeTab === 'following' ? 'Not following anyone yet' : 'No followers yet'}
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {activeTab === 'following'
                  ? 'Discover interesting users on the platform and follow them to stay updated with their content.'
                  : 'Share your architectural discoveries and reviews to attract followers.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {currentList.map((person) => {
                const displayName = person.display_name || person.full_name || person.username || 'User'
                const avatarUrl = person.avatar_url ? getStorageUrl(person.avatar_url) : null
                const profileLink = person.username ? `/user/${person.username}` : '#'

                return (
                  <div
                    key={person.id}
                    className="bg-card border border-border rounded-[var(--radius)] p-4 flex items-start gap-3 hover:border-primary/30 transition-colors"
                  >
                    {/* Аватар */}
                    <Link href={profileLink} className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-medium text-lg">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <Link href={profileLink} className="hover:underline">
                        <h3 className="font-semibold text-sm truncate">{displayName}</h3>
                      </Link>
                      {person.username && (
                        <p className="text-xs text-muted-foreground truncate">@{person.username}</p>
                      )}
                      {person.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{person.bio}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{person.follower_count} followers</span>
                        <span className="capitalize">{person.role}</span>
                      </div>
                    </div>

                    {/* Ссылка на профиль */}
                    <Link
                      href={profileLink}
                      className="flex-shrink-0 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      View
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <EnhancedFooter />
    </div>
  )
}
