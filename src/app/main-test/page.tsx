import { Suspense } from 'react'
import MainTestPage from './MainTestPage'

export const metadata = {
  title: 'Archi-Routes - Откройте архитектуру через маршруты',
  description: 'Создавайте архитектурные маршруты, исследуйте здания, делитесь впечатлениями. Платформа для любителей архитектуры.',
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    }>
      <MainTestPage />
    </Suspense>
  )
}
