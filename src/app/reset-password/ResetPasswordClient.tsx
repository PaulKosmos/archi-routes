'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Header from '@/components/Header'
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

export default function ResetPasswordClient() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Проверяем, есть ли в URL параметры для сброса пароля
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          setIsValidSession(false)
        } else if (session) {
          setIsValidSession(true)
        } else {
          // Проверяем hash в URL для токенов от Supabase
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            setIsValidSession(true)
          } else {
            setIsValidSession(false)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setIsValidSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast.error('Заполните все поля')
      return
    }

    if (password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast.success('Пароль успешно изменен!')

      // Перенаправляем на главную страницу через 2 секунды
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error('Ошибка при изменении пароля')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-md mx-auto pt-16 px-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Проверка ссылки для сброса пароля...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={[]} />
        <div className="max-w-md mx-auto pt-16 px-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Недействительная ссылка
            </h1>
            <p className="text-gray-600 mb-6">
              Ссылка для сброса пароля недействительна или истекла.
              Запросите новую ссылку.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={[]} />

      <div className="max-w-md mx-auto pt-16 px-4">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Создать новый пароль
            </h1>
            <p className="text-gray-600">
              Введите новый пароль для вашего аккаунта
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Новый пароль */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Минимум 6 символов
              </p>
            </div>

            {/* Подтверждение пароля */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подтвердите пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {/* Индикатор совпадения паролей */}
              {confirmPassword && (
                <div className="flex items-center mt-2">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-600">Пароли совпадают</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-600">Пароли не совпадают</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Кнопка отправки */}
            <button
              type="submit"
              disabled={loading || password !== confirmPassword}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Обновление пароля...
                </>
              ) : (
                'Обновить пароль'
              )}
            </button>
          </form>

          {/* Дополнительная информация */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Совет:</strong> Используйте комбинацию букв, цифр и специальных символов для создания надежного пароля.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
