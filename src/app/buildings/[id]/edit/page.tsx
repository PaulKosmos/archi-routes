// src/app/buildings/[id]/edit/page.tsx - Building edit page
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import EditBuildingClient from './EditBuildingClient'
import EditPageWrapper from '@/components/EditPageWrapper'
import Header from '@/components/Header'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditBuildingPage({ params }: PageProps) {
  const resolvedParams = await params
  const buildingId = resolvedParams.id

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials')
    return notFound()
  }

  // Create public client to fetch data
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Load building with creator information
  const { data: building, error } = await supabase
    .from('buildings')
    .select(`
      *,
      profiles:created_by (
        id,
        role,
        email,
        full_name
      )
    `)
    .eq('id', buildingId)
    .single()

  if (error || !building) {
    console.error('Building not found:', error)
    notFound()
  }

  console.log('🏢 Building loaded for editing:', {
    id: building.id,
    name: building.name
  })

  return (
    <EditPageWrapper contentType="building" contentId={buildingId}>
      <Header buildings={[]} />
      <EditBuildingClient building={building} />
    </EditPageWrapper>
  )
}
