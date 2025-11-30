// src/app/buildings/[id]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Header from '../../../components/Header'
import BuildingDetailClient from './BuildingDetailClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://archi-routes.com'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    hideHeader?: string
  }>
}

// Генерация динамических SEO мета-тегов
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: building } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (!building) {
    return {
      title: 'Здание не найдено',
    }
  }

  const title = building.name
  const description = building.description
    ? building.description.substring(0, 160) + '...'
    : `${building.name} - архитектурное здание в ${building.city || 'городе'}. Архитектор: ${building.architect || 'неизвестен'}.`

  const imageUrl = building.image_url || '/og-image.jpg'
  const buildingUrl = `${baseUrl}/buildings/${building.id}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: buildingUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: building.name,
        }
      ],
      siteName: 'Archi-Routes',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: buildingUrl,
    },
  }
}

export default async function BuildingDetailPage({ params, searchParams }: PageProps) {
  console.log('🏢 [DEBUG] BuildingDetailPage server component called')
  
  const resolvedParams = await params
  console.log('🏢 [DEBUG] Resolved params:', resolvedParams)
  
  // Создаем публичный клиент
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Загружаем данные здания
  console.log('🏢 [DEBUG] Fetching building from server...')
  const { data: building, error } = await supabase
    .from('buildings')
    .select(`
      *,
      profiles!buildings_created_by_fkey (
        id,
        full_name,
        role
      )
    `)
    .eq('id', resolvedParams.id)
    .single()

  console.log('🏢 [DEBUG] Building fetch result:', { building: !!building, error: !!error })

  if (error || !building) {
    console.log('🏢 [ERROR] Building not found or error:', error)
    notFound()
  }
  
  console.log('🏢 [DEBUG] Building found, rendering client component')

  // Загружаем все здания для Header
  console.log('🏢 [DEBUG] Fetching all buildings for header...')
  const { data: allBuildings } = await supabase
    .from('buildings')
    .select('*')
  console.log('🏢 [DEBUG] All buildings fetched:', allBuildings?.length || 0)

  console.log('🏢 [DEBUG] Rendering page with building:', building.name)

  // Проверяем, нужно ли скрыть Header (для модального окна)
  const resolvedSearchParams = await searchParams
  const shouldHideHeader = resolvedSearchParams?.hideHeader === 'true'
  console.log('🏢 [DEBUG] Should hide header:', shouldHideHeader)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {!shouldHideHeader && <Header buildings={allBuildings || []} />}
      <BuildingDetailClient building={building} />
    </div>
  )
}