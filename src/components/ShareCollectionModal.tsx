'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, Share2, Globe, Link as LinkIcon, ExternalLink } from 'lucide-react'

interface ShareCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collectionId: string
  collectionName: string
  shareToken: string | null
  isPublic: boolean
  onMakePublic?: () => void
}

export default function ShareCollectionModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  shareToken,
  isPublic,
  onMakePublic
}: ShareCollectionModalProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/collections/${collectionId}/${shareToken}`
    : ''

  const handleCopy = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handleOpenInNewTab = () => {
    if (!shareUrl) return
    window.open(shareUrl, '_blank')
  }

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Поделиться коллекцией</h2>
              <p className="text-sm text-muted-foreground">{collectionName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-[var(--radius)] transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Статус публичности */}
          {!isPublic ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius)] p-4">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">Коллекция приватная</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Сделайте коллекцию публичной, чтобы делиться ею с другими
                  </p>
                  {onMakePublic && (
                    <button
                      onClick={() => {
                        onMakePublic()
                        onClose()
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      <Globe className="w-4 h-4" />
                      Сделать публичной
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Успешное состояние */}
              <div className="bg-primary/10 border border-primary/20 rounded-[var(--radius)] p-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">Публичная коллекция</p>
                    <p className="text-sm text-muted-foreground">
                      Любой, у кого есть эта ссылка, может просматривать коллекцию
                    </p>
                  </div>
                </div>
              </div>

              {/* Ссылка для копирования */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ссылка для доступа
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-[var(--radius)]">
                    <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-foreground outline-none select-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] transition-all font-medium ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Копировать
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть в новой вкладке
                </button>
              </div>

              {/* Информация */}
              <div className="bg-muted/50 rounded-[var(--radius)] p-4">
                <p className="text-sm text-muted-foreground">
                  💡 <span className="font-medium">Совет:</span> Пользователи смогут скопировать вашу коллекцию себе в профиль, но не смогут редактировать оригинал.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border rounded-[var(--radius)] hover:bg-muted transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
