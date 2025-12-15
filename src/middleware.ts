import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Создаем response объект
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Создаем Supabase клиент с правильной конфигурацией для Next.js 15
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // ВАЖНО: Обновляем сессию для всех запросов
  // Это предотвращает зависание в production
  const { data: { session } } = await supabase.auth.getSession()

  // Защищенные маршруты
  const protectedRoutes = ['/admin', '/settings', '/profile/edit']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Если нет сессии - редирект на страницу авторизации
    if (!session) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Проверка прав для админ-панели
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        // Пользователь не администратор - редирект на главную
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/settings/:path*',
    '/profile/edit/:path*'
  ]
}
