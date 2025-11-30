// src/utils/fix-image-urls.ts - Утилита для исправления URL изображений

import { createClient } from '@/lib/supabase'

export interface ImageUrlReport {
  building_id: string
  building_name: string
  old_image_url?: string
  old_image_urls?: string[]
  status: 'success' | 'error' | 'no_changes'
  message: string
}

/**
 * Исправляет поломанные URL изображений в базе данных
 * Заменяет полные Supabase URLs на относительные пути
 */
export async function fixImageUrls(): Promise<ImageUrlReport[]> {
  const supabase = createClient()
  console.log('🔧 Starting image URL fix process...')
  
  try {
    // Получаем все здания с изображениями
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, image_url, image_urls')
      .or('image_url.not.is.null,image_urls.not.is.null')

    if (error) {
      throw new Error(`Failed to fetch buildings: ${error.message}`)
    }

    const reports: ImageUrlReport[] = []
    
    for (const building of buildings || []) {
      try {
        let hasChanges = false
        let newImageUrl = building.image_url
        let newImageUrls = building.image_urls

        // Исправляем главное изображение
        if (building.image_url && building.image_url.includes('supabase.co/storage/v1/object/public/')) {
          // Извлекаем путь после /public/
          const match = building.image_url.match(/\/public\/(.+)$/)
          if (match) {
            newImageUrl = match[1] // Только путь без домена
            hasChanges = true
            console.log('🖼️ Fixed main image URL:', {
              old: building.image_url,
              new: newImageUrl
            })
          }
        }

        // Исправляем изображения галереи
        if (building.image_urls && Array.isArray(building.image_urls)) {
          const fixedUrls = building.image_urls.map(url => {
            if (url && url.includes('supabase.co/storage/v1/object/public/')) {
              const match = url.match(/\/public\/(.+)$/)
              if (match) {
                hasChanges = true
                console.log('🖼️ Fixed gallery image URL:', {
                  old: url,
                  new: match[1]
                })
                return match[1]
              }
            }
            return url
          })
          
          if (hasChanges) {
            newImageUrls = fixedUrls
          }
        }

        if (hasChanges) {
          // Обновляем запись в базе данных
          const { error: updateError } = await supabase
            .from('buildings')
            .update({
              image_url: newImageUrl,
              image_urls: newImageUrls,
              updated_at: new Date().toISOString()
            })
            .eq('id', building.id)

          if (updateError) {
            throw new Error(`Failed to update building ${building.id}: ${updateError.message}`)
          }

          reports.push({
            building_id: building.id,
            building_name: building.name,
            old_image_url: building.image_url,
            old_image_urls: building.image_urls,
            status: 'success',
            message: `Updated URLs for ${building.name}`
          })

          console.log(`✅ Updated building: ${building.name}`)
        } else {
          reports.push({
            building_id: building.id,
            building_name: building.name,
            status: 'no_changes',
            message: `No URL changes needed for ${building.name}`
          })
        }

      } catch (buildingError) {
        console.error(`❌ Error processing building ${building.id}:`, buildingError)
        reports.push({
          building_id: building.id,
          building_name: building.name,
          status: 'error',
          message: `Error: ${buildingError instanceof Error ? buildingError.message : 'Unknown error'}`
        })
      }
    }

    console.log('🔧 Image URL fix process completed')
    return reports

  } catch (error) {
    console.error('❌ Fatal error in fixImageUrls:', error)
    throw error
  }
}

/**
 * Проверяет состояние URL изображений без изменений
 */
export async function checkImageUrls(): Promise<{
  total: number
  with_issues: number
  buildings_with_issues: Array<{
    id: string
    name: string
    image_url?: string
    image_urls?: string[]
    issues: string[]
  }>
}> {
  const supabase = createClient()
  console.log('🔍 Checking image URLs...')
  
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('id, name, image_url, image_urls')
    .or('image_url.not.is.null,image_urls.not.is.null')

  if (error) {
    throw new Error(`Failed to fetch buildings: ${error.message}`)
  }

  const buildingsWithIssues = []
  
  for (const building of buildings || []) {
    const issues = []
    
    // Проверяем главное изображение
    if (building.image_url && building.image_url.includes('supabase.co/storage/v1/object/public/')) {
      issues.push('Main image has full Supabase URL')
    }
    
    // Проверяем галерею
    if (building.image_urls && Array.isArray(building.image_urls)) {
      const hasFullUrls = building.image_urls.some(url => 
        url && url.includes('supabase.co/storage/v1/object/public/')
      )
      if (hasFullUrls) {
        issues.push('Gallery images have full Supabase URLs')
      }
    }
    
    if (issues.length > 0) {
      buildingsWithIssues.push({
        id: building.id,
        name: building.name,
        image_url: building.image_url,
        image_urls: building.image_urls,
        issues
      })
    }
  }
  
  return {
    total: buildings?.length || 0,
    with_issues: buildingsWithIssues.length,
    buildings_with_issues: buildingsWithIssues
  }
}
