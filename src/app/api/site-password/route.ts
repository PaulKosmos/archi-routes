import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      )
    }

    // Хешируем введённый пароль
    const passwordHash = createHash('sha256').update(password).digest('hex')

    // Сравниваем с хешем из env
    const correctPasswordHash = process.env.SITE_PASSWORD_HASH

    if (passwordHash === correctPasswordHash) {
      // Пароль верный - устанавливаем cookie
      const response = NextResponse.json({ success: true })

      response.cookies.set('site-auth', passwordHash, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
        path: '/',
      })

      return response
    }

    // Неверный пароль
    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Site password check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
