'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface FollowButtonProps {
    targetUserId: string
    onFollowChange?: (delta: number) => void
    size?: 'sm' | 'md' | 'lg'
}

export default function FollowButton({
    targetUserId,
    onFollowChange,
    size = 'md'
}: FollowButtonProps) {
    const supabase = useMemo(() => createClient(), [])
    const { user } = useAuth()

    const [isFollowing, setIsFollowing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        if (user) {
            checkFollowStatus()
        } else {
            setLoading(false)
        }
    }, [user, targetUserId])

    const checkFollowStatus = async () => {
        if (!user) return

        try {
            const { data, error } = await supabase
                .from('user_follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', targetUserId)
                .single()

            setIsFollowing(!!data && !error)
        } catch {
            setIsFollowing(false)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleFollow = async () => {
        if (!user) {
            toast.error('Please sign in to follow users')
            return
        }

        if (user.id === targetUserId) {
            toast.error("You can't follow yourself")
            return
        }

        setActionLoading(true)

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('user_follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', targetUserId)

                if (error) throw error

                // Update follower counts
                await updateFollowerCounts(-1)

                setIsFollowing(false)
                onFollowChange?.(-1)
                toast.success('Unfollowed')
            } else {
                // Follow
                const { error } = await supabase
                    .from('user_follows')
                    .insert({
                        follower_id: user.id,
                        following_id: targetUserId
                    })

                if (error) throw error

                // Update follower counts
                await updateFollowerCounts(1)

                setIsFollowing(true)
                onFollowChange?.(1)
                toast.success('Following!')
            }
        } catch (error: any) {
            console.error('Follow toggle error:', error)
            toast.error(error.message || 'Error updating follow status')
        } finally {
            setActionLoading(false)
        }
    }

    const updateFollowerCounts = async (delta: number) => {
        if (!user) return

        try {
            // Update target user's followers count
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('total_followers')
                .eq('id', targetUserId)
                .single()

            if (targetProfile) {
                await supabase
                    .from('profiles')
                    .update({ total_followers: Math.max(0, (targetProfile.total_followers || 0) + delta) })
                    .eq('id', targetUserId)
            }

            // Update current user's following count
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('total_following')
                .eq('id', user.id)
                .single()

            if (currentProfile) {
                await supabase
                    .from('profiles')
                    .update({ total_following: Math.max(0, (currentProfile.total_following || 0) + delta) })
                    .eq('id', user.id)
            }
        } catch (error) {
            console.error('Error updating follower counts:', error)
        }
    }

    if (loading) {
        return (
            <button
                disabled
                className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors bg-muted text-muted-foreground ${size === 'sm' ? 'px-3 py-1.5 text-sm' :
                    size === 'lg' ? 'px-6 py-3 text-base' :
                        'px-4 py-2 text-sm'
                    }`}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
            </button>
        )
    }

    return (
        <button
            onClick={handleToggleFollow}
            disabled={actionLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors ${isFollowing
                ? 'bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                } ${size === 'sm' ? 'px-3 py-1.5 text-sm' :
                    size === 'lg' ? 'px-6 py-3 text-base' :
                        'px-4 py-2 text-sm'
                }`}
        >
            {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
                <>
                    <UserCheck className="w-4 h-4" />
                    Unfollow
                </>
            ) : (
                <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                </>
            )}
        </button>
    )
}
