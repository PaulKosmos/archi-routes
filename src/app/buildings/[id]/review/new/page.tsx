// src/app/buildings/[id]/review/new/page.tsx - Страница создания обзора
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Header from '../../../../../components/Header'
import CreateReviewClient from './CreateReviewClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CreateReviewPage({ params }: PageProps) {
  const resolvedParams = await params
  
  // Создаем публичный клиент
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Загружаем данные здания
  const { data: building, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', resolvedParams.id)
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
      <CreateReviewClient building={building} />
    </div>
  )
}
