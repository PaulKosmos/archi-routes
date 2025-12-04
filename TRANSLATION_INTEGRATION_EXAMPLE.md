# Пример интеграции TranslationFields в форму редактирования новости

## 1. Обновление типа формы

Добавьте поля локализации в `UpdateNewsArticle` type:

```typescript
// В src/types/news.ts или в файле компонента
interface UpdateNewsArticle {
  // ... существующие поля
  title: string
  content: string
  summary?: string

  // ✅ Добавить поля локализации
  original_language?: 'en' | 'de' | 'ru'
  title_en?: string
  content_en?: string
}
```

## 2. Обновление состояния формы

В компоненте редактирования (например, `/admin/news/[id]/edit/page.tsx`):

```typescript
const [formData, setFormData] = useState<UpdateNewsArticle>({
  id: newsId,
  title: '',
  content: '',
  summary: '',
  // ... другие поля

  // ✅ Добавить поля локализации
  original_language: 'ru', // по умолчанию русский
  title_en: '',
  content_en: ''
})
```

## 3. Добавление компонента TranslationFields в форму

Вставьте компонент в форму редактирования:

```tsx
import TranslationFields from '@/components/translation/TranslationFields'

// ... внутри return формы, после основных полей:

<form onSubmit={handleSubmit}>

  {/* Основные поля */}
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Заголовок
    </label>
    <input
      type="text"
      value={formData.title}
      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      className="w-full px-3 py-2 border rounded-lg"
    />
  </div>

  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Содержание
    </label>
    <textarea
      value={formData.content}
      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
      rows={10}
      className="w-full px-3 py-2 border rounded-lg"
    />
  </div>

  {/* ✅ Добавить компонент переводов */}
  <div className="mb-6">
    <TranslationFields
      originalLanguage={formData.original_language || 'ru'}
      onOriginalLanguageChange={(lang) =>
        setFormData({ ...formData, original_language: lang })
      }
      fields={{
        title: {
          original: formData.title,
          english: formData.title_en || '',
          label: 'Заголовок',
          type: 'text'
        },
        content: {
          original: formData.content,
          english: formData.content_en || '',
          label: 'Содержание',
          type: 'textarea'
        }
      }}
      onTranslationChange={(fieldName, value) => {
        setFormData({
          ...formData,
          [`${fieldName}_en`]: value
        })
      }}
      defaultExpanded={false}
    />
  </div>

  {/* Кнопка сохранения */}
  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
    Сохранить
  </button>
</form>
```

## 4. Обновление функции сохранения

Убедитесь, что поля локализации отправляются в БД:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    const updateData = {
      title: formData.title,
      content: formData.content,
      summary: formData.summary,
      // ... другие поля

      // ✅ Включить поля локализации
      original_language: formData.original_language,
      title_en: formData.title_en,
      content_en: formData.content_en
    }

    await supabase
      .from('news_posts')
      .update(updateData)
      .eq('id', newsId)

    alert('Новость сохранена!')
  } catch (error) {
    console.error('Error saving:', error)
    alert('Ошибка при сохранении')
  }
}
```

## 5. Загрузка данных с учетом локализации

При загрузке новости из БД:

```typescript
const fetchArticle = async () => {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('id', newsId)
    .single()

  if (data) {
    setFormData({
      id: data.id,
      title: data.title,
      content: data.content,
      summary: data.summary,
      // ... другие поля

      // ✅ Загрузить поля локализации
      original_language: data.original_language || 'ru',
      title_en: data.title_en || '',
      content_en: data.content_en || ''
    })
  }
}
```

## 6. Визуальное отображение прогресса перевода

Компонент автоматически показывает:
- Флаг оригинального языка
- Прогресс перевода (заполнено X из Y полей)
- Прогресс-бар с процентами
- Оригинальный текст для контекста при переводе

## 7. Адаптация для других сущностей

Тот же компонент можно использовать для:

### Buildings (здания):
```tsx
<TranslationFields
  originalLanguage={building.original_language || 'ru'}
  onOriginalLanguageChange={(lang) =>
    setBuilding({ ...building, original_language: lang })
  }
  fields={{
    name: {
      original: building.name,
      english: building.name_en || '',
      label: 'Название',
      type: 'text'
    },
    description: {
      original: building.description,
      english: building.description_en || '',
      label: 'Описание',
      type: 'textarea'
    }
  }}
  onTranslationChange={(fieldName, value) => {
    setBuilding({
      ...building,
      [`${fieldName}_en`]: value
    })
  }}
/>
```

### Routes (маршруты):
```tsx
<TranslationFields
  originalLanguage={route.original_language || 'ru'}
  onOriginalLanguageChange={(lang) =>
    setRoute({ ...route, original_language: lang })
  }
  fields={{
    title: {
      original: route.title,
      english: route.title_en || '',
      label: 'Название маршрута',
      type: 'text'
    },
    description: {
      original: route.description,
      english: route.description_en || '',
      label: 'Описание маршрута',
      type: 'textarea'
    }
  }}
  onTranslationChange={(fieldName, value) => {
    setRoute({
      ...route,
      [`${fieldName}_en`]: value
    })
  }}
/>
```

## 8. Валидация (опционально)

Добавьте валидацию, чтобы предупредить, если переводы не заполнены:

```typescript
const validateTranslations = () => {
  if (formData.original_language !== 'en') {
    if (!formData.title_en || !formData.content_en) {
      if (confirm('Некоторые переводы не заполнены. Продолжить без переводов?')) {
        return true
      }
      return false
    }
  }
  return true
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!validateTranslations()) {
    return
  }

  // ... сохранение
}
```

## 9. Готово!

Теперь у вас есть:
- ✅ Выбор оригинального языка (en/de/ru)
- ✅ Поля для английского перевода
- ✅ Визуальный прогресс перевода
- ✅ Показ оригинала для контекста
- ✅ Автоматическое скрытие полей перевода, если оригинал на английском
- ✅ Компонент готов для переиспользования в других формах

## Скриншот предполагаемого UI:

```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Локализация и переводы                          [▼]      │
│ Оригинал: 🇷🇺 RU • Переведено: 2/2 ███████████ 100%       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🗣️ Язык оригинала                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│ │ 🇬🇧 English│ │ 🇩🇪 Deutsch│ │ 🇷🇺 Русский│  ← выбрано    │
│ └──────────┘ └──────────┘ └──────────┘                    │
│                                                             │
│ ───────────────────────────────────────────────────────    │
│                                                             │
│ 🌐 Добавьте английский перевод для международной аудитории │
│                                                             │
│ Заголовок (English)                                         │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Оригинал (RU):                                          ││
│ │ Новое здание в центре Берлина                           ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ New building in the center of Berlin                     ││
│ └─────────────────────────────────────────────────────────┘│
│ ✓ Перевод добавлен (36 символов)                           │
│                                                             │
│ Содержание (English)                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Оригинал (RU):                                          ││
│ │ Архитектурное бюро представило проект...                ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ The architectural bureau presented a project...          ││
│ │                                                          ││
│ │                                                          ││
│ └─────────────────────────────────────────────────────────┘│
│ ✓ Перевод добавлен (156 символов)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
