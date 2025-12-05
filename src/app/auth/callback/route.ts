import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * OAuth Callback Route
 * Обрабатывает callback от OAuth провайдеров (Google, GitHub, Apple)
 *
 * @see LAUNCH_READINESS_REPORT.md раздел 1.7
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectedFrom = requestUrl.searchParams.get('redirectedFrom') || '/'

  if (code) {
    try {
      const cookieStore = await cookies()

      // Создаем правильный server client для OAuth с @supabase/ssr
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (error) {
                // Игнорируем ошибки set cookies в server component
              }
            },
          },
        }
      )

      // Обмениваем код на сессию
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`)
      }

      if (data.session) {
        // Проверяем, есть ли у пользователя профиль
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.session.user.id)
          .single()

        // Если профиля нет, создаем его (для новых пользователей через OAuth)
        if (!profile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata.full_name || data.session.user.user_metadata.name,
              avatar_url: data.session.user.user_metadata.avatar_url || data.session.user.user_metadata.picture,
              username: data.session.user.email?.split('@')[0], // Временное имя пользователя
              role: 'user'
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
          }
        }

        // Успешная авторизация - редирект на запрошенную страницу или профиль
        return NextResponse.redirect(`${origin}${redirectedFrom}`)
      }
    } catch (error) {
      console.error('Unexpected error in OAuth callback:', error)
      return NextResponse.redirect(`${origin}/auth?error=unexpected_error`)
    }
  }

  // Если нет кода, редирект на главную
  return NextResponse.redirect(`${origin}/`)
}
