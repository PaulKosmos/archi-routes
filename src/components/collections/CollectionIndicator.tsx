'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

interface CollectionIndicatorProps {
  buildingId: string
  className?: string
}

interface CollectionInfo {
  id: string
  name: string
}

export default function CollectionIndicator({ buildingId, className = '' }: CollectionIndicatorProps) {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth()
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && buildingId) {
      fetchBuildingCollections()
    }
  }, [user, buildingId])

  const fetchBuildingCollections = async () => {
    if (!user) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('collection_buildings')
        .select(`
          collection_id,
          collections:collection_id (
            id,
            name
          )
        `)
        .eq('building_id', buildingId)
        .eq('collections.user_id', user.id)

      if (error) throw error

      const collectionsList = data
        ?.map(item => item.collections)
        .filter(Boolean) as CollectionInfo[]

      setCollections(collectionsList || [])
    } catch (error) {
      console.error('Error fetching building collections:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user || loading || collections.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <BookOpen className="w-4 h-4" />
      <span>In Collections:</span>
      <div className="flex items-center gap-1">
        {collections.slice(0, 2).map((collection, index) => (
          <span key={collection.id}>
            <Link
              href={`/collections/${collection.id}`}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              {collection.name}
            </Link>
            {index < collections.slice(0, 2).length - 1 && ', '}
          </span>
        ))}
        {collections.length > 2 && (
          <span className="text-gray-500">
            и еще {collections.length - 2}
          </span>
        )}
      </div>
    </div>
  )
}

// Экспорт для использования в других компонентах
export { CollectionIndicator }