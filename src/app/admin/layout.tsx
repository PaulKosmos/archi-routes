'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  Shield, 
  Users, 
  FileText, 
  Settings,
  Home,
  Building2,
  Newspaper
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || !['admin', 'moderator'].includes(profile?.role || ''))) {
      router.push('/')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return null
  }

  const navigation = [
    {
      name: 'Главная',
      href: '/',
      icon: Home,
      external: true
    },
    {
      name: 'Пользователи',
      href: '/admin/users',
      icon: Users,
      current: false
    },
    {
      name: 'Новости',
      href: '/admin/news',
      icon: Newspaper,
      current: false
    },
    {
      name: 'Модерация',
      href: '/admin/moderation',
      icon: Shield,
      current: false
    },
    {
      name: 'Автогенерация',
      href: '/admin/autogeneration',
      icon: FileText,
      current: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
            </div>
            
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* User info */}
          <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {profile?.display_name || profile?.full_name || 'Админ'}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {profile?.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
