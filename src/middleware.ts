import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // === ЗАЩИТА ВСЕГО САЙТА ПАРОЛЕМ ===
  const sitePasswordEnabled = process.env.NEXT_PUBLIC_SITE_PASSWORD_ENABLED === 'true'

  if (sitePasswordEnabled) {
    // Разрешаем доступ к странице ввода пароля и статическим ресурсам
    const allowedPaths = [
      '/site-password',
      '/api/site-password',
      '/_next/',
      '/favicon.ico'
    ]

    const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path))

    if (!isAllowedPath) {
      // Проверяем cookie с паролем
      const authCookie = request.cookies.get('site-auth')
      const correctPasswordHash = process.env.SITE_PASSWORD_HASH

      if (authCookie?.value !== correctPasswordHash) {
        // Редирект на страницу ввода пароля
        const url = request.nextUrl.clone()
        url.pathname = '/site-password'
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  // === ЗАЩИТА АДМИН-МАРШРУТОВ ===
  const protectedRoutes = ['/admin', '/settings', '/profile/edit']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: (name, value, options) => {
            response.cookies.set(name, value, options)
          },
          remove: (name, options) => {
            response.cookies.delete(name)
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

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

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/settings/:path*',
    '/profile/edit/:path*'
  ]
}
