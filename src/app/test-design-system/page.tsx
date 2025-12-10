'use client'

/**
 * DESIGN SYSTEM TEST PAGE
 * Тестовая страница для проверки дизайн-системы ArchiRoutes
 * После миграции из Design (Lovable)
 */

import { useState } from 'react'

export default function TestDesignSystemPage() {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors duration-300`}>
      {/* Header with theme toggle */}
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-card/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary bevel-edge flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">A</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Design System Test</h1>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              {isDark ? '☀️ Light' : '🌙 Dark'} Mode
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 space-y-12">
        {/* Typography Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Typography</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Font: Sora (default sans)</p>
              <h1 className="text-4xl font-bold">Heading 1 - Sora Bold</h1>
              <h2 className="text-3xl font-semibold">Heading 2 - Sora Semibold</h2>
              <h3 className="text-2xl font-medium">Heading 3 - Sora Medium</h3>
              <p className="text-base">Body text - Sora Regular - Откройте архитектуру города</p>
              <p className="text-sm text-muted-foreground">Small muted text - Подзаголовок</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Font: Outfit (display)</p>
              <h1 className="text-4xl font-bold font-display">ArchiRoutes Display</h1>
            </div>
          </div>
        </section>

        {/* Color Palette Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Color Palette</h2>

          {/* Primary Colors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 bg-background border-2 border-border rounded-lg"></div>
              <p className="text-sm font-medium">Background</p>
              <code className="text-xs text-muted-foreground">bg-background</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-foreground rounded-lg"></div>
              <p className="text-sm font-medium">Foreground</p>
              <code className="text-xs text-muted-foreground">bg-foreground</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                Primary
              </div>
              <p className="text-sm font-medium">Primary (Coral)</p>
              <code className="text-xs text-muted-foreground">bg-primary</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-secondary rounded-lg flex items-center justify-center text-secondary-foreground font-bold">
                Secondary
              </div>
              <p className="text-sm font-medium">Secondary (Dark)</p>
              <code className="text-xs text-muted-foreground">bg-secondary</code>
            </div>
          </div>

          {/* Accent Colors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 bg-accent rounded-lg flex items-center justify-center text-accent-foreground font-bold">
                Accent
              </div>
              <p className="text-sm font-medium">Accent (Yellow)</p>
              <code className="text-xs text-muted-foreground">bg-accent</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-muted rounded-lg flex items-center justify-center text-muted-foreground font-bold">
                Muted
              </div>
              <p className="text-sm font-medium">Muted</p>
              <code className="text-xs text-muted-foreground">bg-muted</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-destructive rounded-lg flex items-center justify-center text-destructive-foreground font-bold">
                Destructive
              </div>
              <p className="text-sm font-medium">Destructive</p>
              <code className="text-xs text-muted-foreground">bg-destructive</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-[hsl(var(--news-primary))] rounded-lg flex items-center justify-center text-white font-bold">
                News
              </div>
              <p className="text-sm font-medium">News Primary (Blue)</p>
              <code className="text-xs text-muted-foreground">news-primary</code>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Cards & Components</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-40 bg-gradient-to-br from-primary to-destructive"></div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">Модернизм в архитектуре</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  История модернизма: от Баухауса до современности
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>👁 842</span>
                  <span>💬 12</span>
                </div>
              </div>
            </div>

            {/* Bevel Card */}
            <div className="bevel-card bg-card p-6 hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 bg-primary bevel-edge flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
                AR
              </div>
              <h3 className="text-xl font-bold mb-2">Bevel Edge Card</h3>
              <p className="text-muted-foreground text-sm">
                Карточка с закруглёнными углами и тенью
              </p>
            </div>

            {/* News Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gradient-to-br from-[hsl(var(--news-primary))] to-blue-700"></div>
              <div className="p-6">
                <div className="inline-block bg-[hsl(var(--news-primary))] text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  НОВОСТИ
                </div>
                <h3 className="text-xl font-bold mb-2">Новая концепция устойчивого строительства</h3>
                <p className="text-muted-foreground text-sm">
                  Революционная концепция от берлинских архитекторов
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Buttons</h2>

          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
              Primary Button
            </button>
            <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
              Secondary Button
            </button>
            <button className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium">
              Accent Button
            </button>
            <button className="px-6 py-3 bg-[hsl(var(--news-primary))] text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
              News Button
            </button>
            <button className="px-6 py-3 border-2 border-border bg-background text-foreground rounded-lg hover:bg-muted transition-colors font-medium">
              Outline Button
            </button>
          </div>
        </section>

        {/* Utilities Section */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Utilities</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-24 bg-primary bevel-edge flex items-center justify-center text-primary-foreground font-bold">
                Bevel Edge
              </div>
              <code className="text-xs text-muted-foreground">bevel-edge</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-primary geometric-circle flex items-center justify-center text-primary-foreground font-bold">
                Circle
              </div>
              <code className="text-xs text-muted-foreground">geometric-circle</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bg-primary geometric-square flex items-center justify-center text-primary-foreground font-bold">
                Square
              </div>
              <code className="text-xs text-muted-foreground">geometric-square</code>
            </div>
            <div className="space-y-2">
              <div className="h-24 bevel-card bg-card flex items-center justify-center font-bold">
                Bevel Card
              </div>
              <code className="text-xs text-muted-foreground">bevel-card</code>
            </div>
          </div>
        </section>

        {/* Border & Spacing */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold border-b-2 border-border pb-4">Borders & Spacing</h2>

          <div className="space-y-4">
            <div className="p-6 border border-border rounded-lg">
              <p>Border with default color (border-border)</p>
            </div>
            <div className="p-6 border-2 border-border rounded-lg">
              <p>Border-2 with default color</p>
            </div>
            <div className="p-6 border-2 border-primary rounded-lg">
              <p>Border-2 with primary color</p>
            </div>
            <div className="p-6 bg-card rounded-lg">
              <p>Card background with rounded corners</p>
            </div>
          </div>
        </section>

        {/* Status Indicator */}
        <section className="bg-card border-2 border-primary rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-primary geometric-circle flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Дизайн-система активна!</h3>
          <p className="text-muted-foreground">
            Все цвета, шрифты и компоненты работают корректно.
            <br />
            Переключите тему выше, чтобы проверить темный режим.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[hsl(222,47%,11%)] text-[hsl(210,40%,96%)] mt-16 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">
            ArchiRoutes Design System Test Page
          </p>
          <p className="text-xs text-[hsl(215,20%,65%)] mt-2">
            Migrated from Lovable Design • Tailwind CSS v4
          </p>
        </div>
      </footer>
    </div>
  )
}
