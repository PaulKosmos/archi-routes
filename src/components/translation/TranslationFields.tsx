'use client'

import { useState } from 'react'
import { localeFlags } from '@/i18n/config'
import { Globe, Languages, ChevronDown, ChevronUp } from 'lucide-react'

interface TranslationFieldsProps {
  // Оригинальный язык контента
  originalLanguage: 'en' | 'de' | 'ru'
  onOriginalLanguageChange: (lang: 'en' | 'de' | 'ru') => void

  // Поля для перевода
  fields: {
    [key: string]: {
      original: string
      english: string
      label: string
      type: 'text' | 'textarea' | 'richtext'
      placeholder?: string
    }
  }

  // Обработчик изменения переводов
  onTranslationChange: (fieldName: string, value: string) => void

  // Показывать ли секцию развернутой по умолчанию
  defaultExpanded?: boolean
}

export default function TranslationFields({
  originalLanguage,
  onOriginalLanguageChange,
  fields,
  onTranslationChange,
  defaultExpanded = false
}: TranslationFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Если оригинал уже на английском, переводы не нужны
  const needsTranslation = originalLanguage !== 'en'

  // Подсчет заполненных переводов
  const filledTranslations = Object.values(fields).filter(f => f.english?.trim()).length
  const totalFields = Object.keys(fields).length
  const translationProgress = totalFields > 0 ? (filledTranslations / totalFields) * 100 : 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">

      {/* Заголовок секции */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Локализация и переводы</h3>
            <p className="text-sm text-gray-600">
              {needsTranslation ? (
                <>
                  Оригинал: {localeFlags[originalLanguage]} {originalLanguage.toUpperCase()} •
                  Переведено: {filledTranslations}/{totalFields}
                </>
              ) : (
                'Original in English - no translation needed'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {needsTranslation && (
            <div className="flex items-center gap-2 mr-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${translationProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {Math.round(translationProgress)}%
              </span>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Содержимое секции */}
      {isExpanded && (
        <div className="p-6 space-y-6">

          {/* Выбор оригинального языка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Languages className="w-4 h-4 inline mr-2" />
              Язык оригинала
            </label>
            <div className="flex gap-2">
              {(['en', 'de', 'ru'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onOriginalLanguageChange(lang)}
                  className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-all ${originalLanguage === lang
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                >
                  <span className="text-xl">{localeFlags[lang]}</span>
                  <span>{lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : 'Russian'}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Выберите язык, на котором создан оригинальный контент
            </p>
          </div>

          {/* Поля переводов - показываем только если оригинал не на английском */}
          {needsTranslation && (
            <div className="border-t border-gray-200 pt-6 space-y-6">
              <div className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>
                  Добавьте английский перевод для международной аудитории
                </span>
              </div>

              {/* Рендерим поля для перевода */}
              {Object.entries(fields).map(([fieldName, config]) => (
                <div key={fieldName}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {config.label} (English)
                  </label>

                  {/* Показываем оригинал для контекста */}
                  {config.original && (
                    <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">
                        Оригинал ({originalLanguage.toUpperCase()}):
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {config.original}
                      </p>
                    </div>
                  )}

                  {/* Поле для английского перевода */}
                  {config.type === 'text' ? (
                    <input
                      type="text"
                      value={config.english}
                      onChange={(e) => onTranslationChange(fieldName, e.target.value)}
                      placeholder={config.placeholder || `English translation of ${config.label.toLowerCase()}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : config.type === 'textarea' ? (
                    <textarea
                      value={config.english}
                      onChange={(e) => onTranslationChange(fieldName, e.target.value)}
                      placeholder={config.placeholder || `English translation of ${config.label.toLowerCase()}`}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    />
                  ) : (
                    // richtext - можно позже добавить редактор
                    <textarea
                      value={config.english}
                      onChange={(e) => onTranslationChange(fieldName, e.target.value)}
                      placeholder={config.placeholder || `English translation of ${config.label.toLowerCase()}`}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
                    />
                  )}

                  {/* Индикатор заполненности */}
                  {config.english?.trim() && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Перевод добавлен ({config.english.length} символов)
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Информация когда оригинал на английском */}
          {!needsTranslation && (
            <div className="text-center py-8 text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Контент создан на английском языке</p>
              <p className="text-sm">Дополнительные переводы не требуются</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
