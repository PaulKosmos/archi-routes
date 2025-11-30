// src/utils/collectionsUtils.ts - Утилиты для работы с коллекциями

export interface Collection {
  id: string
  user_id: string
  name: string
  description?: string
  is_public: boolean
  cover_image?: string
  created_at: string
  updated_at: string
  building_count?: number
  buildings?: CollectionBuilding[]
}

export interface CollectionBuilding {
  building_id: string
  added_at: string
  personal_note?: string
  visit_date?: string
  building?: {
    id: string
    name: string
    architect?: string
    city: string
    image_url?: string
    rating: number
    year_built?: number
  }
}

export interface UserBuildingPhoto {
  id: string
  user_id: string
  building_id: string
  photo_url: string
  caption?: string
  taken_at: string
}

// Генерация публичной ссылки для коллекции
export function generateShareableLink(collectionId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/collections/shared/${collectionId}`
}

// Форматирование даты для коллекций
export function formatCollectionDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7) return `${diffDays} дн. назад`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} нед. назад`
  
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Валидация коллекции
export function validateCollection(collection: Partial<Collection>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!collection.name?.trim()) {
    errors.push('Название коллекции обязательно')
  }

  if (collection.name && collection.name.length > 100) {
    errors.push('Название не должно превышать 100 символов')
  }

  if (collection.description && collection.description.length > 500) {
    errors.push('Описание не должно превышать 500 символов')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Генерация слага для коллекции
export function generateCollectionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[а-я]/g, (char) => {
      const map: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      }
      return map[char] || char
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Подготовка данных для экспорта в PDF
export function prepareCollectionForPDF(collection: Collection) {
  return {
    title: collection.name,
    description: collection.description || '',
    createdAt: formatCollectionDate(collection.created_at),
    buildingCount: collection.building_count || 0,
    buildings: collection.buildings?.map(cb => ({
      name: cb.building?.name || '',
      architect: cb.building?.architect || 'Неизвестен',
      city: cb.building?.city || '',
      year: cb.building?.year_built || null,
      rating: cb.building?.rating || 0,
      image: cb.building?.image_url || '',
      personalNote: cb.personal_note || '',
      visitDate: cb.visit_date ? formatCollectionDate(cb.visit_date) : null,
      addedAt: formatCollectionDate(cb.added_at)
    })) || []
  }
}

// Статистика коллекции
export function getCollectionStats(collection: Collection) {
  const buildings = collection.buildings || []
  
  const cities = new Set(buildings.map(cb => cb.building?.city).filter(Boolean))
  const architects = new Set(buildings.map(cb => cb.building?.architect).filter(Boolean))
  const styles = new Set() // Можно добавить стили позже
  
  const averageRating = buildings.length > 0 
    ? buildings.reduce((sum, cb) => sum + (cb.building?.rating || 0), 0) / buildings.length
    : 0

  const visitedCount = buildings.filter(cb => cb.visit_date).length
  
  const oldestBuilding = buildings
    .filter(cb => cb.building?.year_built)
    .sort((a, b) => (a.building?.year_built || 0) - (b.building?.year_built || 0))[0]
    
  const newestBuilding = buildings
    .filter(cb => cb.building?.year_built)
    .sort((a, b) => (b.building?.year_built || 0) - (a.building?.year_built || 0))[0]

  return {
    totalBuildings: buildings.length,
    citiesCount: cities.size,
    architectsCount: architects.size,
    averageRating: Math.round(averageRating * 10) / 10,
    visitedCount,
    visitedPercentage: buildings.length > 0 ? Math.round((visitedCount / buildings.length) * 100) : 0,
    oldestYear: oldestBuilding?.building?.year_built || null,
    newestYear: newestBuilding?.building?.year_built || null,
    cities: Array.from(cities),
    architects: Array.from(architects)
  }
}

// Сортировка зданий в коллекции
export type CollectionSortOption = 'added' | 'name' | 'year' | 'rating' | 'city' | 'visited'

export function sortCollectionBuildings(
  buildings: CollectionBuilding[], 
  sortBy: CollectionSortOption, 
  ascending: boolean = true
): CollectionBuilding[] {
  const sorted = [...buildings].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortBy) {
      case 'added':
        aVal = new Date(a.added_at).getTime()
        bVal = new Date(b.added_at).getTime()
        break
      case 'name':
        aVal = a.building?.name || ''
        bVal = b.building?.name || ''
        break
      case 'year':
        aVal = a.building?.year_built || 0
        bVal = b.building?.year_built || 0
        break
      case 'rating':
        aVal = a.building?.rating || 0
        bVal = b.building?.rating || 0
        break
      case 'city':
        aVal = a.building?.city || ''
        bVal = b.building?.city || ''
        break
      case 'visited':
        aVal = a.visit_date ? new Date(a.visit_date).getTime() : 0
        bVal = b.visit_date ? new Date(b.visit_date).getTime() : 0
        break
      default:
        return 0
    }

    if (aVal < bVal) return ascending ? -1 : 1
    if (aVal > bVal) return ascending ? 1 : -1
    return 0
  })

  return sorted
}

// Поиск в коллекции
export function searchInCollection(
  buildings: CollectionBuilding[], 
  query: string
): CollectionBuilding[] {
  if (!query.trim()) return buildings

  const normalizedQuery = query.toLowerCase().trim()
  
  return buildings.filter(cb => {
    const building = cb.building
    if (!building) return false

    return (
      building.name?.toLowerCase().includes(normalizedQuery) ||
      building.architect?.toLowerCase().includes(normalizedQuery) ||
      building.city?.toLowerCase().includes(normalizedQuery) ||
      cb.personal_note?.toLowerCase().includes(normalizedQuery)
    )
  })
}

// Получение обложки коллекции (первое фото из зданий если нет кастомной)
export function getCollectionCoverImage(collection: Collection): string | null {
  if (collection.cover_image) {
    return collection.cover_image
  }

  // Берем первое здание с фото
  const buildingWithPhoto = collection.buildings?.find(cb => cb.building?.image_url)
  return buildingWithPhoto?.building?.image_url || null
}

// Экспорт коллекции в JSON
export function exportCollectionToJSON(collection: Collection): string {
  const exportData = {
    name: collection.name,
    description: collection.description,
    created_at: collection.created_at,
    buildings: collection.buildings?.map(cb => ({
      building_name: cb.building?.name,
      architect: cb.building?.architect,
      city: cb.building?.city,
      year_built: cb.building?.year_built,
      rating: cb.building?.rating,
      personal_note: cb.personal_note,
      visit_date: cb.visit_date,
      added_at: cb.added_at
    }))
  }

  return JSON.stringify(exportData, null, 2)
}
