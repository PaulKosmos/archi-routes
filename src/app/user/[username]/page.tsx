'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import EnhancedFooter from '@/components/EnhancedFooter'
import FollowButton from '@/components/FollowButton'
import Link from 'next/link'
import {
    User, Building2, FileText, MessageSquare, MapPin, Calendar,
    Users, Eye, Loader2, ArrowLeft
} from 'lucide-react'
import { getStorageUrl } from '@/lib/storage'

interface UserProfile {
    id: string
    username: string
    full_name: string | null
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    location: string | null
    website: string | null
    created_at: string
    total_followers: number
    total_following: number
    role: string
}

interface UserStats {
    buildings_count: number
    reviews_count: number
    articles_count: number
}

interface Building {
    id: string
    name: string
    city: string
    image_url: string | null
    architect: string | null
}

interface Review {
    id: string
    content: string
    rating: number
    created_at: string
    building: {
        id: string
        name: string
    }
}

interface Article {
    id: string
    title: string
    slug: string
    excerpt: string | null
    created_at: string
}

export default function PublicProfilePage() {
    const params = useParams()
    const username = params?.username as string
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [stats, setStats] = useState<UserStats>({ buildings_count: 0, reviews_count: 0, articles_count: 0 })
    const [buildings, setBuildings] = useState<Building[]>([])
    const [reviews, setReviews] = useState<Review[]>([])
    const [articles, setArticles] = useState<Article[]>([])
    const [activeTab, setActiveTab] = useState<'buildings' | 'reviews' | 'articles'>('buildings')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (username) {
            loadProfile()
        }
    }, [username])

    useEffect(() => {
        if (profile) {
            loadTabData()
        }
    }, [profile, activeTab])

    const loadProfile = async () => {
        setLoading(true)
        setError(null)

        try {
            // Load profile by username
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .single()

            if (profileError || !profileData) {
                setError('User not found')
                setLoading(false)
                return
            }

            setProfile(profileData)

            // Load stats
            const [buildingsRes, reviewsRes, articlesRes] = await Promise.all([
                supabase
                    .from('buildings')
                    .select('id', { count: 'exact', head: true })
                    .eq('created_by', profileData.id)
                    .eq('moderation_status', 'approved'),
                supabase
                    .from('building_reviews')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', profileData.id)
                    .eq('moderation_status', 'approved'),
                supabase
                    .from('blog_posts')
                    .select('id', { count: 'exact', head: true })
                    .eq('author_id', profileData.id)
                    .eq('status', 'published')
            ])

            setStats({
                buildings_count: buildingsRes.count || 0,
                reviews_count: reviewsRes.count || 0,
                articles_count: articlesRes.count || 0
            })

        } catch (err) {
            console.error('Error loading profile:', err)
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const loadTabData = async () => {
        if (!profile) return

        try {
            if (activeTab === 'buildings') {
                const { data } = await supabase
                    .from('buildings')
                    .select('id, name, city, image_url, architect')
                    .eq('created_by', profile.id)
                    .eq('moderation_status', 'approved')
                    .order('created_at', { ascending: false })
                    .limit(12)

                setBuildings(data || [])
            } else if (activeTab === 'reviews') {
                const { data } = await supabase
                    .from('building_reviews')
                    .select(`
            id, content, rating, created_at,
            buildings:building_id (id, name)
          `)
                    .eq('user_id', profile.id)
                    .eq('moderation_status', 'approved')
                    .order('created_at', { ascending: false })
                    .limit(12)

                setReviews(data?.map(r => ({
                    ...r,
                    building: r.buildings as any
                })) || [])
            } else if (activeTab === 'articles') {
                const { data } = await supabase
                    .from('blog_posts')
                    .select('id, title, slug, excerpt, created_at')
                    .eq('author_id', profile.id)
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(12)

                setArticles(data || [])
            }
        } catch (err) {
            console.error('Error loading tab data:', err)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        })
    }

    const isOwnProfile = user?.id === profile?.id

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header buildings={[]} />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
                <EnhancedFooter />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header buildings={[]} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
                        <p className="text-muted-foreground mb-6">
                            The user @{username} doesn't exist or has been removed.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </div>
                </main>
                <EnhancedFooter />
            </div>
        )
    }

    const displayName = profile.display_name || profile.full_name || profile.username

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header buildings={[]} />

            <main className="flex-1">
                <div className="container mx-auto px-4 py-8">
                    {/* Profile Header */}
                    <div className="bg-card border border-border rounded-[var(--radius)] p-6 md:p-8 mb-8">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* Avatar */}
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-primary flex-shrink-0 flex items-center justify-center">
                                {profile.avatar_url ? (
                                    <img
                                        src={getStorageUrl(profile.avatar_url, 'avatars')}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-primary-foreground font-bold text-4xl md:text-5xl">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-heading font-bold">
                                            {displayName}
                                        </h1>
                                        <p className="text-muted-foreground">@{profile.username}</p>
                                    </div>

                                    {/* Follow Button or Edit Profile */}
                                    {isOwnProfile ? (
                                        <Link
                                            href="/profile/edit"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-[var(--radius)] hover:bg-secondary/80 transition-colors"
                                        >
                                            Edit Profile
                                        </Link>
                                    ) : user ? (
                                        <FollowButton
                                            targetUserId={profile.id}
                                            onFollowChange={(delta: number) => {
                                                setProfile(prev => prev ? {
                                                    ...prev,
                                                    total_followers: Math.max(0, (prev.total_followers || 0) + delta)
                                                } : null)
                                            }}
                                        />
                                    ) : (
                                        <Link
                                            href="/auth/login"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
                                        >
                                            Sign in to Follow
                                        </Link>
                                    )}
                                </div>

                                {/* Bio */}
                                {profile.bio && (
                                    <p className="text-foreground mb-4 max-w-2xl">{profile.bio}</p>
                                )}

                                {/* Meta info */}
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                    {profile.location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {profile.location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Joined {formatDate(profile.created_at)}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-semibold">{profile.total_followers || 0}</span>
                                        <span className="text-muted-foreground">Followers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">{profile.total_following || 0}</span>
                                        <span className="text-muted-foreground">Following</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-semibold">{stats.buildings_count}</span>
                                        <span className="text-muted-foreground">Buildings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
                        <div className="flex border-b border-border">
                            <button
                                onClick={() => setActiveTab('buildings')}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'buildings'
                                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <Building2 className="w-4 h-4 inline mr-2" />
                                Buildings ({stats.buildings_count})
                            </button>
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'reviews'
                                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <MessageSquare className="w-4 h-4 inline mr-2" />
                                Reviews ({stats.reviews_count})
                            </button>
                            <button
                                onClick={() => setActiveTab('articles')}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'articles'
                                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <FileText className="w-4 h-4 inline mr-2" />
                                Articles ({stats.articles_count})
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* Buildings Tab */}
                            {activeTab === 'buildings' && (
                                buildings.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {buildings.map(building => (
                                            <Link
                                                key={building.id}
                                                href={`/buildings/${building.id}`}
                                                className="group bg-background border border-border rounded-[var(--radius)] overflow-hidden hover:border-primary transition-colors"
                                            >
                                                <div className="aspect-video bg-muted">
                                                    {building.image_url ? (
                                                        <img
                                                            src={getStorageUrl(building.image_url, 'photos')}
                                                            alt={building.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Building2 className="w-8 h-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                                        {building.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {building.city}
                                                        {building.architect && ` • ${building.architect}`}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No buildings added yet</p>
                                    </div>
                                )
                            )}

                            {/* Reviews Tab */}
                            {activeTab === 'reviews' && (
                                reviews.length > 0 ? (
                                    <div className="space-y-4">
                                        {reviews.map(review => (
                                            <Link
                                                key={review.id}
                                                href={`/buildings/${review.building?.id}`}
                                                className="block bg-background border border-border rounded-[var(--radius)] p-4 hover:border-primary transition-colors"
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                                                    <span className="text-muted-foreground text-sm">
                                                        {formatDate(review.created_at)}
                                                    </span>
                                                </div>
                                                <h3 className="font-medium mb-1">{review.building?.name}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {review.content}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No reviews written yet</p>
                                    </div>
                                )
                            )}

                            {/* Articles Tab */}
                            {activeTab === 'articles' && (
                                articles.length > 0 ? (
                                    <div className="space-y-4">
                                        {articles.map(article => (
                                            <Link
                                                key={article.id}
                                                href={`/blog/${article.slug}`}
                                                className="block bg-background border border-border rounded-[var(--radius)] p-4 hover:border-primary transition-colors"
                                            >
                                                <h3 className="font-medium mb-1">{article.title}</h3>
                                                {article.excerpt && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                        {article.excerpt}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(article.created_at)}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No articles published yet</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <EnhancedFooter />
        </div>
    )
}
