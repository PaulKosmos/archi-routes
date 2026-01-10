'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Github } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Enter email')
      return
    }

    if (mode !== 'reset' && !password) {
      toast.error('Enter password')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        // Регистрация
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0]
            }
          }
        })

        if (error) throw error

        if (data.user?.email_confirmed_at) {
          toast.success('Account created! You are signed in')
          onClose()
        } else {
          toast.success('Check your email to confirm registration')
          onClose()
        }
      } else if (mode === 'signin') {
        // Вход
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        toast.success('Welcome!')
        onClose()
      } else if (mode === 'reset') {
        // Сброс пароля
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })

        if (error) throw error

        toast.success('Password reset link sent to email')
        setMode('signin')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      
      // Error messages
      let errorMessage = 'An error occurred'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'User already registered'
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Password must contain at least 6 characters'
      } else if (error.message.includes('Unable to validate email address')) {
        errorMessage = 'Invalid email format'
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setShowPassword(false)
  }

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode)
    resetForm()
  }

  /**
   * Google OAuth авторизация
   * @see LAUNCH_READINESS_REPORT.md раздел 1.7.1
   */
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('Google OAuth error:', error)
        toast.error('Google sign in error. Try again.')
      }
      // Пользователь будет перенаправлен на страницу Google
      // После успешной авторизации вернется через callback
    } catch (error) {
      console.error('Unexpected Google OAuth error:', error)
      toast.error('Unexpected error. Try again later.')
    }
  }

  /**
   * GitHub OAuth авторизация
   * @see LAUNCH_READINESS_REPORT.md раздел 1.7.2
   */
  const handleGitHubSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('GitHub OAuth error:', error)
        toast.error('GitHub sign in error. Try again.')
      }
      // Пользователь будет перенаправлен на страницу GitHub
      // После успешной авторизации вернется через callback
    } catch (error) {
      console.error('Unexpected GitHub OAuth error:', error)
      toast.error('Unexpected error. Try again later.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* OAuth кнопки */}
        {mode !== 'reset' && (
          <div className="space-y-3 mb-4">
            {/* Кнопка Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Кнопка GitHub */}
            <button
              type="button"
              onClick={handleGitHubSignIn}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Github className="w-5 h-5 mr-3 text-gray-900" />
              Continue with GitHub
            </button>
          </div>
        )}

        {/* Разделитель */}
        {mode !== 'reset' && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Полное имя (только для регистрации) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full name (optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Пароль (не показываем для сброса) */}
          {mode !== 'reset' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
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
            {mode === 'signup' && (
              <p className="text-sm text-gray-500 mt-1">
                Minimum 6 characters
              </p>
            )}
          </div>
          )}

          {/* Кнопка отправки */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {mode === 'signin' && 'Signing in...'}
                {mode === 'signup' && 'Creating account...'}
                {mode === 'reset' && 'Sending...'}
              </>
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'reset' && 'Send Link'}
              </>
            )}
          </button>
        </form>

        {/* Забыли пароль (только для входа) */}
        {mode === 'signin' && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Переключение режима */}
        <div className="mt-6 text-center">
          {mode === 'signin' && (
            <p className="text-gray-600">
              No account?
              {' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign Up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-gray-600">
              Already have an account?
              {' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <p className="text-gray-600">
              Remembered password?
              {' '}
              <button
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Демо аккаунт и дополнительная информация */}
        {mode === 'signin' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Demo access:</strong><br/>
              Email: demo@example.com<br/>
              Password: demo123
            </p>
          </div>
        )}

        {mode === 'reset' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                We will send a password reset link to the specified email. Check your spam folder if the email doesn't arrive.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
