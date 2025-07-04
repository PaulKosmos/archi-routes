// src/app/routes/[id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Header from '../../../components/Header'
import RouteDetailClient from './RouteDetailClient'

interface PageProps {
  params: {
    id: string
  }
}

export default async function RouteDetailPage({ params }: PageProps) {
  console.log('🛤️ Loading route with ID:', params.id)

  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  try {
    // Загружаем конкретный маршрут
    const { data: routeData, error } = await supabase
      .from('routes')
      .select(`
        id,
        title,
        description,
        city,
        country,
        created_by,
        route_type,
        difficulty_level,
        estimated_duration_minutes,
        distance_km,
        points_count,
        thumbnail_url,
        is_published,
        is_premium,
        price_credits,
        language,
        tags,
        rating,
        review_count,
        completion_count,
        created_at,
        updated_at,
        profiles!routes_created_by_fkey (
          id,
          username,
          full_name,
          role,
          email,
          avatar_url
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
      .eq('id', params.id)
      .single()

    console.log('🛤️ Route query result:', { success: !!routeData, error: error?.message })

    if (error) {
      console.error('❌ Error loading route:', error)
      
      // Показываем доступные маршруты при ошибке
      const { data: allRoutes } = await supabase
        .from('routes')
        .select('id, title, is_published')
        .eq('is_published', true)
      
      return (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-red-600">Маршрут не найден</h1>
            <p className="text-lg text-gray-600 mb-4">Искомый ID: {params.id}</p>
            
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-6">
              <h3 className="font-bold mb-4">Доступные маршруты:</h3>
              {allRoutes && allRoutes.length > 0 ? (
                <ul className="space-y-2">
                  {allRoutes.map((r: any) => (
                    <li key={r.id} className="flex justify-between items-center p-3 bg-white rounded border">
                      <span>{r.title}</span>
                      <a 
                        href={`/routes/${r.id}`}
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Открыть
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">Опубликованных маршрутов нет</p>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <h3 className="font-bold mb-2">Ошибка:</h3>
              <p className="text-red-800 text-sm">{error.message}</p>
            </div>

            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              ← Назад к главной
            </a>
          </div>
        </div>
      )
    }

    if (!routeData) {
      notFound()
    }

    // Обрабатываем данные без строгой типизации
    const processedRoute = {
      ...routeData,
      profiles: Array.isArray(routeData.profiles) 
        ? routeData.profiles[0] || null 
        : routeData.profiles,
      route_points: (routeData.route_points || []).map((point: any) => ({
        ...point,
        buildings: Array.isArray(point.buildings) 
          ? point.buildings[0] || null 
          : point.buildings
      }))
    }

    // Сортируем точки по порядку
    if (processedRoute.route_points) {
      processedRoute.route_points.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    // Загружаем все здания для Header
    const { data: allBuildings } = await supabase
      .from('buildings')
      .select('*')

    console.log('✅ Route loaded successfully:', processedRoute.title)

    return (
      <div className="min-h-screen bg-gray-50">
        <Header buildings={allBuildings || []} />
        <RouteDetailClient route={processedRoute} />
      </div>
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-red-600">Техническая ошибка</h1>
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <pre className="text-sm text-red-800 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
          </div>
          <div className="mt-6">
            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              ← Назад к главной
            </a>
          </div>
        </div>
      </div>
    )
  }
}