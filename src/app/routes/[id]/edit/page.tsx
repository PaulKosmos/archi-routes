// src/app/routes/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Header from '../../../../components/Header'
import EditPageWrapper from '../../../../components/EditPageWrapper'
import RouteEditClient from './RouteEditClient'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function RouteEditPage({ params }: PageProps) {
  const resolvedParams = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    return notFound()
  }

  // Создаем публичный клиент для получения данных
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Загружаем базовые данные маршрута
  const { data: route, error } = await supabase
    .from('routes')
    .select(`
      *,
      profiles!routes_created_by_fkey (
        id,
        full_name,
        role
      ),
      route_points (
        id,
        route_id,
        building_id,
        order_index,
        title,
        description,
        audio_url,
        audio_duration_seconds,
        latitude,
        longitude,
        instructions,
        estimated_time_minutes,
        point_type,
        buildings (
          id,
          name,
          description,
          architect,
          year_built,
          architectural_style,
          address,
          city,
          country,
          image_url,
          building_type
        )
      )
    `)
    .eq('id', resolvedParams.id)
    .single()

  if (error || !route) {
    console.error('Route not found:', error)
    notFound()
  }

  // Сортируем точки по порядку
  if (route.route_points) {
    route.route_points.sort((a: any, b: any) => a.order_index - b.order_index)
  }

  // Загружаем все здания для карты
  const { data: allBuildings } = await supabase
    .from('buildings')
    .select('*')

  return (
    <EditPageWrapper contentType="route" contentId={resolvedParams.id}>
      <Header buildings={[]} />
      <RouteEditClient 
        route={route}
        buildings={allBuildings || []}
      />
    </EditPageWrapper>
  )
}