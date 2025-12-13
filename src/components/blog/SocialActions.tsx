// components/blog/SocialActions.tsx
// Социальные действия для блога (Нравится, В коллекцию, Поделиться)

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Heart, Bookmark, Share2, Check } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface SocialActionsProps {
  blogPostId: string;
  blogPostTitle?: string;
  blogPostUrl?: string;
  userId?: string;
  showCounts?: boolean;
}

interface ReactionCounts {
  likes: number;
  saves: number;
  shares: number;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function SocialActions({
  blogPostId,
  blogPostTitle,
  blogPostUrl,
  userId,
  showCounts = true,
}: SocialActionsProps) {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<ReactionCounts>({
    likes: 0,
    saves: 0,
    shares: 0,
  });
  const [userReactions, setUserReactions] = useState({
    hasLiked: false,
    hasSaved: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  /**
   * Загружает счетчики реакций
   */
  useEffect(() => {
    const loadReactions = async () => {
      // Загружаем счетчики
      const { data: allReactions } = await supabase
        .from('blog_post_reactions')
        .select('reaction_type')
        .eq('post_id', blogPostId);

      if (allReactions) {
        const newCounts: ReactionCounts = {
          likes: allReactions.filter((r) => r.reaction_type === 'like').length,
          saves: allReactions.filter((r) => r.reaction_type === 'save').length,
          shares: allReactions.filter((r) => r.reaction_type === 'share').length,
        };
        setCounts(newCounts);
      }

      // Если пользователь авторизован, загружаем его реакции
      if (userId) {
        const { data: myReactions } = await supabase
          .from('blog_post_reactions')
          .select('reaction_type')
          .eq('post_id', blogPostId)
          .eq('user_id', userId);

        if (myReactions) {
          setUserReactions({
            hasLiked: myReactions.some((r) => r.reaction_type === 'like'),
            hasSaved: myReactions.some((r) => r.reaction_type === 'save'),
          });
        }
      }
    };

    loadReactions();
  }, [blogPostId, userId, supabase]);

  /**
   * Переключает лайк
   */
  const toggleLike = useCallback(async () => {
    if (!userId) {
      alert('Войдите, чтобы поставить лайк');
      return;
    }

    setIsLoading(true);
    try {
      if (userReactions.hasLiked) {
        // Убираем лайк
        await supabase
          .from('blog_post_reactions')
          .delete()
          .eq('post_id', blogPostId)
          .eq('user_id', userId)
          .eq('reaction_type', 'like');

        setUserReactions((prev) => ({ ...prev, hasLiked: false }));
        setCounts((prev) => ({ ...prev, likes: Math.max(0, prev.likes - 1) }));
      } else {
        // Ставим лайк
        await supabase.from('blog_post_reactions').insert({
          post_id: blogPostId,
          user_id: userId,
          reaction_type: 'like',
        });

        setUserReactions((prev) => ({ ...prev, hasLiked: true }));
        setCounts((prev) => ({ ...prev, likes: prev.likes + 1 }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blogPostId, userId, userReactions.hasLiked, supabase]);

  /**
   * Переключает сохранение в коллекцию
   */
  const toggleSave = useCallback(async () => {
    if (!userId) {
      alert('Войдите, чтобы сохранить в коллекцию');
      return;
    }

    setIsLoading(true);
    try {
      if (userReactions.hasSaved) {
        // Убираем из коллекции
        await supabase
          .from('blog_post_reactions')
          .delete()
          .eq('post_id', blogPostId)
          .eq('user_id', userId)
          .eq('reaction_type', 'save');

        setUserReactions((prev) => ({ ...prev, hasSaved: false }));
        setCounts((prev) => ({ ...prev, saves: Math.max(0, prev.saves - 1) }));
      } else {
        // Сохраняем в коллекцию
        await supabase.from('blog_post_reactions').insert({
          post_id: blogPostId,
          user_id: userId,
          reaction_type: 'save',
        });

        setUserReactions((prev) => ({ ...prev, hasSaved: true }));
        setCounts((prev) => ({ ...prev, saves: prev.saves + 1 }));
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blogPostId, userId, userReactions.hasSaved, supabase]);

  /**
   * Обработчик поделиться
   */
  const handleShare = useCallback(
    async (platform?: 'twitter' | 'facebook' | 'copy') => {
      const url = blogPostUrl || window.location.href;
      const title = blogPostTitle || 'Интересная статья на Archi-Routes';

      if (platform === 'twitter') {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          '_blank'
        );
      } else if (platform === 'facebook') {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank'
        );
      } else if (platform === 'copy') {
        try {
          await navigator.clipboard.writeText(url);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      }

      // Записываем действие "поделиться"
      if (userId) {
        await supabase.from('blog_post_reactions').insert({
          post_id: blogPostId,
          user_id: userId,
          reaction_type: 'share',
        });

        setCounts((prev) => ({ ...prev, shares: prev.shares + 1 }));
      }

      setShowShareMenu(false);
    },
    [blogPostId, blogPostTitle, blogPostUrl, userId, supabase]
  );

  return (
    <div className="social-actions flex items-center gap-2 flex-wrap">
      {/* Кнопка "Нравится" */}
      <button
        type="button"
        onClick={toggleLike}
        disabled={isLoading}
        title={userReactions.hasLiked ? 'Убрать лайк' : 'Нравится'}
        className={`${
          showCounts
            ? `flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                userReactions.hasLiked
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
              }`
            : `h-10 w-10 flex items-center justify-center backdrop-blur-sm transition-all duration-200 shadow-sm rounded ${
                userReactions.hasLiked
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-white/95 hover:bg-white'
              }`
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Heart
          className={`h-5 w-5 transition-colors ${
            userReactions.hasLiked
              ? 'fill-white text-white'
              : ''
          }`}
        />
        {showCounts && (
          <>
            <span>{userReactions.hasLiked ? 'Нравится' : 'Нравится'}</span>
            {counts.likes > 0 && (
              <span
                className={`text-sm font-semibold ${
                  userReactions.hasLiked ? 'text-white' : 'text-gray-600'
                }`}
              >
                {counts.likes}
              </span>
            )}
          </>
        )}
      </button>

      {/* Кнопка "В коллекцию" */}
      <button
        type="button"
        onClick={toggleSave}
        disabled={isLoading}
        title={userReactions.hasSaved ? 'Убрать из коллекции' : 'В коллекцию'}
        className={`${
          showCounts
            ? `flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                userReactions.hasSaved
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
              }`
            : `h-10 w-10 flex items-center justify-center backdrop-blur-sm transition-all duration-200 shadow-sm rounded ${
                userReactions.hasSaved
                  ? 'bg-[hsl(var(--blog-primary))] hover:bg-[hsl(var(--blog-primary))]/90'
                  : 'bg-white/95 hover:bg-white'
              }`
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Bookmark
          className={`h-5 w-5 transition-colors ${
            userReactions.hasSaved
              ? 'fill-white text-white'
              : ''
          }`}
        />
        {showCounts && (
          <>
            <span>{userReactions.hasSaved ? 'Сохранено' : 'В коллекцию'}</span>
            {counts.saves > 0 && (
              <span
                className={`text-sm font-semibold ${
                  userReactions.hasSaved ? 'text-white' : 'text-gray-600'
                }`}
              >
                {counts.saves}
              </span>
            )}
          </>
        )}
      </button>

      {/* Кнопка "Поделиться" */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowShareMenu(!showShareMenu)}
          title="Поделиться"
          className={`${
            showCounts
              ? 'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
              : 'h-10 w-10 flex items-center justify-center bg-white/95 backdrop-blur-sm hover:bg-white shadow-sm rounded'
          } transition-all duration-200`}
        >
          {shareSuccess ? (
            <>
              <Check className="h-5 w-5 text-green-600" />
              {showCounts && <span className="text-green-600">Скопировано!</span>}
            </>
          ) : (
            <>
              <Share2 className="h-5 w-5" />
              {showCounts && (
                <>
                  <span>Поделиться</span>
                  {counts.shares > 0 && (
                    <span className="text-sm font-semibold text-gray-600">
                      {counts.shares}
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </button>

        {/* Выпадающее меню */}
        {showShareMenu && (
          <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 min-w-[200px]">
            <button
              type="button"
              onClick={() => handleShare('twitter')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center text-white">
                𝕏
              </div>
              <span className="text-sm font-medium text-gray-700">Twitter</span>
            </button>
            <button
              type="button"
              onClick={() => handleShare('facebook')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-lg">
                f
              </div>
              <span className="text-sm font-medium text-gray-700">Facebook</span>
            </button>
            <hr className="my-2" />
            <button
              type="button"
              onClick={() => handleShare('copy')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <Share2 className="h-5 w-5 text-gray-600 ml-1.5" />
              <span className="text-sm font-medium text-gray-700">
                Скопировать ссылку
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
