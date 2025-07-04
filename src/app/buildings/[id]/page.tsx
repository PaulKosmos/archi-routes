// src/app/buildings/[id]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Header from '../../../components/Header'
import BuildingDetailClient from './BuildingDetailClient'

interface PageProps {
  params: {
    id: string
  }
}

export default async function BuildingDetailPage({ params }: PageProps) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Загружаем данные здания
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
    .eq('id', params.id)
    .single()

  if (error || !building) {
    notFound()
  }

  // Загружаем все здания для Header
  const { data: allBuildings } = await supabase
    .from('buildings')
    .select('*')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header buildings={allBuildings || []} />
      <BuildingDetailClient building={building} />
    </div>
  )
}