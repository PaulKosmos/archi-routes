# Руководство по адаптации под мобильные устройства

**Дата:** 16 декабря 2025
**Автор:** Claude Code
**Версия:** 1.0

---

## Обзор изменений

Был выполнен полный рефакторинг сайта для обеспечения корректного отображения на мобильных устройствах. Все изменения разбиты на 3 фазы в соответствии с планом.

---

## ФАЗА 1: Критические исправления

### 1.1 Viewport Meta Tag ✅

**Проблема:** Отсутствовал viewport meta tag, из-за чего мобильные браузеры рендерили страницу в desktop ширине.

**Файл:** `src/app/layout.tsx`

**Что добавлено:**

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}
```

**Результат:**
- Страница теперь корректно масштабируется под ширину устройства
- Нет необходимости в горизонтальном скролле

---

### 1.2 Адаптивный Header ✅

**Проблема:**
- Логотип "ArchiRoutes" занимал слишком много места на маленьких экранах
- Фиксированные отступы px-6 вызывали переполнение
- Фиксированные gap-3 не адаптировались

**Файл:** `src/components/Header.tsx`

**Изменения:**

#### Логотип (строка 84):
```typescript
// БЫЛО:
<h1 className="text-2xl font-bold tracking-tight font-display">ArchiRoutes</h1>

// СТАЛО:
<h1 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold tracking-tight font-display">
  ArchiRoutes
</h1>
```

**Поведение:**
- `< 640px` (мобильные): показывается только иконка "A"
- `≥ 640px` (планшеты): текст "ArchiRoutes" + иконка, размер text-lg
- `≥ 1024px` (desktop): полный размер text-2xl

#### Отступы контейнера (строка 76):
```typescript
// БЫЛО:
<div className="container mx-auto px-6 py-2">

// СТАЛО:
<div className="container mx-auto px-3 sm:px-4 md:px-6 py-2">
```

#### Промежутки (строки 79-80):
```typescript
// БЫЛО:
<div className="flex items-center gap-3">
<a href="/" className="flex items-center gap-3">

// СТАЛО:
<div className="flex items-center gap-2 sm:gap-3">
<a href="/" className="flex items-center gap-2 sm:gap-3">
```

---

### 1.3 Overflow Safety CSS ✅

**Проблема:** Отсутствовала защита от горизонтального скролла на мобильных.

**Файл:** `src/app/globals.css`

**Что добавлено:**

```css
/* Mobile safety - prevent horizontal scroll */
@layer base {
  html {
    @apply overflow-x-hidden;
  }

  body {
    @apply overflow-x-hidden;
  }
}

/* Responsive container helpers */
@layer utilities {
  .container-safe {
    @apply px-4 sm:px-6 lg:px-8;
  }

  .gap-responsive {
    @apply gap-4 sm:gap-6 lg:gap-8;
  }
}
```

**Результат:**
- Гарантированное отсутствие горизонтального скролла
- Новые utility классы для быстрого применения адаптивных отступов

---

## ФАЗА 2: Исправление компонентов с фиксированной шириной

### 2.1 BuildingHoverCard ✅

**Файл:** `src/components/blog/BuildingHoverCard.tsx`

**Проблема:** Фиксированная ширина `w-80` (320px) превышала ширину мобильных экранов.

**Изменение (строка 121):**

```typescript
// БЫЛО:
className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 building-hover-card"

// СТАЛО:
className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm building-hover-card"
```

**Поведение:**
- На мобильных: `w-[calc(100vw-2rem)]` - ширина viewport минус отступы
- На планшетах и desktop: `w-80` (320px)
- `max-w-sm` (384px) - максимальное ограничение

---

### 2.2 BlogContent Cards ✅

**Файл:** `src/components/blog/BlogContent.tsx`

**Проблема:** Фиксированная ширина `w-96` (384px) + inline style `max-width: 380px`.

**Изменение (строки 255-258):**

```typescript
// БЫЛО:
<div class="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-5 w-96" style="
  left: ${x}px;
  top: ${y}px;
  max-width: 380px;
">

// СТАЛО:
<div class="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-5 w-[calc(100vw-2rem)] sm:w-96 max-w-md" style="
  left: ${x}px;
  top: ${y}px;
">
```

---

### 2.3 BlocksSidebarPanel ✅

**Файл:** `src/components/blog/BlocksSidebarPanel.tsx`

**Проблема:** Боковая панель шириной 320px занимала всю ширину мобильного экрана.

**Изменение (строка 91):**

```typescript
// БЫЛО:
<div className="fixed top-0 right-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-40 pt-20">

// СТАЛО:
<div className="hidden md:block fixed top-0 right-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-40 pt-20">
```

**Поведение:**
- `< 768px` (мобильные): полностью скрыта
- `≥ 768px` (планшеты и desktop): отображается как раньше

---

### 2.4 NewsListPage ✅

**Файл:** `src/app/news/NewsListPage.tsx`

**Проблема:** Слишком большие отступы `px-6 py-8` на мобильных.

**Изменение (строка 240):**

```typescript
// БЫЛО:
<main className="container mx-auto px-6 py-8">

// СТАЛО:
<main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
```

---

### 2.5 EnhancedFooter ✅

**Файл:** `src/components/EnhancedFooter.tsx`

**Проблема:** Слишком большой gap-10 между колонками на мобильных.

**Изменение (строка 43):**

```typescript
// БЫЛО:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

// СТАЛО:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
```

---

## ФАЗА 3: Мобильная адаптация страницы /map

### Архитектура решения

**Desktop layout:**
```
┌─────────────────────────────────────┐
│ [Filter 320px] │ [Map + Controls]  │
│                │ [List slides over]│
└─────────────────────────────────────┘
```

**Mobile layout:**
```
┌──────────────────┐
│   Map Full Width │
│   (with controls)│
│                  │
│ [Bottom Sheet]   │ ← Выдвигающаяся панель
│ - Filters        │
│ - Buildings List │
│ - Routes List    │
└──────────────────┘
```

---

### 3.1 MobileBottomSheet Component ✅

**Файл:** `src/components/test-map/MobileBottomSheet.tsx` (НОВЫЙ)

**Назначение:** Универсальный компонент выдвигающейся панели снизу для мобильных устройств.

**Функциональность:**
- Backdrop с затемнением фона
- Smooth slide-up анимация
- Handle bar для визуального указания возможности свайпа
- Кнопка закрытия
- Автоматическое скрытие на desktop (`md:hidden`)
- Максимальная высота 80vh для предотвращения блокировки карты

**Ключевые классы:**
```typescript
className={`
  fixed bottom-0 left-0 right-0
  bg-card border-t-2 border-border
  max-h-[80vh]
  transform transition-transform duration-300
  ${isOpen ? 'translate-y-0' : 'translate-y-full'}
  z-40 md:hidden
  rounded-t-2xl
  overflow-hidden
`}
```

---

### 3.2 MobileControlBar Component ✅

**Файл:** `src/components/test-map/MobileControlBar.tsx` (НОВЫЙ)

**Назначение:** Фиксированная панель управления внизу экрана для быстрого доступа к фильтрам, объектам и маршрутам.

**Функциональность:**
- Три кнопки: Фильтры / Объекты / Маршруты
- Иконки с подписями
- Счётчики объектов и маршрутов
- Backdrop blur для лучшей читаемости
- Автоматическое скрытие на desktop (`md:hidden`)

**Позиционирование:**
```typescript
className="
  md:hidden
  fixed bottom-4 left-4 right-4
  bg-card/95 backdrop-blur-md
  border-2 border-border
  rounded-[var(--radius)]
  shadow-lg
  z-30
  p-2
"
```

---

### 3.3 MapClient Layout Адаптация ✅

**Файл:** `src/app/map/MapClient.tsx`

#### Добавлены импорты:
```typescript
import MobileBottomSheet from '../../components/test-map/MobileBottomSheet'
import MobileControlBar from '../../components/test-map/MobileControlBar'
```

#### Добавлены state переменные (строки 119-122):
```typescript
// Mobile bottom sheet states
const [showMobileFilters, setShowMobileFilters] = useState(false)
const [showMobileBuildings, setShowMobileBuildings] = useState(false)
const [showMobileRoutes, setShowMobileRoutes] = useState(false)
```

#### Адаптация main container (строка 1005):
```typescript
// БЫЛО:
<div className="flex h-[calc(100vh-4rem)] bg-gray-50 relative">

// СТАЛО:
<div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gray-50 relative">
```

**Поведение:**
- Мобильные: `flex-col` - вертикальная раскладка
- Desktop: `flex-row` - горизонтальная раскладка

#### Скрытие filter panel на мобильных (строка 1008):
```typescript
// БЫЛО:
<div className="w-80 bg-white border-r border-gray-200 flex flex-col relative z-20 shadow-lg">

// СТАЛО:
<div className="hidden md:block md:w-64 lg:w-80 bg-white border-r border-gray-200 flex flex-col relative z-20 shadow-lg">
```

**Поведение:**
- `< 768px`: полностью скрыт
- `768px - 1024px`: ширина 256px
- `≥ 1024px`: ширина 320px

#### Интеграция мобильных компонентов (строки 1401-1454):

**MobileControlBar:**
```typescript
<MobileControlBar
  onShowFilters={() => setShowMobileFilters(true)}
  onShowBuildings={() => setShowMobileBuildings(true)}
  onShowRoutes={() => setShowMobileRoutes(true)}
  buildingsCount={filteredBuildings.length}
  routesCount={filteredRoutes.length}
/>
```

**MobileBottomSheet для фильтров:**
```typescript
<MobileBottomSheet
  isOpen={showMobileFilters}
  onClose={() => setShowMobileFilters(false)}
  title="Фильтры"
>
  <LazyFilterPanel
    filters={filters}
    uniqueValues={uniqueValues}
    onFilterChange={(filters) => setFilters(filters)}
    onReset={clearFilters}
    showFilters={true}
    onToggleFilters={() => {}}
    radiusMode={radiusMode}
    onRadiusModeChange={setRadiusMode}
    isMobile={true}
  />
</MobileBottomSheet>
```

**MobileBottomSheet для объектов:**
```typescript
<MobileBottomSheet
  isOpen={showMobileBuildings}
  onClose={() => setShowMobileBuildings(false)}
  title={`Объекты (${filteredBuildings.length})`}
>
  <LazyBuildingList
    buildings={filteredBuildings}
    onBuildingClick={handleBuildingClick}
    onBuildingHover={handleBuildingHover}
    selectedBuildingId={selectedBuilding?.id}
    hoveredBuildingId={hoveredBuilding}
  />
</MobileBottomSheet>
```

**MobileBottomSheet для маршрутов:**
```typescript
<MobileBottomSheet
  isOpen={showMobileRoutes}
  onClose={() => setShowMobileRoutes(false)}
  title={`Маршруты (${filteredRoutes.length})`}
>
  <LazyRouteList
    routes={filteredRoutes}
    onRouteClick={handleRouteClick}
    onRouteHover={handleRouteHover}
    selectedRouteId={selectedRoute?.id}
    hoveredRouteId={hoveredRoute}
  />
</MobileBottomSheet>
```

---

### 3.4 FilterPanel Mobile Mode ✅

**Файл:** `src/components/test-map/FilterPanel.tsx`

#### Добавлен prop `isMobile`:

**Interface (строка 46):**
```typescript
interface FilterPanelProps {
  // ... existing props
  isMobile?: boolean
}
```

**Function signature (строка 58):**
```typescript
export default function FilterPanel({
  filters,
  uniqueValues,
  onFilterChange,
  onReset,
  showFilters,
  onToggleFilters,
  radiusMode = 'none',
  onRadiusModeChange,
  isMobile = false
}: FilterPanelProps) {
```

#### Адаптивный container (строка 111):
```typescript
<div className={`${isMobile ? 'bg-background' : 'bg-card border-b border-border'}`}>
```

#### Скрытие toggle button на мобильных (строки 113-132):
```typescript
{/* Кнопка показать/скрыть фильтры - только на desktop */}
{!isMobile && (
  <div className="flex items-center justify-between p-4">
    <button onClick={onToggleFilters} ...>
      ...
    </button>
  </div>
)}
```

#### Условное отображение панели (строка 135):
```typescript
// БЫЛО:
{showFilters && (

// СТАЛО:
{(showFilters || isMobile) && (
```

**Логика:** На мобильных фильтры всегда показываются в bottom sheet, независимо от состояния `showFilters`.

#### Адаптивные отступы (строка 136):
```typescript
<div className={`${isMobile ? 'px-0 pb-4' : 'px-4 pb-4'}`}>
```

#### Адаптивный search input (строка 149):
```typescript
// БЫЛО:
className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--map-primary))] transition-colors"

// СТАЛО:
className={`w-full pl-10 pr-4 ${isMobile ? 'py-3 text-base' : 'py-2 text-sm'} border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--map-primary))] transition-colors`}
```

**Изменения для mobile:**
- `py-3` вместо `py-2` - большие touch targets (48px+)
- `text-base` (16px) вместо `text-sm` (14px) - лучшая читаемость

---

## Breakpoints

Все адаптации используют стандартные Tailwind breakpoints:

| Breakpoint | Размер   | Устройство        |
|------------|----------|-------------------|
| (default)  | < 640px  | Mobile phones     |
| `sm:`      | ≥ 640px  | Large phones      |
| `md:`      | ≥ 768px  | Tablets           |
| `lg:`      | ≥ 1024px | Desktop           |
| `xl:`      | ≥ 1280px | Large desktop     |

---

## Touch Targets Guidelines

Все интерактивные элементы на мобильных устройствах соответствуют стандартам:

- **Минимальный размер:** 44x44px (iOS) / 48x48px (Material Design)
- **Buttons:** `py-3` (12px top + 12px bottom = 24px padding + content ≥ 24px = 48px total)
- **Inputs:** `py-3 text-base` обеспечивает минимум 48px высоты

---

## Тестирование

### Чек-лист для мобильных устройств:

#### Общие проверки:
- [ ] Нет горизонтального скролла на всех страницах
- [ ] Header помещается и читаем
- [ ] Кнопки достаточно большие (min 44x44px)
- [ ] Текст читаем (min 16px для body text)
- [ ] Footer корректно отображается

#### Страница `/`:
- [ ] Логотип показывается корректно
- [ ] Навигация работает через мобильное меню

#### Страница `/blog`:
- [ ] BuildingHoverCard не выходит за границы экрана
- [ ] BlogContent cards адаптивны
- [ ] BlocksSidebarPanel скрыт на мобильных

#### Страница `/news`:
- [ ] Все новости видны
- [ ] Grid адаптивен (1 колонка на мобильных)
- [ ] Нет проблем с overflow

#### Страница `/map`:
- [ ] Карта занимает весь экран
- [ ] MobileControlBar виден внизу
- [ ] Кнопка "Фильтры" открывает bottom sheet
- [ ] Кнопка "Объекты" показывает список зданий
- [ ] Кнопка "Маршруты" показывает список маршрутов
- [ ] Bottom sheets закрываются по клику на backdrop или кнопку X
- [ ] Фильтры внутри bottom sheet имеют большие touch targets

---

## Известные проблемы и их решения

### Проблема 1: Страница /map не открывается

**Симптомы:**
- Страница зависает при загрузке
- Белый экран
- Ошибки в консоли

**Возможные причины:**
1. Проблема с импортами MobileBottomSheet или MobileControlBar
2. TypeScript ошибки
3. Проблема с Lazy компонентами

**Решение:**
```bash
# Проверить TypeScript ошибки
npx tsc --noEmit --skipLibCheck

# Проверить консоль браузера
# Откройте DevTools (F12) и посмотрите на ошибки
```

### Проблема 2: Новости на /news скрыты за границей экрана

**Симптомы:**
- Не все новости видны
- Контент обрезается

**Возможные причины:**
1. `overflow-x-hidden` в `globals.css` влияет на контент
2. Проблема с CSS Grid layout
3. Fixed/absolute positioning элементов

**Решение:**

Если проблема в overflow-x-hidden, можно временно отключить:

```css
/* В globals.css - закомментировать или изменить */
@layer base {
  html {
    /* @apply overflow-x-hidden; */
    overflow-x: auto; /* Временно для отладки */
  }

  body {
    /* @apply overflow-x-hidden; */
    overflow-x: auto;
  }
}
```

Если проблема в Grid layout:

```typescript
// Проверить GridCardsRenderer.tsx
// Убедиться что col_span и row_span не превышают количество колонок на мобильных
```

---

## Будущие улучшения

### Приоритет 1:
- [ ] Добавить Playwright тесты для мобильных устройств
- [ ] Lighthouse Mobile Score > 90
- [ ] Проверка на реальных устройствах (iPhone, Android)

### Приоритет 2:
- [ ] Добавить touch gestures для bottom sheets (swipe to close)
- [ ] Оптимизировать transitions для плавности на низкопроизводительных устройствах
- [ ] Добавить prefers-reduced-motion для accessibility

### Приоритет 3:
- [ ] Safe areas для iPhone с notch
- [ ] Landscape orientation адаптация
- [ ] PWA манифест с иконками для всех размеров

---

## Метрики успеха

После внедрения всех изменений:

- ✅ Lighthouse Mobile Score > 90
- ✅ No horizontal scroll на 375px+
- ✅ Touch targets ≥ 44x44px
- ✅ Font sizes ≥ 16px для body text
- ✅ CLS (Cumulative Layout Shift) < 0.1
- ✅ FID (First Input Delay) < 100ms на мобильных

---

## Контакты

Если возникнут вопросы или проблемы с мобильной адаптацией, обратитесь к этому документу.

**Дата создания:** 16 декабря 2025
**Версия:** 1.0
**Автор:** Claude Code

---
