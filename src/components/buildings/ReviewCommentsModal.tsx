'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, MessageSquare, Send, Reply, Trash2, Loader2, Smile, Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { BuildingReviewComment } from '@/types/building'
import { getStorageUrl } from '@/lib/storage'
import toast from 'react-hot-toast'

interface ReviewCommentsModalProps {
  isOpen: boolean
  onClose: () => void
  reviewId: string
  reviewTitle: string
  reviewAuthor: string
}

const EMOJIS = [
  '😀','😂','😍','😎','🤔','😊','😅','🥰','😮','😢','😡','🤩','😇','🤯','😴',
  '👍','👎','👏','🙌','💪','🤝','❤️','🔥','✨','🌟','💯','🎉','🏆','👀','🎨',
  '📷','🏛️','🏗️','🏢','🏠','📍','🗺️','🌍','🌿','☀️','🚶','✈️','🔑','📐','💬',
]

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function AvatarPlaceholder({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={getStorageUrl(avatarUrl, 'avatars')}
        alt={name}
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <span className="text-white font-semibold text-xs">
      {name?.[0]?.toUpperCase() || '?'}
    </span>
  )
}

interface CommentItemProps {
  comment: BuildingReviewComment
  currentUserId?: string
  likedIds: Set<string>
  onReply: (comment: BuildingReviewComment) => void
  onDelete: (commentId: string) => void
  onLike: (commentId: string, liked: boolean) => void
  isReply?: boolean
}

function CommentItem({ comment, currentUserId, likedIds, onReply, onDelete, onLike, isReply = false }: CommentItemProps) {
  const authorName =
    comment.profiles?.display_name ||
    comment.profiles?.full_name ||
    comment.profiles?.username ||
    'User'
  const liked = likedIds.has(comment.id)

  return (
    <div className={isReply ? 'pl-10' : ''}>
      <div className="flex gap-2.5">
        {/* Avatar */}
        <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <AvatarPlaceholder name={authorName} avatarUrl={comment.profiles?.avatar_url} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{authorName}</span>
            <span className="text-xs text-gray-400">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 mt-0.5 break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {/* Like */}
            <button
              onClick={() => onLike(comment.id, liked)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-red-500' : ''}`} />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
            </button>

            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
            {currentUserId === comment.user_id && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              likedIds={likedIds}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReviewCommentsModal({
  isOpen,
  onClose,
  reviewId,
  reviewTitle,
  reviewAuthor,
}: ReviewCommentsModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<BuildingReviewComment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [inputText, setInputText] = useState('')
  const [replyingTo, setReplyingTo] = useState<BuildingReviewComment | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const listEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    loadComments()
  }, [isOpen, reviewId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const loadComments = async () => {
    setLoading(true)
    try {
      const { data: commentsData, error } = await supabase
        .from('building_review_comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading comments:', error.message, error.code, error.details)
        throw error
      }

      const flat: BuildingReviewComment[] = commentsData || []

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(flat.map(c => c.user_id))]
      let profilesMap = new Map<string, BuildingReviewComment['profiles']>()

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, full_name, display_name, avatar_url')
          .in('id', userIds)

        if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p))
        }
      }

      // Fetch user's likes for these comments
      const commentIds = flat.map(c => c.id)
      if (user && commentIds.length > 0) {
        const { data: likesData } = await supabase
          .from('building_review_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds)
        if (likesData) {
          setLikedIds(new Set(likesData.map(l => l.comment_id)))
        }
      }

      // Attach profiles and build tree
      const withProfiles = flat.map(c => ({ ...c, profiles: profilesMap.get(c.user_id) }))
      const topLevel = withProfiles
        .filter(c => !c.parent_id)
        .map(c => ({
          ...c,
          replies: withProfiles.filter(r => r.parent_id === c.id),
        }))
      setComments(topLevel)
    } catch (err: any) {
      console.error('Error loading comments:', err?.message || err)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Sign in to comment')
      return
    }
    const text = inputText.trim()
    if (!text) return
    if (text.length > 1000) {
      toast.error('Comment is too long (max 1000 characters)')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        review_id: reviewId,
        user_id: user.id,
        content: text,
      }
      if (replyingTo) {
        // Reply to parent (always 1 level deep: use parent's own id if it already is a reply)
        payload.parent_id = replyingTo.parent_id ?? replyingTo.id
      }

      const { error } = await supabase
        .from('building_review_comments')
        .insert(payload)

      if (error) throw error

      setInputText('')
      setReplyingTo(null)
      await loadComments()

      // Scroll to bottom
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) {
      console.error('Error posting comment:', err)
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('building_review_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      await loadComments()
      toast.success('Comment deleted')
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      toast.error('Failed to delete comment')
    }
  }

  const handleLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) {
      toast.error('Sign in to like comments')
      return
    }

    // Optimistic update
    const delta = currentlyLiked ? -1 : 1
    setLikedIds(prev => {
      const next = new Set(prev)
      currentlyLiked ? next.delete(commentId) : next.add(commentId)
      return next
    })
    const updateCount = (list: BuildingReviewComment[]): BuildingReviewComment[] =>
      list.map(c => {
        if (c.id === commentId) return { ...c, like_count: Math.max(0, c.like_count + delta) }
        if (c.replies) return { ...c, replies: updateCount(c.replies) }
        return c
      })
    setComments(prev => updateCount(prev))

    try {
      if (currentlyLiked) {
        await supabase
          .from('building_review_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('building_review_comment_likes')
          .insert({ comment_id: commentId, user_id: user.id })
      }
    } catch (err: any) {
      // Revert optimistic update on error
      setLikedIds(prev => {
        const next = new Set(prev)
        currentlyLiked ? next.add(commentId) : next.delete(commentId)
        return next
      })
      setComments(prev => updateCount(prev))
      toast.error('Failed to update like')
    }
  }

  const handleReply = (comment: BuildingReviewComment) => {
    setReplyingTo(comment)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setInputText(prev => prev + emoji)
      setShowEmojiPicker(false)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newText = inputText.slice(0, start) + emoji + inputText.slice(end)
    setInputText(newText)
    setShowEmojiPicker(false)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }, [inputText])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                Comments{totalCount > 0 ? ` (${totalCount})` : ''}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {reviewTitle} · {reviewAuthor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                likedIds={likedIds}
                onReply={handleReply}
                onDelete={handleDelete}
                onLike={handleLike}
              />
            ))
          )}
          <div ref={listEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-100 px-4 py-3 shrink-0">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-blue-50 rounded-lg">
              <Reply className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-700 flex-1 truncate">
                Replying to{' '}
                <strong>
                  {replyingTo.profiles?.display_name ||
                    replyingTo.profiles?.full_name ||
                    replyingTo.profiles?.username ||
                    'User'}
                </strong>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {user ? (
            <div className="relative">
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-10"
                >
                  <div className="grid grid-cols-9 gap-0.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-lg leading-none p-1 rounded hover:bg-gray-100 transition-colors text-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 items-center">
                {/* User avatar */}
                <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <AvatarPlaceholder
                    name={profile?.display_name || profile?.full_name || 'U'}
                    avatarUrl={profile?.avatar_url || undefined}
                  />
                </div>

                <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a comment…"
                    rows={1}
                    maxLength={1000}
                    className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none leading-5 max-h-24 overflow-y-auto"
                    style={{ minHeight: '20px' }}
                    onInput={e => {
                      const el = e.currentTarget
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }}
                  />
                  {inputText.length > 800 && (
                    <span className="shrink-0 text-xs text-gray-400">{inputText.length}/1000</span>
                  )}
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className={`shrink-0 p-1 rounded transition-colors ${showEmojiPicker ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Insert emoji"
                    type="button"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !inputText.trim()}
                    className="shrink-0 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-center text-gray-400 py-1">
              Sign in to leave a comment
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
