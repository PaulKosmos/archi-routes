// components/news/ShareButton.tsx
// Кнопка "Поделиться" с Web Share API и fallback для копирования ссылки

'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Facebook, Twitter, Send } from 'lucide-react';
import { NewsArticle } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface ShareButtonProps {
  article: NewsArticle;
  onShare?: () => void; // Callback для записи взаимодействия
  variant?: 'default' | 'compact' | 'text';
  className?: string;
}

interface ShareData {
  title: string;
  text: string;
  url: string;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function ShareButton({
  article,
  onShare,
  variant = 'default',
  className = ''
}: ShareButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Формируем данные для шаринга
  const shareData: ShareData = {
    title: article.title,
    text: article.summary || article.title,
    url: typeof window !== 'undefined' ? window.location.href : '',
  };

  // Проверяем поддержку Web Share API
  const canUseWebShare = typeof navigator !== 'undefined' &&
    'share' in navigator &&
    'canShare' in navigator &&
    navigator.canShare(shareData);

  // Обработчик Web Share API
  const handleWebShare = async () => {
    if (!canUseWebShare) return;

    try {
      await navigator.share(shareData);
      onShare?.();
      console.log('✅ Article shared successfully');
    } catch (error) {
      // Пользователь отменил шаринг или произошла ошибка
      if ((error as Error).name !== 'AbortError') {
        console.error('❌ Error sharing article:', error);
        // Fallback на dropdown
        setShowDropdown(true);
      }
    }
  };

  // Копирование ссылки
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      onShare?.();

      setTimeout(() => {
        setCopied(false);
        setShowDropdown(false);
      }, 2000);
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
    }
  };

  // Шаринг в социальные сети
  const shareToSocial = (platform: 'facebook' | 'twitter' | 'telegram') => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    onShare?.();
    setShowDropdown(false);
  };

  // Основной обработчик клика
  const handleClick = () => {
    if (canUseWebShare) {
      handleWebShare();
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  // Варианты отображения
  const buttonClasses = {
    default: 'flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors',
    compact: 'p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors',
    text: 'text-blue-600 hover:text-blue-700 underline flex items-center gap-1'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Основная кнопка */}
      <button
        onClick={handleClick}
        className={buttonClasses[variant]}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
        {variant !== 'compact' && <span>Share</span>}
      </button>

      {/* Dropdown с опциями (если нет Web Share API) */}
      {showDropdown && !canUseWebShare && (
        <>
          {/* Overlay для закрытия */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden">

            {/* Копировать ссылку */}
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Copy link</span>
                </>
              )}
            </button>

            <div className="border-t border-gray-100" />

            {/* Facebook */}
            <button
              onClick={() => shareToSocial('facebook')}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left group"
            >
              <Facebook className="w-5 h-5 text-[#1877F2]" />
              <span className="text-sm text-gray-700 group-hover:text-blue-700">Facebook</span>
            </button>

            {/* Twitter */}
            <button
              onClick={() => shareToSocial('twitter')}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left group"
            >
              <Twitter className="w-5 h-5 text-[#1DA1F2]" />
              <span className="text-sm text-gray-700 group-hover:text-blue-700">Twitter</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => shareToSocial('telegram')}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left group"
            >
              <Send className="w-5 h-5 text-[#0088cc]" />
              <span className="text-sm text-gray-700 group-hover:text-blue-700">Telegram</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
