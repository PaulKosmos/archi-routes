'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus } from 'lucide-react'

interface BuildingData {
  id: string
  name: string
  city: string
  architect?: string
  year_built?: number
  latitude: number
  longitude: number
  image_url?: string
}

// Support both direct and nested formats
interface Building extends BuildingData {
  building?: BuildingData // Legacy nested format
}

interface InteractiveContentProps {
  content: string
  buildings: Building[]
  selectedBuildings: string[]
  selectedBuildingId?: string
  onBuildingSelect?: (buildingId: string) => void
  onAddToRoute?: (building: Building) => void
}

export default function InteractiveContent({
  content,
  buildings,
  selectedBuildings,
  selectedBuildingId,
  onBuildingSelect,
  onAddToRoute
}: InteractiveContentProps) {
  const [processedContent, setProcessedContent] = useState(content)
  const contentRef = useRef<HTMLDivElement>(null)

  // Обрабатываем контент и делаем названия зданий интерактивными
  useEffect(() => {
    console.log('🏢 Processing content with buildings:', buildings.length)
    console.log('📝 Buildings data:', buildings.map(b => {
      const building = b.building || b
      return { id: building.id, name: building.name }
    }))
    
    if (!buildings || buildings.length === 0) {
      setProcessedContent(content)
      return
    }

    let processed = content
    console.log('📝 Original content length:', content.length)
    console.log('📄 Content preview:', content.substring(0, 500))
    
    // ИСПРАВЛЕНИЕ: Извлекаем чистый текст из HTML для поиска
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    console.log('🔤 Plain text preview:', plainText.substring(0, 500))

    // Для каждого здания ищем упоминания в тексте
    buildings.forEach(buildingData => {
      const building = buildingData.building || buildingData
      if (!building || !building.name) return

      const buildingName = building.name
      const isSelected = selectedBuildingId === building.id
      const isInRoute = selectedBuildings.includes(building.id)
      
      console.log(`🔍 Searching for '${buildingName}' in plain text...`)
      
      // Создаем более гибкий поиск для русского языка с падежами
      let regex: RegExp
      
      // Простая эвристика для русских падежей
      if (buildingName.match(/[а-яё]/i)) {
        // Для русских названий создаем паттерн с возможными окончаниями
        const baseName = buildingName
          .replace(/ые?$/i, '') // "Бранденбургские" -> "Бранденбургск"
          .replace(/ая$/i, '')   // "Берлинская" -> "Берлинск"
          .replace(/ий$/i, '')   // "Берлинский" -> "Берлинск"
          .replace(/[аяыеёою]$/i, '') // убираем последнюю гласную
        
        // Паттерн для поиска с разными окончаниями
        const endings = '(?:а|у|ом|е|ы|ой|ую|ая|ые|их|ого|ему|ими|ах|ём)?'
        const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        regex = new RegExp(`\\b${escapedBase}\\w*${endings}\\b`, 'gi')
        
        console.log(`📝 Using flexible pattern for Russian: ${escapedBase}\\w*${endings}`)
      } else {
        // Для не-русских названий используем точный поиск
        const escapedName = buildingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        regex = new RegExp(`\\b${escapedName}\\b`, 'gi')
        
        console.log(`📝 Using exact pattern: ${escapedName}`)
      }
      
      // ИСПРАВЛЕНИЕ: Ищем совпадения в ЧИСТОМ тексте
      const matches = plainText.match(regex)
      console.log(`🎯 Found ${matches ? matches.length : 0} matches for '${buildingName}' in plain text`)
      
      if (matches && matches.length > 0) {
        // Теперь заменяем найденные совпадения в HTML
        matches.forEach(match => {
          console.log(`🔄 Replacing '${match}' in HTML...`)
          
          // Экранируем найденное совпадение для безопасной замены в HTML
          const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const htmlRegex = new RegExp(`\\b${escapedMatch}\\b`, 'gi')
          
          const classes = [
            'building-mention',
            'cursor-pointer',
            'relative',
            'transition-all',
            'duration-200',
            'border-b-2',
            'hover:bg-blue-50',
            'group'
          ]

          // Добавляем классы в зависимости от состояния
          if (isSelected) {
            classes.push('border-red-500', 'bg-red-50', 'text-red-700', 'font-semibold')
          } else if (isInRoute) {
            classes.push('border-green-500', 'bg-green-50', 'text-green-700', 'font-semibold')
          } else {
            classes.push('border-blue-300', 'hover:border-blue-500', 'text-blue-600')
          }

          const replacement = `<span class="${classes.join(' ')}" data-building-id="${building.id}" data-building-name="${building.name}" title="Кликните чтобы выделить на карте">${match}<span class="building-mention-actions opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1">${!isInRoute ? `<button class="building-add-btn inline-flex items-center justify-center w-4 h-4 bg-green-500 text-white rounded-full text-xs hover:bg-green-600 transition-colors" data-building-id="${building.id}" title="Добавить в маршрут"><svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"></path></svg></button>` : `<span class="inline-flex items-center justify-center w-4 h-4 bg-green-500 text-white rounded-full text-xs">✓</span>`}</span></span>`
          
          processed = processed.replace(htmlRegex, replacement)
        })
      }
    })

    setProcessedContent(processed)
    console.log('✅ Content processed, new length:', processed.length)
  }, [content, buildings, selectedBuildings, selectedBuildingId])

  // Добавляем обработчики событий после рендера
  useEffect(() => {
    if (!contentRef.current) return

    const handleBuildingClick = (e: Event) => {
      const target = e.target as HTMLElement
      const buildingMention = target.closest('.building-mention')
      
      if (buildingMention) {
        e.preventDefault()
        const buildingId = buildingMention.getAttribute('data-building-id')
        console.log('🎯 Building mention clicked:', buildingId)
        if (buildingId && onBuildingSelect) {
          onBuildingSelect(buildingId)
        }
      }
    }

    const handleAddButtonClick = (e: Event) => {
      const target = e.target as HTMLElement
      const addButton = target.closest('.building-add-btn')
      
      if (addButton) {
        e.preventDefault()
        e.stopPropagation()
        
        const buildingId = addButton.getAttribute('data-building-id')
        console.log('➕ Add button clicked for building:', buildingId)
        
        const building = buildings.find(b => {
          const bData = b.building || b
          return bData.id === buildingId
        })
        
        if (building && onAddToRoute) {
          const buildingData = building.building || building
          onAddToRoute(buildingData)
        }
      }
    }

    const element = contentRef.current
    element.addEventListener('click', handleBuildingClick)
    element.addEventListener('click', handleAddButtonClick)

    return () => {
      element.removeEventListener('click', handleBuildingClick)
      element.removeEventListener('click', handleAddButtonClick)
    }
  }, [buildings, onBuildingSelect, onAddToRoute])

  return (
    <div 
      ref={contentRef}
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}