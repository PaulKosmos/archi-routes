# 🎨 ПЛАН АДАПТАЦИИ ДИЗАЙНА

## Дата: 23 декабря 2025
## Последнее обновление: 28 декабря 2025
## Статус: 🚧 В процессе реализации

---

## 🎯 ЦЕЛЬ

Привести ВСЕ компоненты `/profile/*` и `UserDropdown` в полное соответствие с дизайн-системой из `Design/`.

**Принцип:** Создавать новый функционал СРАЗУ с правильным дизайном, а не переделывать потом.

---

## ✅ ВЫПОЛНЕНО (28 декабря 2025)

### Из DESIGN_MIGRATION_PROGRESS.md:
- ✅ **ФАЗА 1:** Базовая дизайн-система (100%)
- ✅ **ФАЗА 2:** Глобальные компоненты (Header, Footer) (100%)
- ✅ **ФАЗА 3:** Страницы контента (Blog, News, Podcasts) (100%)
- ✅ **ФАЗА 4:** Страница карты /map (~50%)
  - ✅ FilterPanel
  - ✅ BuildingList
  - ✅ RouteList
  - ✅ CurrentRoutePanel
  - ✅ **BuildingModal** ← НОВОЕ
  - ✅ **RouteViewerModal** ← НОВОЕ

### Из текущего плана:
- 🔄 `/profile` - главная страница (частично выполнена)
- ✅ Модальное окно маршрута (RouteViewerModal)
- ✅ Модальное окно объекта (BuildingModal)

---

## 🎯 АКТУАЛЬНЫЕ ЗАДАЧИ (Приоритет)

### 🔴 КРИТИЧНО (делать сейчас):
1. **Страница поиска** `/search` - привести к дизайн-системе
2. **Детальная страница объекта** `/buildings/[id]` - привести к дизайн-системе

### 🟡 ВАЖНО (следующие):
3. Завершить `/profile` и связанные страницы
4. `/profile/collections` и `/collections/[id]`
5. Модалки коллекций

---

## 📋 РЕФЕРЕНСЫ

### Источники дизайна:
- ✅ `Design/src/pages/Settings.tsx` - структура Tabs, spacing
- ✅ `Design/src/components/BlogCard.tsx` - стили карточек, hover эффекты
- ✅ `Design/src/components/NewsCard.tsx` - адаптивность, transitions
- ✅ `DESIGN_MIGRATION_PROGRESS.md` - общая дизайн-система

---

## 📑 КОМПОНЕНТЫ ДЛЯ АДАПТАЦИИ

### Все страницы профиля:
1. ✅ `/profile/favorites` - создана, нужна доработка дизайна
2. 🔄 `/profile` - главная страница (нужна проверка)
3. 🔄 `/profile/edit` - редактирование профиля
4. 🔄 `/profile/settings` - настройки
5. 🔄 `/profile/buildings` - мои объекты
6. 🔄 `/profile/reviews` - мои отзывы
7. 🔄 `/profile/routes` - мои маршруты
8. 🔄 `/profile/articles` - мои статьи
9. ❌ `/profile/collections` - еще не создана
10. ❌ `/collections/[id]` - еще не создана

### Компоненты навигации:
11. 🔄 `UserDropdown` - обновлен функционал, нужна проверка дизайна
12. 🔄 `Header` - проверить consistency

### Модалки (создать с правильным дизайном):
13. ❌ `AddToCollectionModal` - выбор коллекции
14. ❌ `CreateCollectionModal` - создание коллекции
15. ❌ `ShareCollectionModal` - шаринг коллекции

**Легенда:**
- ✅ Создано, нужна доработка
- 🔄 Существует, нужна проверка
- ❌ Нужно создать

---

## ✅ ЧТО УЖЕ СООТВЕТСТВУЕТ

### Применено корректно:
- ✅ `bg-background` для основного фона страниц
- ✅ `bg-card` для карточек и панелей
- ✅ `border-border` для границ
- ✅ `text-foreground` / `text-muted-foreground` для текста
- ✅ `rounded-[var(--radius)]` для скругления
- ✅ `font-heading` для заголовков
- ✅ `font-metrics` для счетчиков (в UserDropdown)
- ✅ Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- ✅ Icons размер: `h-4 w-4` для UI, `h-3.5 w-3.5` для метрик

---

## 🔧 ЧТО НУЖНО УЛУЧШИТЬ

### 1. **Фильтры в /profile/favorites** 🎛️

**Текущее состояние:**
```typescript
// Обычные кнопки в flex контейнере
<div className="mb-8 bg-card border border-border rounded-[var(--radius)] p-2">
  <div className="flex flex-wrap gap-2">
    {filters.map((filter) => (
      <button onClick={...} className={`...`}>
        <filter.icon className="w-4 h-4" />
        <span>{filter.label}</span>
        <span>({filter.count})</span>
      </button>
    ))}
  </div>
</div>
```

**Нужно сделать:**
- [ ] Использовать Tabs компонент из shadcn/ui
- [ ] Применить grid layout: `grid-cols-5` для 5 фильтров
- [ ] Добавить hidden иконки на мобильных
- [ ] Стиль активного таба должен быть `bg-background` (как в Settings.tsx)

**Код:**
```typescript
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

<Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
  <TabsList className="grid w-full grid-cols-5 mb-8">
    <TabsTrigger value="all" className="flex items-center gap-2">
      <Heart className="h-4 w-4" />
      <span className="hidden sm:inline">Все</span>
      <span className="text-xs sm:hidden">{totalFavorites}</span>
    </TabsTrigger>
    {/* ... остальные табы */}
  </TabsList>
</Tabs>
```

---

### 2. **Hover эффекты карточек** ✨

**Текущее состояние:**
- Карточки маршрутов и зданий: `hover:shadow-lg`
- BlogCard и NewsCard: используют свои компоненты (уже корректны)

**Нужно добавить:**
- [ ] `hover:-translate-y-1` для карточек маршрутов
- [ ] `hover:-translate-y-1` для карточек зданий
- [ ] `transition-transform duration-300` для плавности
- [ ] `transition-shadow` для shadow

**Код:**
```typescript
// Карточки маршрутов и зданий:
className="... hover:shadow-lg hover:-translate-y-1 transition-all duration-300"

// Изображения внутри карточек:
className="... group-hover:scale-105 transition-transform duration-500"
```

---

### 3. **Пустое состояние (Empty State)** 🌟

**Текущее состояние:**
```typescript
<div className="text-center py-16">
  <Heart className="w-20 h-20 text-muted-foreground/50 mx-auto mb-4" />
  <h3 className="text-xl font-semibold mb-2">Пока нет избранного</h3>
  <p className="text-muted-foreground mb-6">Лайкайте контент...</p>
</div>
```

**Нужно улучшить:**
- [ ] Добавить gradient background
- [ ] Увеличить padding
- [ ] Добавить скругление
- [ ] Сделать более визуально привлекательным

**Код:**
```typescript
<div className="text-center py-24 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-[var(--radius)] border border-border">
  <div className="max-w-md mx-auto">
    <div className="relative inline-block mb-6">
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl"></div>
      <Heart className="relative w-20 h-20 text-primary/50 mx-auto" />
    </div>
    <h3 className="text-2xl font-heading font-bold mb-3">Пока нет избранного</h3>
    <p className="text-muted-foreground mb-8">
      Лайкайте контент, который вам нравится, и он появится здесь
    </p>
    <Link
      href="/"
      className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors font-medium"
    >
      Начать изучать
    </Link>
  </div>
</div>
```

---

### 4. **Loading состояние (Skeletons)** ⏳

**Текущее состояние:**
```typescript
{[...Array(6)].map((_, i) => (
  <div key={i} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
    <div className="h-48 bg-muted animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-muted rounded animate-pulse" />
      <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
    </div>
  </div>
))}
```

**Нужно улучшить:**
- [ ] Использовать Skeleton компонент из shadcn/ui
- [ ] Добавить shimmer эффект
- [ ] Более реалистичные пропорции

**Код:**
```typescript
import { Skeleton } from '@/components/ui/skeleton'

{[...Array(6)].map((_, i) => (
  <div key={i} className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
    <Skeleton className="h-48 w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <div className="flex items-center gap-4 pt-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </div>
))}
```

---

### 5. **Заголовки секций** 📝

**Текущее состояние:**
```typescript
<h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-2">
  <BookOpen className="w-6 h-6 text-[hsl(var(--blog-primary))]" />
  Блоги ({favoritedBlogs.length})
</h2>
```

**Нужно добавить:**
- [ ] Separator после заголовка (для visual hierarchy)
- [ ] Consistent spacing
- [ ] Опциональный subtitle

**Код:**
```typescript
<div className="mb-8">
  <h2 className="text-2xl font-heading font-bold mb-2 flex items-center gap-2">
    <BookOpen className="w-6 h-6 text-[hsl(var(--blog-primary))]" />
    Блоги
    <span className="text-lg text-muted-foreground font-normal">
      ({favoritedBlogs.length})
    </span>
  </h2>
  <p className="text-sm text-muted-foreground">
    Статьи, которые вы сохранили для чтения
  </p>
</div>
<Separator className="mb-6" />
```

---

### 6. **Карточки маршрутов и зданий** 🏛️

**Нужно унифицировать:**
- [ ] Одинаковые отступы с BlogCard и NewsCard
- [ ] Одинаковый border-radius
- [ ] Consistency в typography
- [ ] Unified metadata display

**Стандарт для карточек:**
```typescript
<Link href="..." className="group block">
  <article className="bg-card border border-border rounded-[var(--radius)] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
    {/* Image */}
    <div className="relative h-48 bg-muted overflow-hidden">
      <img
        src="..."
        alt="..."
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>

    {/* Content */}
    <div className="p-4 flex-1 flex flex-col">
      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>

      {description && (
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {description}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-auto pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>{city}</span>
        </div>
        {/* ... */}
      </div>
    </div>
  </article>
</Link>
```

---

### 7. **Spacing и Typography** 📏

**Стандартизация:**

**Page level:**
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
- Sections gap: `mb-12`

**Section level:**
- Title margin: `mb-6` или `mb-8`
- Content gap: `gap-6` для grid

**Card level:**
- Padding: `p-4` (compact) или `p-6` (comfortable)
- Content gap: `space-y-2` или `space-y-3`
- Border: `border-t border-border` или `border-t-2 border-border` (thicker)

**Typography:**
- H1: `text-3xl font-heading font-bold`
- H2: `text-2xl font-heading font-bold`
- H3: `text-xl font-semibold` или `text-lg font-semibold`
- Body: `text-sm` или `text-base`
- Metadata: `text-xs text-muted-foreground`

---

## 📋 ЧЕКЛИСТ РЕАЛИЗАЦИИ (ОБНОВЛЕННЫЙ)

### ФАЗА A: Подготовка компонентов UI (20 мин)
- [ ] Проверить наличие shadcn/ui компонентов:
  - [ ] Tabs
  - [ ] Skeleton
  - [ ] Separator
  - [ ] Dialog (для модалок)
  - [ ] Select
  - [ ] Switch
- [ ] Создать общие utility компоненты если нужны

---

### ФАЗА B: Доработка /profile/favorites (1 час)
**Приоритет: Средний** (уже работает, нужна полировка)

- [ ] Заменить кнопки фильтров на Tabs компонент
- [ ] Добавить hover эффекты к карточкам маршрутов и зданий
- [ ] Улучшить Empty State (gradient, better CTA)
- [ ] Заменить loading на Skeleton компоненты
- [ ] Добавить Separator'ы после заголовков секций
- [ ] Проверить spacing и typography

---

### ФАЗА C: Проверка существующих страниц (2 часа)
**Приоритет: Высокий** (проверить перед созданием нового)

#### C1. `/profile` - главная страница (30 мин)
- [ ] Проверить layout соответствие
- [ ] Проверить Stats cards
- [ ] Проверить typography
- [ ] Проверить spacing

#### C2. `/profile/buildings` - мои объекты (20 мин)
- [ ] Проверить карточки объектов
- [ ] Проверить hover эффекты
- [ ] Проверить фильтры/сортировку

#### C3. `/profile/routes` - мои маршруты (20 мин)
- [ ] Проверить карточки маршрутов
- [ ] Проверить hover эффекты
- [ ] Добавить фильтры если нужно

#### C4. `/profile/reviews` - мои отзывы (20 мин)
- [ ] Проверить список отзывов
- [ ] Проверить карточки
- [ ] Проверить spacing

#### C5. `/profile/articles` - мои статьи (20 мин)
- [ ] Проверить BlogCard usage
- [ ] Проверить grid layout
- [ ] Добавить empty state

#### C6. `/profile/edit` и `/profile/settings` (30 min)
- [ ] Проверить форму редактирования
- [ ] Применить стили из Design/src/pages/Settings.tsx
- [ ] Проверить inputs, switches, selects

---

### ФАЗА D: UserDropdown - адаптация дизайна (30 мин)
**Приоритет: Высокий**

- [ ] Проверить dropdown positioning
- [ ] Проверить avatar display
- [ ] Улучшить stats section (использовать Grid)
- [ ] Добавить Separator'ы между секциями
- [ ] Проверить hover states для menu items
- [ ] Добавить icons consistency (все 4x4)
- [ ] Проверить badge colors для счетчиков
- [ ] Mobile adaptivity

**Референс:** Design/src/components/NotificationsPopover.tsx (похожая структура)

---

### ФАЗА E: Создание /profile/collections (2 часа)
**Приоритет: Высокий** (новый функционал)

- [ ] Создать страницу списка коллекций
- [ ] Применить Grid layout (2-3 колонки)
- [ ] Создать карточки коллекций:
  - [ ] Image/thumbnail
  - [ ] Title и description
  - [ ] Stats (количество элементов)
  - [ ] Badge для публичных
  - [ ] Hover эффекты
- [ ] Добавить кнопку "Создать коллекцию"
- [ ] Empty state
- [ ] Loading skeletons

---

### ФАЗА F: Создание /collections/[id] (1.5 часа)
**Приоритет: Высокий**

- [ ] Layout страницы:
  - [ ] Header с title, description
  - [ ] Stats bar (количество по типам)
  - [ ] Action buttons (Share, Edit, Delete)
- [ ] Grid элементов коллекции (mixed content)
- [ ] Использовать существующие Card компоненты
- [ ] Кнопка "Удалить из коллекции" на каждой карточке
- [ ] Edit mode для названия и описания

---

### ФАЗА G: Модалки (2 часа)
**Приоритет: Высокий** (создать сразу с правильным дизайном)

#### G1. AddToCollectionModal (45 мин)
- [ ] Dialog компонент из shadcn/ui
- [ ] Список коллекций (checkboxes)
- [ ] Поиск по коллекциям
- [ ] Кнопка "Создать новую коллекцию"
- [ ] Loading states
- [ ] Success feedback

#### G2. CreateCollectionModal (30 мин)
- [ ] Dialog с формой
- [ ] Input для названия
- [ ] Textarea для описания
- [ ] Switch для публичности
- [ ] Validation
- [ ] Submit handling

#### G3. ShareCollectionModal (30 мин)
- [ ] Dialog с share link
- [ ] Copy to clipboard функция
- [ ] QR code (опционально)
- [ ] Social share buttons
- [ ] Toggle публичности

#### G4. Confirm Delete Modal (15 мин)
- [ ] Simple confirm dialog
- [ ] Warning message
- [ ] Destructive action styling

---

### ФАЗА H: Финальная проверка ВСЕХ страниц (1.5 часа)
**Приоритет: Критический**

#### H1. Visual Consistency (30 мин)
- [ ] Все spacing values соответствуют системе
- [ ] Typography единообразна
- [ ] Colors из palette
- [ ] Border radius consistency
- [ ] Shadows consistency

#### H2. Interactive Elements (30 мин)
- [ ] Все hover states работают
- [ ] Transitions плавные (300ms)
- [ ] Focus states для keyboard navigation
- [ ] Loading states везде
- [ ] Error states

#### H3. Responsive (30 мин)
- [ ] Mobile (320px - 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Проверить все breakpoints
- [ ] Hamburger menu на mobile

---

### ФАЗА I: Performance & Accessibility (1 час)
**Приоритет: Средний**

- [ ] Lighthouse audit > 90
- [ ] Проверить bundle size
- [ ] Lazy loading для тяжелых компонентов
- [ ] Image optimization
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels
- [ ] Color contrast (WCAG AA)

---

## ⏱️ ОБНОВЛЕННАЯ ОЦЕНКА ВРЕМЕНИ

| Фаза | Компонент | Время |
|------|-----------|-------|
| A | Подготовка | 20 мин |
| B | /profile/favorites доработка | 1 час |
| C | Проверка существующих страниц | 2 часа |
| D | UserDropdown адаптация | 30 мин |
| E | /profile/collections создание | 2 часа |
| F | /collections/[id] создание | 1.5 часа |
| G | Модалки (4 штуки) | 2 часа |
| H | Финальная проверка | 1.5 часа |
| I | Performance & A11y | 1 час |

**ИТОГО: ~12 часов** (при условии работы с правильным дизайном сразу)

---

## 🎯 ПРИОРИТЕТЫ

### 🔴 КРИТИЧНО (делать первым):
1. **Фаза C** - Проверка существующих страниц (2 часа)
2. **Фаза D** - UserDropdown (30 мин)
3. **Фаза E** - /profile/collections (2 часа)

### 🟡 ВАЖНО (делать следом):
4. **Фаза F** - /collections/[id] (1.5 часа)
5. **Фаза G** - Модалки (2 часа)
6. **Фаза H** - Финальная проверка (1.5 часа)

### 🟢 МОЖНО ПОТОМ:
7. **Фаза B** - Полировка /profile/favorites (1 час)
8. **Фаза I** - Performance (1 час)

---

## 🎯 КРИТЕРИИ УСПЕХА

### Visual Consistency:
- ✅ Все карточки используют одинаковые hover эффекты
- ✅ Spacing соответствует дизайн-системе
- ✅ Typography единообразна
- ✅ Color scheme consistency

### UX:
- ✅ Плавные transitions (300ms для transform, 500ms для images)
- ✅ Понятная visual hierarchy
- ✅ Responsive на всех breakpoints
- ✅ Accessible (keyboard navigation, screen readers)

### Performance:
- ✅ Lighthouse score > 90
- ✅ Нет layout shifts
- ✅ Optimized images

---

## 📚 ССЫЛКИ

- [DESIGN_MIGRATION_PROGRESS.md](./DESIGN_MIGRATION_PROGRESS.md)
- [PROFILE_REDESIGN.md](./PROFILE_REDESIGN.md)
- Design/src/pages/Settings.tsx
- Design/src/components/BlogCard.tsx
- Design/src/components/NewsCard.tsx

---

## 🚀 РЕКОМЕНДУЕМЫЙ ПОРЯДОК РАБОТЫ

### День 1: Проверка и UserDropdown (2.5 часа)
1. ✅ Фаза A: Подготовка UI компонентов (20 мин)
2. 🔴 Фаза C: Проверка существующих страниц (2 часа)
3. 🔴 Фаза D: UserDropdown адаптация (30 мин)

### День 2: Коллекции основа (3.5 часа)
4. 🔴 Фаза E: /profile/collections страница (2 часа)
5. 🟡 Фаза F: /collections/[id] детальная (1.5 часа)

### День 3: Модалки и проверка (3.5 часа)
6. 🟡 Фаза G: Все модалки (2 часа)
7. 🟡 Фаза H: Финальная проверка (1.5 часа)

### День 4: Полировка (опционально, 2 часа)
8. 🟢 Фаза B: Полировка /profile/favorites (1 час)
9. 🟢 Фаза I: Performance & A11y (1 час)

**Итого: 9.5 часов критичного + 2 часа полировки = 11.5 часов**

---

**Статус:** 📋 Готов к реализации
**Принцип:** Создавать весь новый функционал СРАЗУ с правильным дизайном
**Общее время:** ~12 часов (критичные задачи ~10 часов)
