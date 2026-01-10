# ARCHI-ROUTES: ПЛАН ТОЧЕЧНЫХ УЛУЧШЕНИЙ ДИЗАЙНА

**Дата:** 2026-01-07
**Цель:** Улучшить существующий дизайн без радикальных изменений
**Подход:** Эволюционный (полировка, консистентность, детали)

---

## 📊 ОБЩИЙ АНАЛИЗ

### Сильные стороны текущего дизайна:
- ✅ Четкая структура и навигация
- ✅ Респонсивная адаптация (mobile-first)
- ✅ Минималистичный подход с чистыми линиями
- ✅ Функциональная цветовая система (HSL переменные)
- ✅ Хорошая типографическая база (Rubik)
- ✅ Dark mode поддержка

### Области для улучшения:
- ⚠️ Inconsistent spacing и ритм
- ⚠️ Недостаточная визуальная иерархия
- ⚠️ Базовые hover состояния
- ⚠️ Отсутствие микро-анимаций
- ⚠️ Некоторые UX шероховатости
- ⚠️ Недостаточная полировка деталей

---

## 🎯 ПРИОРИТЕТНЫЕ УЛУЧШЕНИЯ

### 1. ТИПОГРАФИКА И ВИЗУАЛЬНАЯ ИЕРАРХИЯ

#### Проблема:
- Заголовки используют тот же шрифт что и body text (Rubik)
- Недостаточный контраст между уровнями заголовков
- Line-height оптимизирован не везде

#### Решение:

**A. Улучшение заголовков (без смены шрифта)**
```css
/* В globals.css - добавить */

/* Display headings - более выразительные */
.heading-display {
  font-weight: 700;
  letter-spacing: -0.02em;  /* Tighter для крупных заголовков */
  line-height: 1.1;
}

/* Hero headings */
.heading-hero {
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-size: clamp(2.5rem, 6vw, 4rem);  /* Fluid typography */
}

/* Section headings */
.heading-section {
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.2;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
}

/* Card headings */
.heading-card {
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.005em;
}

/* Body text - улучшенная читаемость */
.text-body {
  line-height: 1.7;
  letter-spacing: 0.01em;
}

.text-body-large {
  line-height: 1.75;
  font-size: 1.125rem;
}
```

**B. Применение в компонентах**

**BuildingsGrid.tsx** (строка 51-52):
```tsx
// Было:
<h2 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
  Architectural <span className="font-light italic">Masterpieces</span>
</h2>

// Стало:
<h2 className="heading-section text-foreground mb-3">
  Architectural <span className="font-light italic tracking-normal">Masterpieces</span>
</h2>
```

**Header.tsx** (строка 84):
```tsx
// Было:
<h1 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold tracking-tight font-display">
  ArchiRoutes
</h1>

// Стало:
<h1 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold tracking-tighter">
  ArchiRoutes
</h1>
```

**Файлы для изменения:**
- `src/app/globals.css` (добавить новые utility классы)
- `src/components/homepage/BuildingsGrid.tsx`
- `src/components/homepage/HeroWithVideo.tsx`
- `src/components/homepage/FeaturedRoutesSection.tsx`

---

### 2. SPACING И РИТМИЧЕСКИЙ БАЛАНС

#### Проблема:
- Inconsistent vertical spacing между секциями
- Padding в компонентах не выровнен
- Нарушение вертикального ритма

#### Решение:

**A. Создать систему spacing**
```css
/* В globals.css - добавить spacing system */

:root {
  /* Vertical rhythm based на 8px baseline */
  --spacing-section: 5rem;      /* 80px между секциями */
  --spacing-section-sm: 3rem;   /* 48px для мобильных */
  --spacing-content: 3rem;      /* 48px внутри секций */
  --spacing-content-sm: 2rem;   /* 32px для мобильных */
  --spacing-element: 1.5rem;    /* 24px между элементами */
  --spacing-tight: 0.75rem;     /* 12px для плотных элементов */
}

/* Utility classes */
.section-spacing {
  padding-top: var(--spacing-section-sm);
  padding-bottom: var(--spacing-section-sm);
}

@media (min-width: 768px) {
  .section-spacing {
    padding-top: var(--spacing-section);
    padding-bottom: var(--spacing-section);
  }
}

.content-spacing {
  margin-bottom: var(--spacing-content-sm);
}

@media (min-width: 768px) {
  .content-spacing {
    margin-bottom: var(--spacing-content);
  }
}
```

**B. Применение в компонентах**

**BuildingsGrid.tsx** (строка 34):
```tsx
// Было:
<section className="py-12 bg-muted/30 relative overflow-hidden">

// Стало:
<section className="section-spacing bg-muted/30 relative overflow-hidden">
```

**HomePage.tsx** - применить ко всем секциям:
```tsx
<HeroWithVideo stats={stats} />
<div className="section-spacing">
  <FeaturedRoutesSection routes={routes} loading={loading} />
</div>
<div className="section-spacing">
  <HowItWorksSection />
</div>
<!-- и т.д. -->
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/homepage/BuildingsGrid.tsx`
- `src/components/homepage/FeaturedRoutesSection.tsx`
- `src/components/homepage/HowItWorksSection.tsx`
- `src/app/HomePage.tsx`

---

### 3. УЛУЧШЕНИЕ HOVER СОСТОЯНИЙ И TRANSITIONS

#### Проблема:
- Простые hover эффекты (только translateY)
- Отсутствие разнообразия в transitions
- Нет обратной связи для некоторых интерактивных элементов

#### Решение:

**A. Улучшенные hover эффекты для карточек**
```css
/* В globals.css - улучшить .building-card */

/* Было */
.building-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* Стало */
.building-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.building-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg,
    hsl(var(--primary) / 0.05) 0%,
    transparent 50%,
    hsl(var(--primary) / 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.building-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 12px 32px rgba(0, 0, 0, 0.15),
    0 0 0 1px hsl(var(--foreground) / 0.05);
  border-color: hsl(var(--foreground) / 0.2);
}

.building-card:hover::before {
  opacity: 1;
}

.building-card:active {
  transform: translateY(-2px) scale(0.99);
}
```

**B. Улучшенные button transitions**
```css
/* Стандартная кнопка */
.btn {
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

**C. Link hover effects**
```css
/* Navigation links */
.nav-link {
  position: relative;
  transition: color 0.2s ease;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-link:hover::after {
  width: 100%;
}
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/Header.tsx` (применить .nav-link)
- `src/components/homepage/BuildingsGrid.tsx`

---

### 4. МИКРО-АНИМАЦИИ И ОБРАТНАЯ СВЯЗЬ

#### Проблема:
- Элементы появляются без анимации
- Отсутствует обратная связь при взаимодействии
- Loading states базовые

#### Решение:

**A. Staggered animations для списков**
```css
/* В globals.css */

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out both;
}

/* Stagger delay utilities */
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
.stagger-5 { animation-delay: 0.5s; }
.stagger-6 { animation-delay: 0.6s; }
.stagger-7 { animation-delay: 0.7s; }
.stagger-8 { animation-delay: 0.8s; }
```

**B. Применение в BuildingsGrid.tsx**
```tsx
// В map функции (строка 74)
{buildings.slice(0, 8).map((building, index) => (
  <Link
    key={building.id}
    href={`/buildings/${building.id}`}
    className={`group relative bg-card border border-border hover:border-foreground/30
                transition-all overflow-hidden animate-fade-in-up stagger-${(index % 8) + 1}`}
    style={{ borderRadius: '2px' }}
  >
    {/* ... */}
  </Link>
))}
```

**C. Improved skeleton loaders**
```css
/* Более элегантный skeleton loader */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.7) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/homepage/BuildingsGrid.tsx`
- `src/components/homepage/FeaturedRoutesSection.tsx`

---

### 5. УЛУЧШЕНИЕ ВИЗУАЛЬНОЙ ГЛУБИНЫ

#### Проблема:
- Все элементы плоские
- Minimal shadows
- Недостаточно слоев

#### Решение:

**A. Layered shadow system**
```css
/* В globals.css - создать shadow system */

:root {
  /* Elevation levels */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1),
               0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07),
               0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1),
               0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1),
               0 8px 10px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.15);

  /* Colored shadows для primary elements */
  --shadow-primary: 0 4px 14px hsl(var(--primary) / 0.25);
}

/* Utility classes */
.shadow-xs { box-shadow: var(--shadow-xs); }
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.shadow-xl { box-shadow: var(--shadow-xl); }
.shadow-2xl { box-shadow: var(--shadow-2xl); }
.shadow-primary { box-shadow: var(--shadow-primary); }
```

**B. Backdrop blur для Header**

**Header.tsx** (строка 75):
```tsx
// Было:
<header className="sticky top-0 z-50 border-b-2 border-foreground bg-card/80 backdrop-blur-md">

// Стало:
<header className="sticky top-0 z-50 border-b-2 border-foreground/20 bg-card/70 backdrop-blur-xl shadow-md">
```

**C. Card elevation**

**BuildingsGrid.tsx**:
```tsx
// Добавить shadow к карточкам
className="group relative bg-card border border-border shadow-sm hover:shadow-lg
           hover:border-foreground/30 transition-all overflow-hidden"
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/Header.tsx`
- `src/components/homepage/BuildingsGrid.tsx`

---

### 6. УЛУЧШЕНИЕ ЦВЕТОВОЙ СИСТЕМЫ

#### Проблема:
- Primary цвет (#F26438) может быть слишком ярким
- Темная тема слишком контрастная
- Недостаточно использования accent цветов

#### Решение:

**A. Softened primary variants**
```css
/* В globals.css - добавить варианты primary */

:root {
  /* Primary variants */
  --primary-soft: 4 85% 65%;        /* Светлее на 7% */
  --primary-muted: 4 60% 55%;       /* Меньше saturation */
  --primary-hover: 4 95% 52%;       /* Ярче для hover */

  /* Accent improvements */
  --accent-blue: 217 91% 60%;       /* Для info */
  --accent-green: 142 71% 45%;      /* Для success */
  --accent-amber: 48 100% 50%;      /* Для warning */
  --accent-red: 0 84% 60%;          /* Для error */
}

/* Dark mode - более теплые тона */
.dark {
  --background: 222 20% 10%;        /* Было 0 0% 8% - добавили синий оттенок */
  --foreground: 210 20% 98%;        /* Было 0 0% 98% - добавили синий */
  --card: 222 18% 14%;              /* Было 0 0% 13% - теплее */
  --muted: 222 15% 25%;             /* Теплее */
}
```

**B. Применение soft variants**
```css
/* CTA кнопки с мягким primary */
.btn-primary-soft {
  background: hsl(var(--primary-soft));
  color: white;
}

.btn-primary-soft:hover {
  background: hsl(var(--primary-hover));
}
```

**Файлы для изменения:**
- `src/app/globals.css`

---

### 7. RESPONSIVE УЛУЧШЕНИЯ

#### Проблема:
- Некоторые элементы слишком маленькие на mobile
- Touch targets < 44px
- Недостаточная оптимизация для планшетов

#### Решение:

**A. Увеличить touch targets**
```css
/* Минимум 44x44px для всех интерактивных элементов */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Mobile-specific improvements */
@media (max-width: 768px) {
  /* Увеличить base font size */
  html {
    font-size: 17px;  /* Вместо 16px */
  }

  /* Больше padding для читаемости */
  .container {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  /* Кнопки крупнее */
  .btn {
    min-height: 48px;
    padding: 0.875rem 1.5rem;
  }
}
```

**B. Header mobile optimization**

**Header.tsx** - увеличить логотип и кнопки на mobile:
```tsx
// Логотип (строка 81):
<div className="w-11 h-11 md:w-10 md:h-10 bg-primary bevel-edge flex items-center justify-center">
  <span className="text-primary-foreground font-bold text-xl md:text-xl">A</span>
</div>

// Mobile menu button:
<button className="touch-target lg:hidden ...">
  <Menu className="w-6 h-6" />
</button>
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/Header.tsx`

---

### 8. UX ПОЛИРОВКА

#### Проблема:
- Отсутствие focus states для клавиатурной навигации
- Недостаточная feedback при действиях
- Loading states могут быть лучше

#### Решение:

**A. Focus states для accessibility**
```css
/* Кастомные focus rings */
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: inherit;
}

/* Focus для специфичных элементов */
.btn:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 3px;
  box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
}

.card:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 4px;
  transform: translateY(-2px);
}
```

**B. Loading states улучшения**
```tsx
// Более информативный loading component
const LoadingCard = () => (
  <div className="relative bg-card border border-border rounded overflow-hidden">
    <div className="skeleton h-64" />
    <div className="p-4 space-y-3">
      <div className="skeleton h-6 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/2 rounded" />
      <div className="skeleton h-4 w-full rounded" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
)
```

**C. Success/Error feedback**
```css
/* Toast notifications стили */
.toast {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-xl);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-success {
  border-left: 4px solid hsl(var(--accent-green));
  background: hsl(var(--accent-green) / 0.1);
}

.toast-error {
  border-left: 4px solid hsl(var(--accent-red));
  background: hsl(var(--accent-red) / 0.1);
}
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/homepage/BuildingsGrid.tsx` (loading states)

---

### 9. КОНСИСТЕНТНОСТЬ В КОМПОНЕНТАХ

#### Проблема:
- Border radius не унифицирован (2px, 0.75rem смешаны)
- Разные стили кнопок в разных местах
- Inconsistent padding

#### Решение:

**A. Унифицировать border radius**
```css
/* В globals.css - определить четкую систему */

:root {
  --radius-sm: 0.25rem;   /* 4px - маленькие элементы */
  --radius: 0.5rem;       /* 8px - стандартный */
  --radius-md: 0.75rem;   /* 12px - карточки */
  --radius-lg: 1rem;      /* 16px - большие элементы */
  --radius-xl: 1.5rem;    /* 24px - очень большие */
  --radius-full: 9999px;  /* Полностью круглый */
}

/* Utility classes */
.rounded-sm { border-radius: var(--radius-sm); }
.rounded { border-radius: var(--radius); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-full { border-radius: var(--radius-full); }
```

**B. Унифицировать кнопки**
```css
/* Base button styles */
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
}

/* Button variants */
.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid transparent;
}

.btn-secondary {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
}

.btn-ghost {
  background: transparent;
  color: hsl(var(--foreground));
  border: 1px solid transparent;
}

.btn-ghost:hover {
  background: hsl(var(--muted));
}

/* Button sizes */
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
}

.btn-lg {
  padding: 0.875rem 1.75rem;
  font-size: 1rem;
}
```

**Файлы для изменения:**
- `src/app/globals.css`
- Все компоненты с кнопками (проверить и применить единые классы)

---

### 10. ARCHITECTURAL ДЕТАЛИ

#### Проблема:
- Дизайн не отражает архитектурную тематику
- Недостаточно использования архитектурных мотивов

#### Решение:

**A. Архитектурные акценты**
```css
/* Архитектурные линии и сетки */
.architectural-accent {
  position: relative;
}

.architectural-accent::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(
    to bottom,
    hsl(var(--foreground)) 0%,
    hsl(var(--foreground)) 25%,
    transparent 25%,
    transparent 50%,
    hsl(var(--foreground)) 50%,
    hsl(var(--foreground)) 75%,
    transparent 75%
  );
  background-size: 4px 16px;
}

/* Geometric patterns */
.pattern-grid {
  background-image:
    linear-gradient(hsl(var(--foreground) / 0.03) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--foreground) / 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Blueprint style */
.blueprint-style {
  background: hsl(217, 91%, 95%);
  background-image:
    repeating-linear-gradient(
      0deg,
      hsl(217, 91%, 85%) 0px,
      hsl(217, 91%, 85%) 1px,
      transparent 1px,
      transparent 20px
    ),
    repeating-linear-gradient(
      90deg,
      hsl(217, 91%, 85%) 0px,
      hsl(217, 91%, 85%) 1px,
      transparent 1px,
      transparent 20px
    );
}
```

**B. Применение architectural accents**

**BuildingsGrid.tsx** (строка 42-43):
```tsx
// Добавить architectural accent к заголовку секции
<div className="flex items-baseline gap-3 mb-4">
  <div className="w-1 h-8 bg-foreground architectural-accent"></div>
  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
    Architecture Catalog
  </span>
</div>
```

**Файлы для изменения:**
- `src/app/globals.css`
- `src/components/homepage/BuildingsGrid.tsx`
- `src/components/homepage/FeaturedRoutesSection.tsx`

---

## 📝 ЧЕКЛИСТ РЕАЛИЗАЦИИ

### Высокий приоритет (Быстрые победы):
- [ ] Добавить spacing system и применить к секциям
- [ ] Улучшить hover состояния карточек
- [ ] Добавить focus states для accessibility
- [ ] Унифицировать border radius
- [ ] Улучшить skeleton loaders
- [ ] Добавить shadow system

### Средний приоритет:
- [ ] Улучшить типографическую иерархию
- [ ] Добавить staggered animations
- [ ] Улучшить backdrop blur для Header
- [ ] Добавить button system
- [ ] Оптимизировать mobile touch targets
- [ ] Добавить architectural accents

### Низкий приоритет (Полировка):
- [ ] Softened color variants
- [ ] Улучшенная темная тема
- [ ] Архитектурные паттерны
- [ ] Advanced animations
- [ ] Toast notifications
- [ ] Loading states animations

---

## 🎨 PLAN ДЛЯ FRONTEND-DESIGN ПЛАГИНА

После применения базовых улучшений, использовать frontend-design для:

### 1. Hero Section Redesign
- Более драматичный hero с архитектурными мотивами
- Улучшенная типографика с architectural feel
- Subtle animations и parallax

### 2. Featured Buildings Showcase
- Magazine-style layout для избранных зданий
- Asymmetric grid с featured карточкой
- Hover effects с preview images

### 3. Route Discovery Interface
- Interactive route visualization
- Timeline-style presentation
- Animated route drawing

---

## 📊 МЕТРИКИ УСПЕХА

### До улучшений:
- Bounce rate: ?
- Time on page: ?
- Click-through rate: ?
- Mobile usability score: ?

### После улучшений (цели):
- Снижение bounce rate на 15%
- Увеличение time on page на 25%
- Улучшение CTR на 20%
- Mobile usability score > 95

---

## 🔄 ИТЕРАЦИОННЫЙ ПОДХОД

1. **Фаза 1: Foundations** (1-2 дня)
   - Spacing system
   - Shadow system
   - Border radius унификация
   - Focus states

2. **Фаза 2: Visual Polish** (2-3 дня)
   - Hover states
   - Animations
   - Typography improvements
   - Color refinements

3. **Фаза 3: Details** (1-2 дня)
   - Architectural accents
   - Loading states
   - UX improvements
   - Responsive optimizations

4. **Фаза 4: Frontend-Design** (3-5 дней)
   - Hero redesign
   - Featured sections
   - Special pages
   - Final polish

---

**Следующий шаг:** Выбрать приоритетные улучшения и начать применение с использованием frontend-design плагина.
