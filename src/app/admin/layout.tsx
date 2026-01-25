'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  Shield,
  Users,
  Home,
  Newspaper,
  LayoutDashboard,
  Bot,
  Podcast,
  BarChart3
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || !['admin', 'moderator'].includes(profile?.role || ''))) {
      router.push('/')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!user || !['admin', 'moderator'].includes(profile?.role || '')) {
    return null
  }

  const navigationGroups = [
    {
      title: null,
      items: [
        {
          name: 'To Site',
          href: '/',
          icon: Home
        },
        {
          name: 'Dashboard',
          href: '/admin',
          icon: LayoutDashboard
        }
      ]
    },
    {
      title: 'Management',
      items: [
        {
          name: 'Analytics',
          href: '/admin/analytics',
          icon: BarChart3
        },
        {
          name: 'Moderation',
          href: '/admin/moderation',
          icon: Shield
        },
        {
          name: 'Users',
          href: '/admin/users',
          icon: Users
        }
      ]
    },
    {
      title: 'Content',
      items: [
        {
          name: 'News',
          href: '/admin/news',
          icon: Newspaper
        },
        {
          name: 'Podcasts',
          href: '/admin/podcasts',
          icon: Podcast
        },
        {
          name: 'Auto-generation',
          href: '/admin/autogeneration',
          icon: Bot
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-card border-r border-border min-h-screen sticky top-0 flex flex-col">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-[var(--radius)] bg-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold text-foreground">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">System Management</p>
              </div>
            </div>

            <nav className="space-y-6">
              {navigationGroups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.title && (
                    <div className="px-3 mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.title}
                      </h3>
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius)] transition-colors ${isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-accent'
                            }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* User info */}
          <div className="mt-auto p-6 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border/50">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {profile?.display_name || profile?.full_name || 'Admin'}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {profile?.role === 'admin' ? 'Administrator' : 'Moderator'}
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
