'use client'

import { useState, useEffect, useRef } from 'react'

interface BlogContentProps {
  content: any
  buildings?: any[]
  selectedBuildings?: string[]
  selectedBuildingId?: string
  onBuildingSelect?: (buildingId: string) => void
  onAddToRoute?: (building: any) => void
}

export default function BlogContent({ 
  content, 
  buildings = [],
  selectedBuildings = [],
  selectedBuildingId,
  onBuildingSelect,
  onAddToRoute
}: BlogContentProps) {
  const [processedContent, setProcessedContent] = useState<string>('')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (content) {
      const html = convertContentToHTML(content)
      setProcessedContent(html)
    }
  }, [content, buildings])

  // После рендера обрабатываем упоминания зданий
  useEffect(() => {
    if (contentRef.current && buildings.length > 0) {
      processInteractiveMentions()
    }
  }, [processedContent, buildings, selectedBuildings, selectedBuildingId])

  const convertContentToHTML = (content: any): string => {
    if (!content || !content.content) return ''
    
    console.log('📋 Processing content for buildings:', buildings.length)
    
    return content.content.map((node: any) => {
      switch (node.type) {
        case 'paragraph':
          const text = node.content?.map((textNode: any) => {
            if (textNode.type === 'text') {
              let html = textNode.text
              
              // Пропускаем автоматический поиск - теперь используем building-link теги
              
              if (textNode.marks) {
                textNode.marks.forEach((mark: any) => {
                  switch (mark.type) {
                    case 'bold':
                      html = `<strong>${html}</strong>`
                      break
                    case 'italic':
                      html = `<em>${html}</em>`
                      break
                    case 'underline':
                      html = `<u>${html}</u>`
                      break
                    case 'link':
                      html = `<a href="${mark.attrs.href}" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">${html}</a>`
                      break
                  }
                })
              }
              return html
            }
            return ''
          }).join('') || ''
          
          return `<p class="mb-4 leading-relaxed text-gray-800">${text}</p>`
        
        case 'heading':
          const level = node.attrs?.level || 1
          const headingText = node.content?.[0]?.text || ''
          const headingClass = level === 1 
            ? 'text-3xl font-bold mb-6 mt-8' 
            : level === 2 
            ? 'text-2xl font-bold mb-4 mt-6' 
            : 'text-xl font-semibold mb-3 mt-5'
          return `<h${level} class="${headingClass} text-gray-900">${headingText}</h${level}>`
        
        case 'bulletList':
          const listItems = node.content?.map((item: any) => {
            const itemText = item.content?.[0]?.content?.[0]?.text || ''
            return `<li class="mb-2">${itemText}</li>`
          }).join('') || ''
          return `<ul class="list-disc pl-6 mb-6 space-y-1 text-gray-800">${listItems}</ul>`
        
        case 'orderedList':
          const orderedItems = node.content?.map((item: any) => {
            const itemText = item.content?.[0]?.content?.[0]?.text || ''
            return `<li class="mb-2">${itemText}</li>`
          }).join('') || ''
          return `<ol class="list-decimal pl-6 mb-6 space-y-1 text-gray-800">${orderedItems}</ol>`
        
        case 'blockquote':
          const quoteText = node.content?.map((item: any) => {
            if (item.type === 'paragraph') {
              return item.content?.[0]?.text || ''
            }
            return item.text || ''
          }).join(' ') || ''
          return `<blockquote class="border-l-4 border-blue-500 pl-6 py-2 italic text-gray-700 bg-gray-50 rounded-r-lg mb-6">"${quoteText}"</blockquote>`
        
        case 'codeBlock':
          const codeText = node.content?.[0]?.text || ''
          return `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto mb-6"><code class="text-sm">${codeText}</code></pre>`
        
        case 'image':
          const src = node.attrs?.src || ''
          const alt = node.attrs?.alt || 'Изображение'
          return `<img src="${src}" alt="${alt}" class="w-full h-auto rounded-lg shadow-sm mb-6" />`
        
        default:
          return ''
      }
    }).join('')
  }

  // Функция для обработки building-link тегов после рендера
  const processInteractiveMentions = () => {
    if (!contentRef.current) return

    // Ищем building-link теги в контенте
    const buildingLinks = contentRef.current.querySelectorAll('building-link')
    
    buildingLinks.forEach((buildingLink) => {
      const buildingId = buildingLink.getAttribute('data-building-id')
      const buildingName = buildingLink.getAttribute('data-building-name') || buildingLink.textContent || ''
      
      if (!buildingId) return

      // Находим здание по ID
      const buildingData = buildings.find(b => {
        const building = b.building || b
        return building?.id === buildingId
      })
      
      let building = null
      if (buildingData) {
        building = buildingData.building || buildingData
      } else {
        // Если здание не найдено в связанных зданиях,
        // создаем минимальный объект для отображения
        building = {
          id: buildingId,
          name: buildingName,
          city: 'Неизвестно',
          country: 'Неизвестно'
        }
        console.log('⚠️ Building not found in related buildings, using minimal data:', building)
      }
      
      // Определяем CSS классы для выделения
      const isSelected = selectedBuildingId === building.id
      const isInRoute = selectedBuildings.includes(building.id)
      
      let className = 'building-link cursor-pointer px-2 py-1 rounded transition-colors border-b inline-block '
      
      if (isSelected) {
        className += 'bg-red-100 text-red-800 border-red-300'
      } else if (isInRoute) {
        className += 'bg-green-100 text-green-800 border-green-300'
      } else {
        className += 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
      }
      
      // Создаем новый span элемент
      const span = document.createElement('span')
      span.className = className
      span.textContent = buildingName
      span.setAttribute('data-building-id', buildingId)
      span.setAttribute('data-building-name', buildingName)
      
      // Добавляем обработчики событий
      span.addEventListener('click', () => {
        if (onBuildingSelect) {
          onBuildingSelect(building.id)
        }
      })
      
      span.addEventListener('mouseenter', (e) => {
        showBuildingCard(e.target as HTMLElement, building)
      })
      
      span.addEventListener('mouseleave', (e) => {
        // Задержка перед скрытием карточки
        setTimeout(() => {
          // Проверяем, не наведена ли мышь на карточку
          const cards = document.querySelectorAll('.building-hover-card-popup')
          let isHoveringCard = false
          
          cards.forEach(card => {
            if (card.matches(':hover')) {
              isHoveringCard = true
            }
          })
          
          if (!isHoveringCard) {
            hideBuildingCard()
          }
        }, 100)
      })
      
      // Заменяем building-link на новый элемент
      buildingLink.parentNode?.replaceChild(span, buildingLink)
      
      console.log('✅ Processed building-link:', buildingName, 'ID:', buildingId)
    })
  }

  // ИСПРАВЛЕННАЯ функция для показа карточки здания
  const showBuildingCard = (element: HTMLElement, building: any) => {
    // Удаляем существующие карточки
    hideBuildingCard()
    
    const rect = element.getBoundingClientRect()
    
    // Вычисляем позицию относительно viewport
    const cardWidth = 320
    const cardHeight = 350
    
    // Позиция X - центрируем относительно элемента
    let x = rect.left + (rect.width / 2) - (cardWidth / 2)
    
    // Проверяем boundaries экрана по X
    if (x < 10) {
      x = 10
    } else if (x + cardWidth > window.innerWidth - 10) {
      x = window.innerWidth - cardWidth - 10
    }
    
    // Позиция Y - показываем снизу от элемента
    let y = rect.bottom + 10
    
    // Если не помещается снизу, показываем сверху
    if (y + cardHeight > window.innerHeight - 20) {
      y = rect.top - cardHeight - 10
      // Если и сверху не помещается, показываем на уровне элемента
      if (y < 10) {
        y = Math.max(10, rect.top)
      }
    }
    
    // Создаем карточку с fixed позиционированием относительно viewport
    const card = document.createElement('div')
    card.className = 'building-hover-card-popup'
    card.innerHTML = `
      <div class="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-5 w-[calc(100vw-2rem)] sm:w-96 max-w-md" style="
        left: ${x}px;
        top: ${y}px;
      ">
        <div class="relative h-40 bg-gray-200 rounded-lg overflow-hidden mb-4">
          ${building.image_url 
            ? `<img src="${building.image_url}" alt="${building.name}" class="w-full h-full object-cover" />` 
            : `<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>`
          }
          ${building.architectural_style 
            ? `<div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">${building.architectural_style}</div>` 
            : ''
          }
          ${building.year_built 
            ? `<div class="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">${building.year_built}</div>` 
            : ''
          }
        </div>
        
        <div class="space-y-3">
          <div>
            <h4 class="font-bold text-gray-900 text-lg mb-1 leading-tight">${building.name}</h4>
            <div class="flex items-center text-sm text-gray-600 mb-2">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span class="font-medium">${building.city}${building.country ? `, ${building.country}` : ''}</span>
            </div>
          </div>
          
          ${building.architect 
            ? `<div class="text-sm">
                 <span class="text-gray-500">Архитектор:</span>
                 <span class="font-medium text-gray-900 ml-2">${building.architect}</span>
               </div>` 
            : ''
          }
          
          ${building.rating 
            ? `<div class="flex items-center text-sm">
                 <svg class="w-4 h-4 text-yellow-400 fill-current mr-1" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                 <span class="font-medium text-gray-900">${building.rating.toFixed(1)}</span>
                 <span class="text-gray-500 ml-1">из 5 (рейтинг)</span>
               </div>` 
            : ''
          }
          
          ${building.description 
            ? `<div class="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                 <p class="line-clamp-3">${building.description}</p>
               </div>` 
            : '<div class="text-sm text-gray-500 italic">Описание отсутствует</div>'
          }
        </div>
        
        <div class="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <button class="add-to-route-btn flex items-center space-x-2 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium" title="Добавить в маршрут">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"></path></svg>
            <span>В маршрут</span>
          </button>
          
          <a href="/buildings/${building.id}" class="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors" target="_blank">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            <span>Подробнее</span>
          </a>
        </div>
      </div>
    `
    
    // Добавляем обработчик для кнопки "Добавить в маршрут"
    const addBtn = card.querySelector('.add-to-route-btn')
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (onAddToRoute) {
          onAddToRoute(building)
        }
        hideBuildingCard()
      })
    }
    
    // Добавляем обработчики на саму карточку
    const cardElement = card.querySelector('div')
    if (cardElement) {
      cardElement.addEventListener('mouseenter', () => {
        // Карточка должна оставаться видимой
      })
      
      cardElement.addEventListener('mouseleave', () => {
        // Скрываем карточку при уходе мыши
        setTimeout(() => {
          hideBuildingCard()
        }, 50)
      })
    }
    
    document.body.appendChild(card)
  }

  // Функция для скрытия карточки здания
  const hideBuildingCard = () => {
    const existingCards = document.querySelectorAll('.building-hover-card-popup')
    existingCards.forEach(card => {
      if (document.body.contains(card)) {
        document.body.removeChild(card)
      }
    })
  }

  // Простой рендер контента
  const renderContent = () => {
    return (
      <div 
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: processedContent }} 
      />
    )
  }

  return (
    <div className="prose prose-lg max-w-none">
      {/* DEBUG: Показываем информацию о зданиях для отладки */}
      {process.env.NODE_ENV === 'development' && buildings.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            🔧 Debug: Найдено зданий для обработки: {buildings.length}
          </h4>
          <div className="text-xs text-yellow-700 space-y-1">
            {buildings.map((buildingData, index) => {
              const building = buildingData.building || buildingData
              return (
                <div key={index} className="border-b border-yellow-200 pb-1">
                  <strong>{index + 1}. {building?.name || 'Имя не найдено'}</strong><br/>
                  ID: {building?.id || 'ID не найден'}<br/>
                  Город: {building?.city || 'Нет данных'}<br/>
                  Архитектор: {building?.architect || 'Нет данных'}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Основной контент с обработанными упоминаниями зданий */}
      <div className="text-gray-800 leading-relaxed">
        {renderContent()}
      </div>
    </div>
  )
}