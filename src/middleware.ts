import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// CORS Configuration
const allowedOrigins = [
  'https://archiroutes.com',
  'https://www.archiroutes.com',
  // Add your Vercel preview URLs pattern if needed
  // 'https://*.vercel.app',
]

// Allow localhost in development
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000')
  allowedOrigins.push('http://127.0.0.1:3000')
}

function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
  }

  // Check if origin is allowed
  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // ========================================
  // Site Access Protection (Coming Soon Mode)
  // ========================================
  const siteAccessEnabled = process.env.SITE_ACCESS_ENABLED === 'true'

  if (siteAccessEnabled) {
    // Paths that should be accessible without password
    const publicPaths = [
      '/coming-soon',
      '/api/site-access',
      '/_next',
      '/favicon.ico',
      '/ar-logo.svg',
      '/ar-logo.png',
    ]

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
    const hasAccess = request.cookies.get('site_access_granted')?.value === 'true'

    if (!isPublicPath && !hasAccess) {
      return NextResponse.redirect(new URL('/coming-soon', request.url))
    }
  }
  // ========================================

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  // Защищенные маршруты
  const protectedRoutes = ['/admin', '/settings', '/profile/edit']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    const response = NextResponse.next()

    // Add CORS headers to protected routes
    const corsHeaders = getCorsHeaders(origin)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

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
              response.cookies.set(name, value, options)
            })
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

  // Add CORS headers to non-protected routes (API routes)
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    const corsHeaders = getCorsHeaders(origin)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}
